"""Upload rules for ticket attachments: images only, and small enough to store."""

from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError

# Pillow's own name for each format we accept.
PILLOW_FORMATS = {"JPEG", "PNG", "WEBP"}


def validate_image_upload(uploaded_file):
    """Reject anything that is not a small, genuine image.

    The declared content type is checked, but it is client-supplied and easy to
    fake, so the file is also decoded with Pillow. A text file renamed to
    .jpg and posted as image/jpeg fails at that last step.
    """
    size = getattr(uploaded_file, "size", None)
    if size is not None and size > settings.MAX_UPLOAD_SIZE_BYTES:
        limit_mb = settings.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
        raise ValidationError(f"Each image must be {limit_mb:.0f} MB or smaller.")

    extension = Path(uploaded_file.name or "").suffix.lower()
    if extension not in settings.ALLOWED_UPLOAD_EXTENSIONS:
        allowed = ", ".join(settings.ALLOWED_UPLOAD_EXTENSIONS)
        raise ValidationError(f"Unsupported file type. Allowed extensions: {allowed}.")

    content_type = getattr(uploaded_file, "content_type", "")
    if content_type and content_type not in settings.ALLOWED_UPLOAD_CONTENT_TYPES:
        raise ValidationError(f"Unsupported file type: {content_type}.")

    try:
        uploaded_file.seek(0)
        image = Image.open(uploaded_file)
        image.verify()
        detected = (image.format or "").upper()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValidationError("This file is not a readable image.") from exc
    finally:
        uploaded_file.seek(0)

    if detected not in PILLOW_FORMATS:
        raise ValidationError(f"Unsupported image format: {detected or 'unknown'}.")

    return uploaded_file
