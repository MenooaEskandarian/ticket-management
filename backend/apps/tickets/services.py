"""Ticket business rules.

Everything the API is allowed to do to a ticket goes through here, so the rules
are testable on their own and the views stay thin.
"""

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import Attachment, TicketMessage
from .validators import validate_image_upload


def validate_attachments(files) -> list:
    """Check every uploaded file, reporting all problems at once."""
    files = list(files or [])
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
def post_message(*, ticket, author, body: str, attachments=()) -> TicketMessage:
    """Add a message to a thread and roll the ticket's timestamps forward."""
    files = validate_attachments(attachments)

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
    return message
