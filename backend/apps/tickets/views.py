from datetime import UTC, datetime

from django.db.models import Count, DateTimeField, Prefetch, Q, Value
from django.db.models.functions import Coalesce
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.accounts.models import UserRole

from . import services
from .filters import TicketFilter
from .models import Ticket, TicketMessage
from .serializers import (
    MessageCreateSerializer,
    TicketCreateSerializer,
    TicketDetailSerializer,
    TicketListSerializer,
    TicketMessageSerializer,
)

# Stands in for "no agent has replied yet" when counting unanswered messages.
BEFORE_EVERYTHING = datetime(1970, 1, 1, tzinfo=UTC)


@extend_schema(tags=["tickets"])
class TicketViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Customers see the tickets on their own orders; agents see all of them."""

    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_class = TicketFilter
    search_fields = ["subject", "order__number", "order__customer__full_name"]
    ordering_fields = ["created_at", "last_message_at", "status", "unanswered_count"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "create":
            return TicketCreateSerializer
        if self.action == "retrieve":
            return TicketDetailSerializer
        return TicketListSerializer

    def get_queryset(self):
        messages = TicketMessage.objects.select_related("author").prefetch_related("attachments")
        queryset = (
            Ticket.objects.select_related("order", "order__customer", "order__driver")
            .prefetch_related(Prefetch("messages", queryset=messages))
            .annotate(
                message_count=Count("messages", distinct=True),
                unanswered_count=Count(
                    "messages",
                    filter=Q(
                        messages__author_role=UserRole.CUSTOMER,
                        messages__created_at__gt=Coalesce(
                            "last_staff_message_at",
                            Value(BEFORE_EVERYTHING, output_field=DateTimeField()),
                        ),
                    ),
                    distinct=True,
                ),
            )
        )

        user = self.request.user
        if not user.is_support:
            queryset = queryset.filter(order__customer=user)
        return queryset

    @extend_schema(request=TicketCreateSerializer, responses=TicketDetailSerializer)
    def create(self, request, *args, **kwargs):
        payload = self.get_serializer(data=request.data)
        payload.is_valid(raise_exception=True)

        ticket = services.create_ticket(
            order=payload.validated_data["order"],
            author=request.user,
            subject=payload.validated_data["subject"],
            body=payload.validated_data["body"],
            attachments=request.FILES.getlist("attachments"),
        )
        return Response(
            TicketDetailSerializer(self.get_queryset().get(pk=ticket.pk)).data,
            status=status.HTTP_201_CREATED,
        )

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
        return Response(TicketMessageSerializer(message).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=None, responses=TicketDetailSerializer)
    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        ticket = self.get_object()
        services.reopen_ticket(ticket)
        return Response(TicketDetailSerializer(self.get_queryset().get(pk=ticket.pk)).data)

    @extend_schema(request=None, responses=TicketDetailSerializer)
    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        ticket = self.get_object()
        services.close_ticket(ticket)
        return Response(TicketDetailSerializer(self.get_queryset().get(pk=ticket.pk)).data)
