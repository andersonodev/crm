from __future__ import annotations

import logging
from dataclasses import dataclass
from email.utils import parseaddr
from typing import Any

import google.generativeai as genai
from django.conf import settings
from django.db import transaction
from groq import Groq
from jinja2 import BaseLoader, Environment, StrictUndefined
from pydantic import BaseModel, Field, ValidationError
from weasyprint import HTML

from core.models import Client, Deal, DocumentTemplate

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    'Você é um Analista de CRM de Turismo. Analise o e-mail e extraia JSON estrito:\n'
    '{\n'
    '"intent": "SALES" | "SUPPORT" | "INTERNAL" | "SPAM",\n'
    '"product_category": "Transfer" | "Hospedagem" | "Passeio" | "Aéreo" | "Outros",\n'
    '"product_detail": "Resumo do que ele quer (ex: Transfer Rio-Búzios)",\n'
    '"urgency": "HIGH" | "MEDIUM" | "LOW",\n'
    '"summary": "Título curto para o Kanban (Max 5 palavras)",\n'
    '"pax": Int,\n'
    '"dates": {"arrival": "YYYY-MM-DD", "departure": "YYYY-MM-DD"}\n'
    '}\n'
    'Se for assunto administrativo (notas, sistemas, reuniões), marque intent como INTERNAL.'
)


class AIResult(BaseModel):
    intent: str = Field(pattern=r"^(SALES|SUPPORT|INTERNAL|SPAM)$")
    product_category: str = Field(pattern=r"^(Transfer|Hospedagem|Passeio|Aéreo|Outros)$")
    product_detail: str
    urgency: str = Field(pattern=r"^(HIGH|MEDIUM|LOW)$")
    summary: str
    pax: int = Field(ge=0)
    dates: dict[str, str | None] = Field(default_factory=dict)


class AIService:
    def __init__(self, *, gemini_key: str, groq_key: str) -> None:
        self.gemini_key = gemini_key
        self.groq_key = groq_key

    def analyze_email(self, text: str) -> AIResult:
        last_error: Exception | None = None

        for _ in range(2):
            try:
                return self._gemini(text)
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                logger.exception("Gemini attempt failed")

        for _ in range(2):
            try:
                return self._groq(text)
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                logger.exception("Groq attempt failed")

        logger.critical("All AI providers failed. Falling back to Manual Review", exc_info=last_error)
        return AIResult(
            intent="SUPPORT",
            product_category="Outros",
            product_detail="Manual Review",
            urgency="LOW",
            summary="Revisão Manual",
            pax=0,
            dates={"arrival": None, "departure": None},
        )

    def _gemini(self, text: str) -> AIResult:
        genai.configure(api_key=self.gemini_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            f"{SYSTEM_PROMPT}\n\nEmail:\n{text}",
            generation_config={"response_mime_type": "application/json", "temperature": 0.1},
        )
        return AIResult.model_validate_json(response.text)

    def _groq(self, text: str) -> AIResult:
        client = Groq(api_key=self.groq_key)
        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        content = response.choices[0].message.content if response.choices else "{}"
        return AIResult.model_validate_json(content)


class PDFService:
    @staticmethod
    def generate_from_deal(*, deal_id: str, template_id: str, tenant_id: str) -> bytes:
        deal = Deal.objects.select_related("client").get(id=deal_id, tenant_id=tenant_id)
        template = DocumentTemplate.objects.get(id=template_id, tenant_id=tenant_id)

        context = {
            "deal": deal,
            "contact": deal.client,
            "service_items": list(deal.service_items.all()),
            "ai": deal.ai_metadata,
        }
        html = Environment(loader=BaseLoader(), undefined=StrictUndefined, autoescape=True).from_string(
            template.html_body
        ).render(**context)
        return HTML(string=html, base_url=getattr(settings, "BASE_DIR", None)).write_pdf()


@dataclass
class IngestPayload:
    tenant_id: str
    sender: str
    subject: str
    body: str
    message_id: str | None = None
    in_reply_to: str | None = None
    thread_id: str | None = None


def _extract_email(raw_sender: str) -> str:
    _, addr = parseaddr(raw_sender)
    return (addr or raw_sender).strip().lower()


def _promote_priority(priority: str) -> str:
    order = [Deal.Priority.LOW, Deal.Priority.NORMAL, Deal.Priority.HIGH, Deal.Priority.CRITICAL]
    idx = min(order.index(priority) + 1, len(order) - 1)
    return order[idx]


@transaction.atomic
def process_incoming_email(payload: IngestPayload) -> Deal | None:
    sender = _extract_email(payload.sender)
    company_domain = getattr(settings, "COMPANY_DOMAIN", "").lower().strip("@")

    if company_domain and sender.endswith(f"@{company_domain}"):
        client, _ = Client.objects.get_or_create(
            tenant_id=payload.tenant_id,
            email=sender,
            defaults={"name": sender.split("@")[0], "lifecycle_stage": Client.LifecycleStage.ACTIVE},
        )
        return Deal.objects.create(
            tenant_id=payload.tenant_id,
            client=client,
            title=payload.subject[:255] or "Mensagem Interna",
            board=Deal.Board.INTERNAL_OPS,
            stage=Deal.Stage.NEW,
            priority=Deal.Priority.NORMAL,
            email_thread_id=payload.thread_id or "",
            ai_metadata={"filter": "internal_domain"},
        )

    if payload.in_reply_to and payload.thread_id:
        existing = Deal.objects.filter(tenant_id=payload.tenant_id, email_thread_id=payload.thread_id).first()
        if existing:
            metadata = dict(existing.ai_metadata)
            metadata.setdefault("replies", []).append({"sender": sender, "body": payload.body})
            existing.ai_metadata = metadata
            existing.save(update_fields=["ai_metadata", "updated_at"])
            return existing

    ai = AIService(gemini_key=settings.GEMINI_API_KEY, groq_key=settings.GROQ_API_KEY)
    try:
        analysis = ai.analyze_email(f"From: {sender}\nSubject: {payload.subject}\n\n{payload.body}")
    except ValidationError:
        analysis = AIResult(
            intent="SUPPORT",
            product_category="Outros",
            product_detail="Manual Review",
            urgency="LOW",
            summary="Revisão Manual",
            pax=0,
            dates={"arrival": None, "departure": None},
        )

    if analysis.intent == "SPAM":
        return None

    if analysis.intent == "INTERNAL":
        client, _ = Client.objects.get_or_create(
            tenant_id=payload.tenant_id,
            email=sender,
            defaults={"name": sender.split("@")[0]},
        )
        return Deal.objects.create(
            tenant_id=payload.tenant_id,
            client=client,
            title=analysis.summary[:255],
            board=Deal.Board.INTERNAL_OPS,
            stage=Deal.Stage.NEW,
            priority=Deal.Priority.NORMAL,
            email_thread_id=payload.thread_id or "",
            ai_metadata=analysis.model_dump(),
        )

    client, created = Client.objects.get_or_create(
        tenant_id=payload.tenant_id,
        email=sender,
        defaults={"name": sender.split("@")[0], "lifecycle_stage": Client.LifecycleStage.LEAD},
    )

    board = Deal.Board.SALES
    priority = Deal.Priority.NORMAL
    tags: list[str] = []

    if created:
        board = Deal.Board.COMMERCIAL
        tags.append("NOVO_CLIENTE")
    elif client.is_top_10:
        board = Deal.Board.TOP10
        priority = Deal.Priority.CRITICAL
        tags.append("VIP")

    purchased_categories = {str(item).lower() for item in (client.purchase_history or [])}
    if analysis.product_category.lower() not in purchased_categories:
        tags.append("PRODUTO_NOVO")
        priority = _promote_priority(priority)

    if analysis.urgency == "HIGH":
        priority = _promote_priority(priority)

    return Deal.objects.create(
        tenant_id=payload.tenant_id,
        client=client,
        title=analysis.summary[:255],
        board=board,
        stage=Deal.Stage.NEW,
        priority=priority,
        tags=tags,
        email_thread_id=payload.thread_id or "",
        ai_metadata=analysis.model_dump(),
    )
