"""Shared fixtures. Factories live next to the app they build objects for."""

from io import BytesIO

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.tests.factories import SupportUserFactory, UserFactory
from apps.notifications.channels import reset_channels
from apps.orders.tests.factories import OrderFactory


def image_upload(name="photo.jpg", fmt="JPEG", content_type="image/jpeg", size=(60, 60)):
    """A genuine, tiny image suitable for an upload field."""
    buffer = BytesIO()
    Image.new("RGB", size, (200, 120, 140)).save(buffer, format=fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=content_type)


@pytest.fixture(autouse=True)
def notification_sink(settings, tmp_path):
    """Keep every test's CSV output in its own temporary directory.

    Delivery is also forced inline: on a worker thread it would land after the
    assertions, and outside the test's transaction.
    """
    settings.NOTIFICATIONS_CSV_DIR = tmp_path / "notifications"
    settings.NOTIFICATIONS_SYNC = True
    reset_channels()
    yield settings.NOTIFICATIONS_CSV_DIR
    reset_channels()


@pytest.fixture
def customer(db):
    return UserFactory()


@pytest.fixture
def other_customer(db):
    return UserFactory()


@pytest.fixture
def agent(db):
    return SupportUserFactory()


@pytest.fixture
def api():
    return APIClient()


def authenticated_client(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def as_customer(customer):
    # Each role gets its own client so a test can use both at once.
    return authenticated_client(customer)


@pytest.fixture
def as_agent(agent):
    return authenticated_client(agent)


@pytest.fixture
def delivered_order(customer):
    return OrderFactory(customer=customer, delivered=True)


@pytest.fixture
def shipped_order(customer):
    return OrderFactory(customer=customer, shipped=True)


@pytest.fixture
def paid_order(customer):
    return OrderFactory(customer=customer)
