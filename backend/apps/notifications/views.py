from drf_spectacular.utils import extend_schema
from rest_framework import viewsets

from apps.accounts.permissions import IsSupportAgent

from .models import NotificationLog
from .serializers import NotificationLogSerializer


@extend_schema(tags=["notifications"])
class NotificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Lets an agent see that the email and SMS events actually fired."""

    serializer_class = NotificationLogSerializer
    permission_classes = [IsSupportAgent]
    queryset = NotificationLog.objects.select_related("ticket")
    filterset_fields = ["channel", "status", "ticket"]
    search_fields = ["recipient", "subject", "body"]
    ordering_fields = ["created_at", "channel"]
    ordering = ["-created_at"]
