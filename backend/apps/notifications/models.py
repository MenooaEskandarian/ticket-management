from django.db import models


class NotificationChannelName(models.TextChoices):
    EMAIL = "EMAIL", "Email"
    SMS = "SMS", "SMS"


class NotificationStatus(models.TextChoices):
    SENT = "SENT", "Sent"
    FAILED = "FAILED", "Failed"


class NotificationLog(models.Model):
    """A record of every message the system tried to deliver.

    Real gateways are out of scope, so this table plus the CSV sink is the
    evidence that the integration point fires on the right events.
    """

    channel = models.CharField(max_length=10, choices=NotificationChannelName.choices)
    recipient = models.CharField(max_length=255)
    subject = models.CharField(max_length=255, blank=True)
    body = models.TextField()
    status = models.CharField(
        max_length=10, choices=NotificationStatus.choices, default=NotificationStatus.SENT
    )
    error = models.TextField(blank=True)

    ticket = models.ForeignKey(
        "tickets.Ticket", on_delete=models.CASCADE, null=True, related_name="notifications"
    )
    message = models.ForeignKey(
        "tickets.TicketMessage", on_delete=models.CASCADE, null=True, related_name="notifications"
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.channel} to {self.recipient}"
