from apps.notifications.models import NotificationChannelName

from .base import BaseChannel

SMS_LIMIT = 160


class SmsChannel(BaseChannel):
    name = NotificationChannelName.SMS
    csv_filename = "sms.csv"

    def recipient_for(self, user) -> str:
        return user.phone

    def render(self, ticket, message) -> tuple[str, str]:
        who = "Support replied" if message.is_from_staff else "Message received"
        text = f"GolGift: {who} on ticket #{ticket.pk} ({ticket.order.number}). {message.body}"
        return "", text[:SMS_LIMIT]
