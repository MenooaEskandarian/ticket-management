from rest_framework import serializers

from .models import NotificationLog


class NotificationLogSerializer(serializers.ModelSerializer):
    ticket_subject = serializers.CharField(source="ticket.subject", read_only=True, default="")

    class Meta:
        model = NotificationLog
        fields = [
            "id",
            "channel",
            "recipient",
            "subject",
            "body",
            "status",
            "error",
            "ticket",
            "ticket_subject",
            "message",
            "created_at",
        ]
        read_only_fields = fields
