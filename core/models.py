from __future__ import annotations

import base64
import hashlib
import secrets
import uuid
from decimal import Decimal
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.contrib.postgres.fields import ArrayField, JSONField
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TenantModel(TimeStampedModel):
    tenant_id = models.UUIDField(db_index=True)

    class Meta:
        abstract = True


class UserManager(BaseUserManager["User"]):
    def create_user(self, email: str, password: str | None = None, **extra_fields: Any) -> "User":
        if not email:
            raise ValueError("Email is required")
        user = self.model(email=self.normalize_email(email), **extra_fields)
        user.set_password(password) if password else user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str | None = None, **extra_fields: Any) -> "User":
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("tenant_id", uuid.uuid4())
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = UserManager()


class APIKey(TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    prefix = models.CharField(max_length=12, db_index=True)
    key_hash = models.CharField(max_length=64, unique=True)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(blank=True, null=True)
    last_used_at = models.DateTimeField(blank=True, null=True)

    @staticmethod
    def _hash(raw_key: str) -> str:
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    @classmethod
    def create_key(cls, *, tenant_id: uuid.UUID, name: str) -> tuple["APIKey", str]:
        raw = f"crm_{secrets.token_urlsafe(32)}"
        obj = cls.objects.create(
            tenant_id=tenant_id,
            name=name,
            prefix=raw[:12],
            key_hash=cls._hash(raw),
        )
        return obj, raw

    def is_valid(self, raw: str) -> bool:
        if not self.is_active:
            return False
        if self.expires_at and self.expires_at <= timezone.now():
            return False
        return secrets.compare_digest(self.key_hash, self._hash(raw))


class Client(TenantModel):
    class LifecycleStage(models.TextChoices):
        LEAD = "LEAD", "Lead"
        ACTIVE = "ACTIVE", "Active"
        VIP = "VIP", "VIP"
        CHURN = "CHURN", "Churn"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=60, blank=True)
    lifecycle_stage = models.CharField(max_length=20, choices=LifecycleStage.choices, default=LifecycleStage.LEAD)
    is_top_10 = models.BooleanField(default=False)
    custom_attributes = JSONField(default=dict, blank=True)
    purchase_history = JSONField(default=list, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["tenant_id", "email"], name="uq_client_tenant_email")]
        indexes = [
            models.Index(fields=["tenant_id", "email"]),
            models.Index(fields=["tenant_id", "lifecycle_stage"]),
            models.GinIndex(fields=["custom_attributes"], name="gin_client_custom_attributes"),
            models.GinIndex(fields=["purchase_history"], name="gin_client_purchase_history"),
        ]


class Product(TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=180)
    category = models.CharField(max_length=80)
    keywords = ArrayField(models.CharField(max_length=80), default=list, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["tenant_id", "name"], name="uq_product_tenant_name")]
        indexes = [models.Index(fields=["tenant_id", "category"])]


class Deal(TenantModel):
    class Board(models.TextChoices):
        SALES = "SALES", "Sales"
        COMMERCIAL = "COMMERCIAL", "Commercial"
        TOP10 = "TOP10", "Top10"
        INTERNAL_OPS = "INTERNAL_OPS", "Internal Ops"

    class Stage(models.TextChoices):
        NEW = "NEW", "New"
        QUALIFY = "QUALIFY", "Qualify"
        QUALIFIED = "QUALIFIED", "Qualified"
        PROPOSAL = "PROPOSAL", "Proposal"
        NEGOTIATION = "NEGOTIATION", "Negotiation"
        WON = "WON", "Won"
        LOST = "LOST", "Lost"
        MANUAL_REVIEW = "MANUAL_REVIEW", "Manual Review"

    class Source(models.TextChoices):
        EMAIL = "EMAIL", "Email"
        WHATSAPP = "WHATSAPP", "Whatsapp"
        INDICATION = "INDICATION", "Indicação"

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        NORMAL = "NORMAL", "Normal"
        HIGH = "HIGH", "High"
        CRITICAL = "CRITICAL", "Critical"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name="deals")
    title = models.CharField(max_length=255)
    board = models.CharField(max_length=20, choices=Board.choices, default=Board.COMMERCIAL)
    stage = models.CharField(max_length=20, choices=Stage.choices, default=Stage.NEW)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL)
    tags = ArrayField(models.CharField(max_length=60), default=list, blank=True)
    email_thread_id = models.CharField(max_length=255, blank=True, db_index=True)
    ai_metadata = JSONField(default=dict, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.EMAIL)

    class Meta:
        indexes = [
            models.Index(fields=["tenant_id", "board", "stage"]),
            models.Index(fields=["tenant_id", "email_thread_id"]),
            models.GinIndex(fields=["ai_metadata"], name="gin_deal_ai_metadata"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant_id", "email_thread_id"],
                condition=~Q(email_thread_id=""),
                name="uq_deal_tenant_thread_not_empty",
            )
        ]


class UserSMTP(TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="smtp")
    host = models.CharField(max_length=255)
    port = models.PositiveIntegerField(default=587)
    username = models.CharField(max_length=255)
    encrypted_password = models.TextField()
    use_tls = models.BooleanField(default=True)
    use_ssl = models.BooleanField(default=False)

    @staticmethod
    def _fernet() -> Fernet:
        key = getattr(settings, "SMTP_CREDENTIALS_KEY", "")
        if not key:
            raise ValueError("SMTP_CREDENTIALS_KEY is not configured")
        try:
            return Fernet(key.encode("utf-8"))
        except Exception:
            normalized = base64.urlsafe_b64encode(hashlib.sha256(key.encode("utf-8")).digest())
            return Fernet(normalized)

    def set_password(self, raw_password: str) -> None:
        self.encrypted_password = self._fernet().encrypt(raw_password.encode("utf-8")).decode("utf-8")

    def get_password(self) -> str:
        try:
            return self._fernet().decrypt(self.encrypted_password.encode("utf-8")).decode("utf-8")
        except InvalidToken as exc:
            raise ValueError("Invalid SMTP credential encryption key") from exc


class ServiceItem(TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name="service_items")
    description = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    sale_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])

    @property
    def profit(self) -> Decimal:
        return (self.sale_price - self.cost_price) * self.quantity


class MarketingCampaign(TenantModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SCHEDULED = "SCHEDULED", "Scheduled"
        SENDING = "SENDING", "Sending"
        SENT = "SENT", "Sent"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.CharField(max_length=255)
    html_content = models.TextField()
    target_filters = JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    scheduled_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=["tenant_id", "status"]),
            models.GinIndex(fields=["target_filters"], name="gin_campaign_filters"),
        ]


class CampaignLog(TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(MarketingCampaign, on_delete=models.CASCADE, related_name="logs")
    contact = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="campaign_logs")
    sent_at = models.DateTimeField(default=timezone.now)
    opened = models.BooleanField(default=False)
    opened_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["campaign", "contact"], name="uq_campaign_contact")]
        indexes = [models.Index(fields=["tenant_id", "campaign", "opened"])]


class DocumentTemplate(TenantModel):
    class TemplateType(models.TextChoices):
        VOUCHER = "VOUCHER", "Voucher"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=180)
    html_body = models.TextField()
    type = models.CharField(max_length=20, choices=TemplateType.choices, default=TemplateType.VOUCHER)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["tenant_id", "name", "type"], name="uq_template_tenant_name_type")]


class TenantConfig(TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    primary_color = models.CharField(max_length=20, default="#0297A2")
    sidebar_color = models.CharField(max_length=20, default="#0A2B4D")
    logo_file = models.ImageField(upload_to="tenant_logos/", blank=True, null=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["tenant_id"], name="uq_tenant_config")]
