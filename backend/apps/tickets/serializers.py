from rest_framework import serializers

from apps.orders.serializers import DriverSerializer

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
        ]
        read_only_fields = fields


class TicketDetailSerializer(TicketListSerializer):
    messages = TicketMessageSerializer(many=True, read_only=True)
    driver = DriverSerializer(source="order.driver", read_only=True)
    customer_last_seen_at = serializers.DateTimeField(
        source="order.customer.last_seen_at", read_only=True
    )

    class Meta(TicketListSerializer.Meta):
        fields = TicketListSerializer.Meta.fields + [
            "messages",
            "driver",
            "customer_last_seen_at",
            "closed_at",
            "reopened_at",
        ]
        read_only_fields = fields


class MessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(min_length=2, max_length=5000, trim_whitespace=True)
