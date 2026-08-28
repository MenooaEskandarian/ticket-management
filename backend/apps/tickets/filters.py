from datetime import timedelta

import django_filters
from django.conf import settings
from django.db.models import F, Q
from django.utils import timezone

from apps.orders.models import OrderStatus

from .models import Ticket
from .services import SlaLevel


class TicketFilter(django_filters.FilterSet):
    """Agent-dashboard filters: ticket state, order state and response age."""

    status = django_filters.CharFilter(field_name="status", lookup_expr="iexact")
    kind = django_filters.CharFilter(field_name="kind", lookup_expr="iexact")
    delivered_only = django_filters.BooleanFilter(method="filter_delivered_only")
    sla = django_filters.ChoiceFilter(
        method="filter_sla",
        choices=[
            (SlaLevel.ANSWERED, "Answered"),
            (SlaLevel.WAITING, "Waiting"),
            (SlaLevel.WARNING, "Overdue"),
            (SlaLevel.CRITICAL, "Critical"),
        ],
    )

    class Meta:
        model = Ticket
        fields = ["status", "kind", "delivered_only", "sla"]

    def filter_delivered_only(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(order__status=OrderStatus.DELIVERED)

    def filter_sla(self, queryset, name, value):
        """Mirror services.sla_level in SQL so the bands can be filtered on."""
        answered = Q(last_customer_message_at__isnull=True) | Q(
            last_staff_message_at__gte=F("last_customer_message_at")
        )
        if value == SlaLevel.ANSWERED:
            return queryset.filter(answered)

        now = timezone.now()
        warning_cutoff = now - timedelta(hours=settings.TICKET_SLA_WARNING_HOURS)
        critical_cutoff = now - timedelta(hours=settings.TICKET_SLA_CRITICAL_HOURS)
        unanswered = queryset.exclude(answered)

        if value == SlaLevel.CRITICAL:
            return unanswered.filter(last_customer_message_at__lte=critical_cutoff)
        if value == SlaLevel.WARNING:
            return unanswered.filter(
                last_customer_message_at__lte=warning_cutoff,
                last_customer_message_at__gt=critical_cutoff,
            )
        return unanswered.filter(last_customer_message_at__gt=warning_cutoff)
