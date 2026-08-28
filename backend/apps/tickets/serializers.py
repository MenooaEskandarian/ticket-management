from rest_framework import serializers

from apps.orders.models import Order
from apps.orders.serializers import DriverSerializer

from . import services
from .models import Attachment, Ticket, TicketMessage


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ["id", "file", "original_name", "content_type", "size_bytes", "uploaded_at"]
        read_only_fields = fields


class TicketMessageSerializer(serializers.ModelSerializer):
    attachments = AttachmentSerializer(many=True, read_only=True)
    author_name = serializers.CharField(source="author.full_name", read_only=True, default="")

    class Meta:
        model = TicketMessage
        fields = ["id", "body", "author_name", "author_role", "created_at", "attachments"]
        read_only_fields = fields


class TicketListSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.number", read_only=True)
    order_status = serializers.CharField(source="order.status", read_only=True)
    customer_name = serializers.CharField(source="order.customer.full_name", read_only=True)
    sla_level = serializers.SerializerMethodField()
    unanswered_count = serializers.IntegerField(read_only=True, default=0)
    message_count = serializers.IntegerField(read_only=True, default=0)

    def get_sla_level(self, ticket) -> str:
        return services.sla_level(ticket)

    class Meta:
        model = Ticket
        fields = [
            "id",
            "subject",
            "kind",
            "status",
            "order",
            "order_number",
            "order_status",
            "customer_name",
            "created_at",
            "last_message_at",
            "sla_level",
            "unanswered_count",
            "message_count",
        ]
        read_only_fields = fields


class TicketDetailSerializer(TicketListSerializer):
    messages = TicketMessageSerializer(many=True, read_only=True)
    driver = DriverSerializer(source="order.driver", read_only=True)
    customer_last_seen_at = serializers.DateTimeField(
        source="order.customer.last_seen_at", read_only=True
    )
    can_reopen = serializers.SerializerMethodField()
    reopen_deadline = serializers.SerializerMethodField()

    class Meta(TicketListSerializer.Meta):
        fields = TicketListSerializer.Meta.fields + [
            "messages",
            "driver",
            "customer_last_seen_at",
            "closed_at",
            "reopened_at",
            "can_reopen",
            "reopen_deadline",
        ]
        read_only_fields = fields

    def get_can_reopen(self, ticket) -> bool:
        return services.can_reopen(ticket)[0]

    def get_reopen_deadline(self, ticket):
        return services.reopen_window_closes_at(ticket)


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(min_length=2, max_length=5000, trim_whitespace=True)


class TicketCreateSerializer(serializers.Serializer):
    """The one form behind all three ticket variants.

    Which variant applies is derived from the order's status on the server, so
    a customer cannot pick a form the order does not qualify for.
    """

    order = serializers.PrimaryKeyRelatedField(queryset=Order.objects.all())
    subject = serializers.CharField(max_length=180, trim_whitespace=True)
    body = serializers.CharField(min_length=10, max_length=5000, trim_whitespace=True)

    def validate_order(self, order):
        user = self.context["request"].user
        if not user.is_support and order.customer_id != user.id:
            raise serializers.ValidationError("You can only open a ticket on your own order.")
        return order
