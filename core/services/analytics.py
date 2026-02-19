from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal

from django.db.models import Avg, Case, Count, DecimalField, F, FloatField, Q, Sum, Value, When
from django.db.models.functions import Coalesce, TruncMonth

from core.models import Deal, ServiceItem


@dataclass
class AnalyticsFilters:
    tenant_id: str
    start_date: date | None = None
    end_date: date | None = None


class AnalyticsService:
    FUNNEL_ORDER = ["NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"]

    def __init__(self, filters: AnalyticsFilters) -> None:
        self.filters = filters

    def _base_deals(self):
        qs = Deal.objects.filter(tenant_id=self.filters.tenant_id)
        if self.filters.start_date:
            qs = qs.filter(created_at__date__gte=self.filters.start_date)
        if self.filters.end_date:
            qs = qs.filter(created_at__date__lte=self.filters.end_date)
        return qs

    def _base_items(self):
        qs = ServiceItem.objects.filter(tenant_id=self.filters.tenant_id)
        if self.filters.start_date:
            qs = qs.filter(created_at__date__gte=self.filters.start_date)
        if self.filters.end_date:
            qs = qs.filter(created_at__date__lte=self.filters.end_date)
        return qs

    def funnel(self):
        stage_rank = Case(
            *[When(stage=stage, then=Value(idx)) for idx, stage in enumerate(self.FUNNEL_ORDER)],
            default=Value(999),
        )
        return list(
            self._base_deals()
            .values("stage")
            .annotate(
                count=Count("id"),
                value=Coalesce(Sum("amount"), Value(Decimal("0.00"), output_field=DecimalField(max_digits=14, decimal_places=2))),
                stage_order=stage_rank,
            )
            .filter(stage__in=self.FUNNEL_ORDER)
            .order_by("stage_order")
            .values("stage", "count", "value")
        )

    def revenue_trend(self):
        return list(
            self._base_deals()
            .annotate(period=TruncMonth("created_at"))
            .values("period")
            .annotate(
                revenue=Coalesce(
                    Sum("amount", filter=Q(stage="WON")),
                    Value(Decimal("0.00"), output_field=DecimalField(max_digits=14, decimal_places=2)),
                ),
                profit=Coalesce(
                    Sum(F("service_items__sale_price") * F("service_items__quantity"), filter=Q(stage="WON"))
                    - Sum(F("service_items__cost_price") * F("service_items__quantity"), filter=Q(stage="WON")),
                    Value(Decimal("0.00"), output_field=DecimalField(max_digits=14, decimal_places=2)),
                ),
            )
            .order_by("period")
            .values("period", "revenue", "profit")
        )

    def source_performance(self):
        return list(self._base_deals().values("source").annotate(count=Count("id")).order_by("-count"))

    def kpis(self):
        base = self._base_deals()
        agg = base.aggregate(
            total_revenue=Coalesce(
                Sum("amount", filter=Q(stage="WON")),
                Value(Decimal("0.00"), output_field=DecimalField(max_digits=14, decimal_places=2)),
            ),
            total_deals=Count("id"),
            won_deals=Count("id", filter=Q(stage="WON")),
            avg_ticket=Coalesce(
                Avg("amount", filter=Q(stage="WON")),
                Value(Decimal("0.00"), output_field=DecimalField(max_digits=14, decimal_places=2)),
            ),
        )
        total_deals = agg["total_deals"] or 0
        won_deals = agg["won_deals"] or 0
        conversion_rate = float((won_deals / total_deals) * 100) if total_deals else 0.0
        return {
            "total_revenue": agg["total_revenue"],
            "total_deals": total_deals,
            "conversion_rate": conversion_rate,
            "avg_ticket": agg["avg_ticket"],
        }

    def top_products(self):
        return list(
            self._base_items()
            .values(name=F("description"))
            .annotate(
                sold_count=Coalesce(Sum("quantity"), Value(0)),
                revenue=Coalesce(
                    Sum(F("sale_price") * F("quantity")),
                    Value(Decimal("0.00"), output_field=DecimalField(max_digits=14, decimal_places=2)),
                ),
            )
            .order_by("-sold_count", "-revenue")[:5]
        )


def parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%d").date()
