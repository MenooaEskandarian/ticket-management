"""Upload limits: images only, small, and genuinely decodable."""

import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.tickets.validators import validate_image_upload
from conftest import image_upload

pytestmark = pytest.mark.django_db


def test_a_real_jpeg_passes():
    assert validate_image_upload(image_upload()) is not None


def test_a_real_png_passes():
    assert validate_image_upload(image_upload("leaf.png", "PNG", "image/png")) is not None


def test_a_text_file_declaring_itself_an_image_is_rejected():
    # The content type is client-supplied, so the decode is what actually protects us.
    disguised = SimpleUploadedFile("payload.jpg", b"#!/bin/sh\nrm -rf /", content_type="image/jpeg")

    with pytest.raises(ValidationError, match="not a readable image"):
        validate_image_upload(disguised)


def test_an_unsupported_extension_is_rejected():
    with pytest.raises(ValidationError, match="Unsupported file type"):
        validate_image_upload(image_upload("notes.pdf", content_type="application/pdf"))


def test_a_file_over_the_size_limit_is_rejected(settings):
    settings.MAX_UPLOAD_SIZE_BYTES = 1024
    oversized = SimpleUploadedFile("big.jpg", b"x" * 2048, content_type="image/jpeg")

    with pytest.raises(ValidationError, match="or smaller"):
        validate_image_upload(oversized)


def test_too_many_attachments_are_rejected(as_customer, delivered_order, settings):
    settings.MAX_ATTACHMENTS_PER_MESSAGE = 2

    response = as_customer.post(
        "/api/tickets",
        {
            "order": delivered_order.id,
            "subject": "Damaged bouquet",
            "body": "Photographs of the damage are attached.",
            "attachments": [image_upload(f"p{i}.jpg") for i in range(3)],
        },
        format="multipart",
    )

    assert response.status_code == 400
    assert "at most 2" in str(response.data["fields"]["attachments"])
