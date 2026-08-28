"""Fan a ticket message out to every configured channel."""

from .channels import get_channels
from .models import NotificationLog


def notify_ticket_message(message) -> list[NotificationLog]:
    """Notify the customer on every channel, for their own messages and staff replies.

    Both channels fire from the same call so the email and the SMS go out
    together, as the brief requires. Delivery is synchronous: the sinks are
    local, so there is nothing slow to defer. Moving to a task queue would mean
    queueing this one function.
    """
    ticket = message.ticket
    customer = ticket.order.customer
    return [
        channel.send(ticket=ticket, message=message, recipient_user=customer)
        for channel in get_channels()
    ]
