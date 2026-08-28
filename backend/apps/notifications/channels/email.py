from apps.notifications.models import NotificationChannelName

from .base import BaseChannel


class EmailChannel(BaseChannel):
    name = NotificationChannelName.EMAIL
    csv_filename = "email.csv"

    def recipient_for(self, user) -> str:
        return user.email

    def render(self, ticket, message) -> tuple[str, str]:
        who = "Support" if message.is_from_staff else "You"
        subject = f"[GolGift #{ticket.pk}] {ticket.subject}"
        body = (
            f"Hello {ticket.order.customer.get_short_name()},\n\n"
            f"{who} added a message to your ticket about order {ticket.order.number}.\n\n"
            f"{message.body}\n\n"
            f"You can reply from your GolGift account."
        )
        return subject, body
