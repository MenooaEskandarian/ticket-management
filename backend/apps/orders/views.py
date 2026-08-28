from django.db.models import Count
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets

from .models import Order
from .serializers import OrderDetailSerializer, OrderListSerializer


@extend_schema(tags=["orders"])
class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """A customer sees their own orders; support agents see every order."""

    filterset_fields = ["status"]
    ordering_fields = ["placed_at", "total_amount", "status"]
    ordering = ["-placed_at"]
    search_fields = ["number"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return OrderDetailSerializer
        return OrderListSerializer

    def get_queryset(self):
        queryset = (
            Order.objects.select_related("driver", "customer")
            .prefetch_related("items__product__category")
            .annotate(item_count=Count("items", distinct=True))
        )
        user = self.request.user
        if not user.is_support:
            queryset = queryset.filter(customer=user)
        return queryset
