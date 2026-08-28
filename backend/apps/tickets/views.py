from django.db.models import Prefetch
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from . import services
from .models import Ticket, TicketMessage
from .serializers import (
    MessageCreateSerializer,
    TicketDetailSerializer,
    TicketListSerializer,
    TicketMessageSerializer,
)


@extend_schema(tags=["tickets"])
class TicketViewSet(viewsets.ReadOnlyModelViewSet):
    """Customers see the tickets on their own orders; agents see all of them."""

    parser_classes = [MultiPartParser, FormParser, JSONParser]
    ordering_fields = ["created_at", "last_message_at", "status"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return TicketDetailSerializer
        return TicketListSerializer

    def get_queryset(self):
        messages = TicketMessage.objects.select_related("author").prefetch_related("attachments")
        queryset = Ticket.objects.select_related(
            "order", "order__customer", "order__driver"
        ).prefetch_related(Prefetch("messages", queryset=messages))

        user = self.request.user
        if not user.is_support:
            queryset = queryset.filter(order__customer=user)
        return queryset

    @extend_schema(request=MessageCreateSerializer, responses=TicketMessageSerializer)
    @action(detail=True, methods=["post"], url_path="messages")
    def messages(self, request, pk=None):
        ticket = self.get_object()
        payload = MessageCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        message = services.post_message(
            ticket=ticket,
            author=request.user,
            body=payload.validated_data["body"],
            attachments=request.FILES.getlist("attachments"),
        )
        return Response(
            TicketMessageSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )
