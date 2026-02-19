from __future__ import annotations

from typing import Any

import base64
import logging
import smtplib
from decimal import Decimal
from uuid import UUID

from django.contrib.auth import authenticate
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.db.models import F, Sum
from django.http import HttpRequest, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import File, Form, Router, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile
from ninja.security import APIKeyHeader, HttpBearer

from core.models import (
    APIKey,
    CampaignLog,
    Client,
    Deal,
    DocumentTemplate,
    MarketingCampaign,
    Product,
    ServiceItem,
    TenantConfig,
    User,
    UserSMTP,
)
from core.services import IngestPayload, PDFService, process_incoming_email
from core.tasks import send_campaign_task
from core.services.analytics import AnalyticsFilters, AnalyticsService, parse_date

logger = logging.getLogger(__name__)
router = Router(tags=["crm"])

PIXEL_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFhQJ/lO6l2QAAAABJRU5ErkJggg=="
)


class TenantAPIKeyAuth(APIKeyHeader):
    param_name = "X-API-KEY"

    def authenticate(self, request: HttpRequest, key: str | None):
        if not key:
            return None
        prefix = key[:12]
        for api_key in APIKey.objects.filter(prefix=prefix, is_active=True):
            if api_key.is_valid(key):
                api_key.last_used_at = timezone.now()
                api_key.save(update_fields=["last_used_at", "updated_at"])
                return {"tenant_id": api_key.tenant_id}
        return None


auth = TenantAPIKeyAuth()

SIGNER = TimestampSigner(salt="crm-auth")


class BearerAuth(HttpBearer):
    def authenticate(self, request: HttpRequest, token: str | None) -> dict[str, Any] | None:
        if not token:
            return None
        try:
            raw = SIGNER.unsign(token, max_age=60 * 60 * 24 * 7)
            user_id = str(raw)
            user = User.objects.filter(id=user_id, is_active=True).first()
            if not user:
                return None
            return {"user": user}
        except (BadSignature, SignatureExpired):
            return None


auth_bearer = BearerAuth()


class LoginIn(Schema):
    username: str
    password: str


class AuthUserOut(Schema):
    id: UUID
    name: str
    avatar: str | None = None
    tenant_id: UUID


class LoginOut(Schema):
    token: str
    user: AuthUserOut


@router.post("/auth/login", response=LoginOut)
def auth_login(request: HttpRequest, payload: LoginIn):
    user = authenticate(request, username=payload.username, password=payload.password)
    if user is None:
        raise HttpError(401, "Credenciais inválidas")
    token = SIGNER.sign(str(user.id))
    return LoginOut(
        token=token,
        user=AuthUserOut(
            id=user.id,
            name=user.full_name or user.email,
            avatar=None,
            tenant_id=user.tenant_id,
        ),
    )


@router.get("/auth/me", auth=auth_bearer, response=AuthUserOut)
def auth_me(request: HttpRequest):
    user = request.auth["user"]
    return AuthUserOut(
        id=user.id,
        name=user.full_name or user.email,
        avatar=None,
        tenant_id=user.tenant_id,
    )


class IngestEmailIn(Schema):
    sender: str
    subject: str = ""
    body: str
    message_id: str | None = None
    in_reply_to: str | None = None
    thread_id: str | None = None


class IngestEmailOut(Schema):
    status: str
    deal_id: UUID | None = None


@router.post("/ingest/email", auth=auth, response=IngestEmailOut)
def ingest_email(request: HttpRequest, payload: IngestEmailIn):
    deal = process_incoming_email(
        IngestPayload(
            tenant_id=str(request.auth["tenant_id"]),
            sender=payload.sender,
            subject=payload.subject,
            body=payload.body,
            message_id=payload.message_id,
            in_reply_to=payload.in_reply_to,
            thread_id=payload.thread_id,
        )
    )
    if deal is None:
        return IngestEmailOut(status="ignored_spam", deal_id=None)
    return IngestEmailOut(status="processed", deal_id=deal.id)


class ClientOut(Schema):
    id: UUID
    name: str
    email: str
    lifecycle_stage: str
    is_top_10: bool


@router.get("/clients", auth=auth, response=list[ClientOut])
def list_clients(request: HttpRequest):
    tenant_id = request.auth["tenant_id"]
    return list(Client.objects.filter(tenant_id=tenant_id).values("id", "name", "email", "lifecycle_stage", "is_top_10"))


class ClientCreateIn(Schema):
    name: str
    email: str
    phone: str = ""


@router.post("/clients", auth=auth, response=ClientOut)
def create_client(request: HttpRequest, payload: ClientCreateIn):
    tenant_id = request.auth["tenant_id"]
    client = Client.objects.create(
        tenant_id=tenant_id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
    )
    return client


class Top10In(Schema):
    is_top_10: bool


@router.patch("/clients/{client_id}/top10", auth=auth, response=ClientOut)
def toggle_top10(request: HttpRequest, client_id: UUID, payload: Top10In):
    client = get_object_or_404(Client, id=client_id, tenant_id=request.auth["tenant_id"])
    client.is_top_10 = payload.is_top_10
    if payload.is_top_10:
        client.lifecycle_stage = Client.LifecycleStage.VIP
    client.save(update_fields=["is_top_10", "lifecycle_stage", "updated_at"])
    return client


class ProductIn(Schema):
    name: str
    category: str
    keywords: list[str] = []


class ProductOut(Schema):
    id: UUID
    name: str
    category: str
    keywords: list[str]


@router.get("/products", auth=auth, response=list[ProductOut])
def list_products(request: HttpRequest):
    return list(Product.objects.filter(tenant_id=request.auth["tenant_id"]).values("id", "name", "category", "keywords"))


@router.post("/products", auth=auth, response=ProductOut)
def create_product(request: HttpRequest, payload: ProductIn):
    product = Product.objects.create(
        tenant_id=request.auth["tenant_id"],
        name=payload.name,
        category=payload.category,
        keywords=payload.keywords,
    )
    return product


class KanbanDealOut(Schema):
    id: UUID
    title: str
    board: str
    stage: str
    priority: str
    tags: list[str]
    email_thread_id: str


@router.get("/boards/{board}/deals", auth=auth, response=list[KanbanDealOut])
def list_board_deals(request: HttpRequest, board: str):
    return list(
        Deal.objects.filter(tenant_id=request.auth["tenant_id"], board=board).values(
            "id", "title", "board", "stage", "priority", "tags", "email_thread_id"
        )
    )


class MoveDealIn(Schema):
    stage: str


@router.patch("/deals/{deal_id}", auth=auth, response=KanbanDealOut)
def move_deal(request: HttpRequest, deal_id: UUID, payload: MoveDealIn):
    deal = get_object_or_404(Deal, id=deal_id, tenant_id=request.auth["tenant_id"])
    deal.stage = payload.stage
    deal.save(update_fields=["stage", "updated_at"])
    return deal


class ServiceItemIn(Schema):
    description: str
    quantity: int = 1
    cost_price: Decimal
    sale_price: Decimal


class ServiceItemOut(Schema):
    id: UUID
    description: str
    quantity: int
    cost_price: Decimal
    sale_price: Decimal
    profit: Decimal


class DealDetailOut(Schema):
    id: UUID
    title: str
    total_cost: Decimal
    total_revenue: Decimal
    gross_profit: Decimal
    margin_percent: Decimal
    service_items: list[ServiceItemOut]


@router.get("/deals/{deal_id}/details", auth=auth, response=DealDetailOut)
def deal_details(request: HttpRequest, deal_id: UUID):
    deal = get_object_or_404(Deal.objects.prefetch_related("service_items"), id=deal_id, tenant_id=request.auth["tenant_id"])
    aggregates = deal.service_items.aggregate(
        total_cost=Sum(F("cost_price") * F("quantity")),
        total_revenue=Sum(F("sale_price") * F("quantity")),
    )
    total_cost = aggregates["total_cost"] or Decimal("0")
    total_revenue = aggregates["total_revenue"] or Decimal("0")
    gross_profit = total_revenue - total_cost
    margin_percent = Decimal("0") if total_revenue <= 0 else (gross_profit / total_revenue) * Decimal("100")

    return DealDetailOut(
        id=deal.id,
        title=deal.title,
        total_cost=total_cost,
        total_revenue=total_revenue,
        gross_profit=gross_profit,
        margin_percent=margin_percent.quantize(Decimal("0.01")),
        service_items=[
            ServiceItemOut(
                id=item.id,
                description=item.description,
                quantity=item.quantity,
                cost_price=item.cost_price,
                sale_price=item.sale_price,
                profit=item.profit,
            )
            for item in deal.service_items.all()
        ],
    )


@router.post("/deals/{deal_id}/service-items", auth=auth, response=ServiceItemOut)
def create_service_item(request: HttpRequest, deal_id: UUID, payload: ServiceItemIn):
    deal = get_object_or_404(Deal, id=deal_id, tenant_id=request.auth["tenant_id"])
    item = ServiceItem.objects.create(
        tenant_id=request.auth["tenant_id"],
        deal=deal,
        description=payload.description,
        quantity=payload.quantity,
        cost_price=payload.cost_price,
        sale_price=payload.sale_price,
    )
    return ServiceItemOut.model_validate({
        "id": item.id,
        "description": item.description,
        "quantity": item.quantity,
        "cost_price": item.cost_price,
        "sale_price": item.sale_price,
        "profit": item.profit,
    })


class SMTPIn(Schema):
    host: str
    port: int
    username: str
    password: str
    use_tls: bool = True
    use_ssl: bool = False


@router.post("/profile/test-connection", auth=auth)
def test_smtp_connection(request: HttpRequest, payload: SMTPIn):
    try:
        with smtplib.SMTP_SSL(payload.host, payload.port, timeout=10) if payload.use_ssl else smtplib.SMTP(
            payload.host, payload.port, timeout=10
        ) as smtp:
            if payload.use_tls and not payload.use_ssl:
                smtp.starttls()
            smtp.login(payload.username, payload.password)
        return {"ok": True, "message": "Conexão SMTP validada"}
    except Exception as exc:  # noqa: BLE001
        logger.exception("SMTP validation failed")
        raise HttpError(400, f"Falha na conexão SMTP: {exc}") from exc


@router.post("/profile/smtp", auth=auth)
def save_smtp_profile(request: HttpRequest, payload: SMTPIn):
    tenant_id = request.auth["tenant_id"]
    user = get_object_or_404(User, id=request.user.id) if getattr(request, "user", None) and request.user.is_authenticated else None
    if user is None:
        raise HttpError(401, "User auth required")
    smtp_cfg, _ = UserSMTP.objects.get_or_create(
        tenant_id=tenant_id,
        user=user,
        defaults={"host": payload.host, "port": payload.port, "username": payload.username},
    )
    smtp_cfg.host = payload.host
    smtp_cfg.port = payload.port
    smtp_cfg.username = payload.username
    smtp_cfg.use_tls = payload.use_tls
    smtp_cfg.use_ssl = payload.use_ssl
    smtp_cfg.set_password(payload.password)
    smtp_cfg.save()
    return {"ok": True}


class CampaignIn(Schema):
    subject: str
    html_content: str
    target_filters: dict = {}
    scheduled_at: str | None = None


class CampaignOut(Schema):
    id: UUID
    subject: str
    status: str


@router.get("/marketing/campaigns", auth=auth, response=list[CampaignOut])
def list_campaigns(request: HttpRequest):
    return list(
        MarketingCampaign.objects.filter(tenant_id=request.auth["tenant_id"]).values("id", "subject", "status").order_by("-created_at")
    )


@router.post("/marketing/campaigns", auth=auth, response=CampaignOut)
def create_campaign(request: HttpRequest, payload: CampaignIn):
    campaign = MarketingCampaign.objects.create(
        tenant_id=request.auth["tenant_id"],
        subject=payload.subject,
        html_content=payload.html_content,
        target_filters=payload.target_filters,
        status=MarketingCampaign.Status.DRAFT,
    )
    return campaign


@router.post("/marketing/campaigns/{campaign_id}/send", auth=auth)
def send_campaign(request: HttpRequest, campaign_id: UUID):
    campaign = get_object_or_404(MarketingCampaign, id=campaign_id, tenant_id=request.auth["tenant_id"])
    campaign.status = MarketingCampaign.Status.SCHEDULED
    campaign.save(update_fields=["status", "updated_at"])
    task = send_campaign_task.delay(str(campaign.id))
    return {"queued": True, "task_id": task.id}


@router.get("/marketing/track/{campaign_id}/{contact_id}.png", auth=None)
def track_pixel(request: HttpRequest, campaign_id: UUID, contact_id: UUID):
    log = CampaignLog.objects.filter(campaign_id=campaign_id, contact_id=contact_id).first()
    if log:
        log.opened = True
        log.opened_at = timezone.now()
        log.save(update_fields=["opened", "opened_at", "updated_at"])
    return HttpResponse(PIXEL_PNG, content_type="image/png")


class DocumentTemplateOut(Schema):
    id: UUID
    name: str


@router.get("/documents/templates", auth=auth, response=list[DocumentTemplateOut])
def list_document_templates(request: HttpRequest):
    return list(
        DocumentTemplate.objects.filter(
            tenant_id=request.auth["tenant_id"], type=DocumentTemplate.TemplateType.VOUCHER
        ).values("id", "name")
    )


class GenerateDocumentIn(Schema):
    deal_id: UUID
    template_id: UUID


@router.post("/documents/generate", auth=auth)
def generate_document(request: HttpRequest, payload: GenerateDocumentIn):
    pdf = PDFService.generate_from_deal(
        deal_id=str(payload.deal_id),
        template_id=str(payload.template_id),
        tenant_id=str(request.auth["tenant_id"]),
    )
    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="voucher-{payload.deal_id}.pdf"'
    return response


class TenantConfigOut(Schema):
    primary_color: str
    sidebar_color: str
    logo_url: str | None = None


@router.get("/tenant/config", auth=auth, response=TenantConfigOut)
def tenant_config(request: HttpRequest):
    cfg, _ = TenantConfig.objects.get_or_create(tenant_id=request.auth["tenant_id"])
    return TenantConfigOut(
        primary_color=cfg.primary_color,
        sidebar_color=cfg.sidebar_color,
        logo_url=cfg.logo_file.url if cfg.logo_file else None,
    )


@router.patch("/tenant/config", auth=auth, response=TenantConfigOut)
def update_tenant_config(
    request: HttpRequest,
    primary_color: str = Form(...),
    sidebar_color: str = Form(...),
    logo_file: UploadedFile | None = File(None),
):
    cfg, _ = TenantConfig.objects.get_or_create(tenant_id=request.auth["tenant_id"])
    cfg.primary_color = primary_color
    cfg.sidebar_color = sidebar_color
    if logo_file is not None:
        cfg.logo_file.save(logo_file.name, logo_file)
    cfg.save()
    return TenantConfigOut(
        primary_color=cfg.primary_color,
        sidebar_color=cfg.sidebar_color,
        logo_url=cfg.logo_file.url if cfg.logo_file else None,
    )


class AnalyticsPointOut(Schema):
    stage: str | None = None
    count: int | None = None
    value: Decimal | None = None
    date: str | None = None
    revenue: Decimal | None = None
    profit: Decimal | None = None


class KPIsOut(Schema):
    total_revenue: Decimal
    conversion_rate: float
    total_deals: int
    avg_ticket: Decimal


class TopProductOut(Schema):
    name: str
    sold_count: int
    revenue: Decimal


def _analytics_service(request: HttpRequest, start_date: str | None, end_date: str | None) -> AnalyticsService:
    return AnalyticsService(
        AnalyticsFilters(
            tenant_id=str(request.auth["tenant_id"]),
            start_date=parse_date(start_date),
            end_date=parse_date(end_date),
        )
    )


@router.get("/analytics/funnel", auth=auth)
def analytics_funnel(request: HttpRequest, start_date: str | None = None, end_date: str | None = None):
    svc = _analytics_service(request, start_date, end_date)
    return [
        {"stage": row["stage"], "count": row["count"], "value": row["value"]}
        for row in svc.funnel()
    ]


@router.get("/analytics/revenue-trend", auth=auth)
def analytics_revenue_trend(request: HttpRequest, start_date: str | None = None, end_date: str | None = None):
    svc = _analytics_service(request, start_date, end_date)
    return [
        {
            "date": row["period"].strftime("%Y-%m") if row["period"] else None,
            "revenue": row["revenue"],
            "profit": row["profit"],
        }
        for row in svc.revenue_trend()
    ]


@router.get("/analytics/kpis", auth=auth, response=KPIsOut)
def analytics_kpis(request: HttpRequest, start_date: str | None = None, end_date: str | None = None):
    svc = _analytics_service(request, start_date, end_date)
    return svc.kpis()


@router.get("/analytics/top-products", auth=auth, response=list[TopProductOut])
def analytics_top_products(request: HttpRequest, start_date: str | None = None, end_date: str | None = None):
    svc = _analytics_service(request, start_date, end_date)
    return svc.top_products()


@router.get("/dashboard/analytics", auth=auth)
def analytics_dashboard_bundle(request: HttpRequest, start_date: str | None = None, end_date: str | None = None):
    svc = _analytics_service(request, start_date, end_date)
    funnel = svc.funnel()
    trend = svc.revenue_trend()
    return {
        "funnel": funnel,
        "revenue_trend": [
            {"date": row["period"].strftime("%Y-%m") if row["period"] else None, "revenue": row["revenue"], "profit": row["profit"]}
            for row in trend
        ],
        "kpis": svc.kpis(),
        "top_products": svc.top_products(),
        "sources": svc.source_performance(),
    }
