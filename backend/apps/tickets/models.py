from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.accounts.models import UserRole
from common.models import TimeStampedModel

from .validators import validate_image_upload


class TicketKind(models.TextChoices):
    """Which form the customer filled in, decided by the order's status."""

    DELIVERY_ISSUE = "DELIVERY_ISSUE", "Problem with a delivered order"
    SHIPMENT_REQUEST = "SHIPMENT_REQUEST", "Request about a shipment"
    GENERAL = "GENERAL", "General message"


class TicketStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    PENDING = "PENDING", "Pending"
    CLOSED = "CLOSED", "Closed"


class Ticket(TimeStampedModel):
    # One ticket per order is a requirement, so it is a database constraint
    # rather than something the view remembers to check.
    order = models.OneToOneField("orders.Order", on_delete=models.CASCADE, related_name="ticket")
    subject = models.CharField(max_length=180)
    kind = models.CharField(max_length=20, choices=TicketKind.choices)
    status = models.CharField(
        max_length=10, choices=TicketStatus.choices, default=TicketStatus.OPEN
    )

    closed_at = models.DateTimeField(null=True, blank=True)
    reopened_at = models.DateTimeField(null=True, blank=True)

    # Maintained whenever a message lands. They keep the agent dashboard's
    # ordering, response-age colouring and unanswered counts off a join.
    last_message_at = models.DateTimeField(null=True, blank=True, db_index=True)
    last_customer_message_at = models.DateTimeField(null=True, blank=True)
    last_staff_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "-created_at"])]

    def __str__(self):
        return f"#{self.pk} {self.subject}"

    @property
    def customer(self):
        return self.order.customer

    @property
    def is_closed(self) -> bool:
        return self.status == TicketStatus.CLOSED

    @property
    def awaiting_reply_since(self):
        """When the customer started waiting, or None if staff replied last."""
        if self.last_customer_message_at is None:
            return None
        if (
            self.last_staff_message_at
            and self.last_staff_message_at >= self.last_customer_message_at
        ):
            return None
        return self.last_customer_message_at

    def register_message(self, message: TicketMessage) -> None:
        """Roll the denormalised timestamps forward for a newly saved message."""
        fields = ["last_message_at", "status", "updated_at"]
        self.last_message_at = message.created_at

        if message.author_role == UserRole.SUPPORT:
            self.last_staff_message_at = message.created_at
            self.status = TicketStatus.PENDING
            fields.append("last_staff_message_at")
        else:
            self.last_customer_message_at = message.created_at
            self.status = TicketStatus.OPEN
            fields.append("last_customer_message_at")

        self.save(update_fields=fields)

    def close(self) -> None:
        self.status = TicketStatus.CLOSED
        self.closed_at = timezone.now()
        self.save(update_fields=["status", "closed_at", "updated_at"])


class TicketMessage(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="ticket_messages",
    )
    # Copied at write time so the thread still reads correctly if the author's
    # role changes later.
    author_role = models.CharField(max_length=16, choices=UserRole.choices)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Message {self.pk} on ticket {self.ticket_id}"

    @property
    def is_from_staff(self) -> bool:
        return self.author_role == UserRole.SUPPORT


class Attachment(models.Model):
    message = models.ForeignKey(TicketMessage, on_delete=models.CASCADE, related_name="attachments")
    file = models.ImageField(
        upload_to="ticket-attachments/%Y/%m/", validators=[validate_image_upload]
    )
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    size_bytes = models.PositiveIntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.original_name
