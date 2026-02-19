from __future__ import annotations

import logging
from email.mime.image import MIMEImage

from celery import shared_task
from django.core.mail import EmailMultiAlternatives, get_connection
from django.utils import timezone

from core.models import CampaignLog, Client, MarketingCampaign, UserSMTP
from core.services import IngestPayload, process_incoming_email

logger = logging.getLogger(__name__)

CHUNK_SIZE = 50


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def process_incoming_email_task(self, payload: dict) -> dict:
    logger.info("Processing incoming email asynchronously")
    deal = process_incoming_email(IngestPayload(**payload))
    return {"status": "ignored_spam" if deal is None else "processed", "deal_id": str(deal.id) if deal else None}


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def send_campaign_task(self, campaign_id: str) -> dict:
    campaign = MarketingCampaign.objects.get(id=campaign_id)
    campaign.status = MarketingCampaign.Status.SENDING
    campaign.save(update_fields=["status", "updated_at"])

    filters = campaign.target_filters or {}
    queryset = Client.objects.filter(tenant_id=campaign.tenant_id)

    if lifecycle := filters.get("lifecycle_stage"):
        queryset = queryset.filter(lifecycle_stage=lifecycle)
    if filters.get("is_top_10") is True:
        queryset = queryset.filter(is_top_10=True)

    smtp_cfg = UserSMTP.objects.filter(tenant_id=campaign.tenant_id).first()
    if not smtp_cfg:
        raise ValueError("No SMTP profile configured for tenant")

    connection = get_connection(
        backend="django.core.mail.backends.smtp.EmailBackend",
        host=smtp_cfg.host,
        port=smtp_cfg.port,
        username=smtp_cfg.username,
        password=smtp_cfg.get_password(),
        use_tls=smtp_cfg.use_tls,
        use_ssl=smtp_cfg.use_ssl,
        timeout=20,
    )

    sent_count = 0
    with connection:
        contacts = list(queryset.iterator(chunk_size=CHUNK_SIZE))
        for idx in range(0, len(contacts), CHUNK_SIZE):
            for contact in contacts[idx : idx + CHUNK_SIZE]:
                html_body = campaign.html_content.replace("{{ name }}", contact.name)
                track_url = f"{campaign.id}/{contact.id}.png"
                html_body += f"<img src='/api/marketing/track/{track_url}' width='1' height='1' alt='' />"

                msg = EmailMultiAlternatives(
                    subject=campaign.subject,
                    body="",
                    from_email=smtp_cfg.username,
                    to=[contact.email],
                    connection=connection,
                )
                msg.attach_alternative(html_body, "text/html")
                msg.send(fail_silently=False)

                CampaignLog.objects.update_or_create(
                    tenant_id=campaign.tenant_id,
                    campaign=campaign,
                    contact=contact,
                    defaults={"sent_at": timezone.now()},
                )
                sent_count += 1

    campaign.status = MarketingCampaign.Status.SENT
    campaign.save(update_fields=["status", "updated_at"])
    return {"sent": sent_count}
