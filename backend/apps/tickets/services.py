"""Ticket business rules.

Everything the API is allowed to do to a ticket goes through here, so the rules
are testable on their own and the views stay thin.
"""

from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.notifications.dispatch import queue_ticket_message
from apps.orders.models import OrderStatus
from common.exceptions import ConflictError

from .models import Attachment, Ticket, TicketKind, TicketMessage, TicketStatus
from .validators import validate_image_upload

# Which form the customer gets is decided entirely by the order's status.
KIND_BY_ORDER_STATUS = {
    OrderStatus.DELIVERED: TicketKind.DELIVERY_ISSUE,
    OrderStatus.SHIPPED: TicketKind.SHIPMENT_REQUEST,
}

# Only a report about a delivered order carries photographs.
KINDS_ACCEPTING_ATTACHMENTS = {TicketKind.DELIVERY_ISSUE}


class SlaLevel:
    """Response-age bands behind the colour coding in the agent dashboard."""

    ANSWERED = "ANSWERED"
    WAITING = "WAITING"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


def kind_for_order(order) -> str:
    """Delivered orders get the photo form, shipped ones the shipment form."""
    return KIND_BY_ORDER_STATUS.get(order.status, TicketKind.GENERAL)


def validate_attachments(files, *, kind: str) -> list:
    """Check every uploaded file, reporting all problems at once."""
    files = list(files or [])
    if not files:
        return files

    if kind not in KINDS_ACCEPTING_ATTACHMENTS:
        raise ValidationError(
            {"attachments": ["Photos can only be attached to a ticket about a delivered order."]}
        )

    if len(files) > settings.MAX_ATTACHMENTS_PER_MESSAGE:
        raise ValidationError(
            {"attachments": [f"Attach at most {settings.MAX_ATTACHMENTS_PER_MESSAGE} images."]}
        )

    errors = {}
    for index, uploaded in enumerate(files):
        try:
            validate_image_upload(uploaded)
        except DjangoValidationError as exc:
            errors[str(index)] = list(exc.messages)

    if errors:
        raise ValidationError({"attachments": errors})
    return files


@transaction.atomic
def create_ticket(*, order, author, subject: str, body: str, attachments=()) -> Ticket:
    """Open the one ticket an order is allowed to have."""
    existing = Ticket.objects.filter(order=order).first()
    if existing is not None:
        raise ConflictError(
            detail=(
                "This order already has a ticket. Continue the conversation there "
                "instead of opening a new one."
            ),
            code="ticket_exists",
            payload={"ticket_id": existing.pk},
        )

    kind = kind_for_order(order)
    files = validate_attachments(attachments, kind=kind)

    ticket = Ticket.objects.create(order=order, subject=subject, kind=kind)
    post_message(ticket=ticket, author=author, body=body, attachments=files, _prevalidated=True)
    return ticket


@transaction.atomic
def post_message(
    *, ticket, author, body: str, attachments=(), _prevalidated=False
) -> TicketMessage:
    """Add a message to a thread and roll the ticket's timestamps forward."""
    if ticket.is_closed:
        raise ValidationError(
            {"detail": "This ticket is closed. Re-open it before sending another message."}
        )

    files = list(attachments or [])
    if not _prevalidated:
        files = validate_attachments(files, kind=ticket.kind)

    message = TicketMessage.objects.create(
        ticket=ticket,
        author=author,
        author_role=author.role,
        body=body,
    )

    for uploaded in files:
        Attachment.objects.create(
            message=message,
            file=uploaded,
            original_name=(uploaded.name or "")[:255],
            content_type=getattr(uploaded, "content_type", "") or "",
            size_bytes=uploaded.size,
        )

    ticket.register_message(message)

    # Every message, in either direction, notifies the customer on all channels.
    # Handed to a worker thread once this transaction commits.
    queue_ticket_message(message)

    return message


def reopen_window_closes_at(ticket):
    """When re-opening stops being allowed, or None while the order is in flight."""
    delivered_at = ticket.order.delivered_at
    if delivered_at is None:
        return None
    return delivered_at + timedelta(days=settings.TICKET_REOPEN_WINDOW_DAYS)


def can_reopen(ticket, *, now=None) -> tuple[bool, str]:
    """A closed ticket re-opens only within the window after delivery.

    An order that has not been delivered yet is still in flight, so there is no
    window to run out -- re-opening stays available.
    """
    if not ticket.is_closed:
        return False, "This ticket is already open."

    deadline = reopen_window_closes_at(ticket)
    if deadline is None:
        return True, ""

    now = now or timezone.now()
    if now > deadline:
        days = settings.TICKET_REOPEN_WINDOW_DAYS
        return False, (
            f"This ticket can no longer be re-opened. Orders can be revisited for "
            f"{days} days after delivery."
        )
    return True, ""


@transaction.atomic
def reopen_ticket(ticket, *, now=None) -> Ticket:
    allowed, reason = can_reopen(ticket, now=now)
    if not allowed:
        raise ValidationError({"detail": reason})

    ticket.status = TicketStatus.OPEN
    ticket.reopened_at = now or timezone.now()
    ticket.closed_at = None
    ticket.save(update_fields=["status", "reopened_at", "closed_at", "updated_at"])
    return ticket


def close_ticket(ticket) -> Ticket:
    if ticket.is_closed:
        raise ValidationError({"detail": "This ticket is already closed."})
    ticket.close()
    return ticket


def sla_level(ticket, *, now=None) -> str:
    """Grade how long the customer has been waiting for a reply."""
    waiting_since = ticket.awaiting_reply_since
    if waiting_since is None:
        return SlaLevel.ANSWERED

    waited = (now or timezone.now()) - waiting_since
    hours = waited.total_seconds() / 3600

    # The critical band has to be tested first, or everything over 72 hours
    # would report as merely a warning.
    if hours >= settings.TICKET_SLA_CRITICAL_HOURS:
        return SlaLevel.CRITICAL
    if hours >= settings.TICKET_SLA_WARNING_HOURS:
        return SlaLevel.WARNING
    return SlaLevel.WAITING
