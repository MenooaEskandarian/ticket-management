"""Delivery channels.

Each channel renders a ticket message for its medium and hands it to a sink.
There is no real email or SMS gateway here: the sink writes a log line and
appends a CSV row, which is where the delivery would otherwise go. Swapping in
a live provider means overriding ``deliver`` on one class.
"""

import csv
import logging
from pathlib import Path

from django.conf import settings
from django.utils import timezone

from apps.notifications.models import NotificationLog, NotificationStatus

logger = logging.getLogger("golgift.notifications")

CSV_COLUMNS = ["sent_at", "channel", "recipient", "ticket_id", "message_id", "subject", "body"]


class BaseChannel:
    name: str = ""
    csv_filename: str = ""

    def recipient_for(self, user) -> str:
        raise NotImplementedError

    def render(self, ticket, message) -> tuple[str, str]:
        raise NotImplementedError

    def send(self, *, ticket, message, recipient_user) -> NotificationLog:
        recipient = self.recipient_for(recipient_user)
        subject, body = self.render(ticket, message)

        status, error = NotificationStatus.SENT, ""
        try:
            self.deliver(
                recipient=recipient, subject=subject, body=body, ticket=ticket, message=message
            )
        except OSError as exc:
            # A failed sink must not roll back the message the customer just sent.
            status, error = NotificationStatus.FAILED, str(exc)
            logger.exception("%s delivery to %s failed", self.name, recipient)

        return NotificationLog.objects.create(
            channel=self.name,
            recipient=recipient,
            subject=subject,
            body=body,
            status=status,
            error=error,
            ticket=ticket,
            message=message,
        )

    def deliver(self, *, recipient, subject, body, ticket, message) -> None:
        logger.info(
            "%s -> %s | ticket #%s | %s", self.name, recipient, ticket.pk, subject or body[:60]
        )
        self.append_csv(
            [
                timezone.now().isoformat(timespec="seconds"),
                self.name,
                recipient,
                ticket.pk,
                message.pk,
                subject,
                " ".join(body.split()),
            ]
        )

    def append_csv(self, row) -> None:
        path = Path(settings.NOTIFICATIONS_CSV_DIR) / self.csv_filename
        path.parent.mkdir(parents=True, exist_ok=True)
        is_new = not path.exists()
        with path.open("a", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            if is_new:
                writer.writerow(CSV_COLUMNS)
            writer.writerow(row)
