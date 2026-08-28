import django_filters

from .models import Order


class OrderFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status", lookup_expr="iexact")
    # Powers the order picker on the new-ticket form.
    ticketable = django_filters.BooleanFilter(method="filter_ticketable")

    class Meta:
        model = Order
        fields = ["status", "ticketable"]

    def filter_ticketable(self, queryset, name, value):
        if value is None:
            return queryset
        return queryset.filter(ticket__isnull=value)
