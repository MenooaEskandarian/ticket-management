"""Sign-in, role reporting and the last-seen stamp."""

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import UserRole

pytestmark = pytest.mark.django_db

PASSWORD = "test-password-123"


def test_login_returns_tokens_and_the_signed_in_user(api, customer):
    response = api.post(
        "/api/auth/login", {"email": customer.email, "password": PASSWORD}, format="json"
    )

    assert response.status_code == 200
    assert {"access", "refresh", "user"} <= set(response.data)
    assert response.data["user"]["role"] == UserRole.CUSTOMER


def test_login_rejects_a_wrong_password(api, customer):
    response = api.post(
        "/api/auth/login", {"email": customer.email, "password": "not-it"}, format="json"
    )

    assert response.status_code == 401


def test_the_profile_endpoint_needs_authentication(api):
    response = api.get("/api/auth/me")

    assert response.status_code == 401
    assert response.data["code"] == "not_authenticated"


def test_the_profile_endpoint_returns_the_current_user(as_agent, agent):
    response = as_agent.get("/api/auth/me")

    assert response.status_code == 200
    assert response.data["email"] == agent.email
    assert response.data["role"] == UserRole.SUPPORT


def test_activity_stamps_the_last_seen_time(api, customer):
    assert customer.last_seen_at is None
    tokens = api.post(
        "/api/auth/login", {"email": customer.email, "password": PASSWORD}, format="json"
    ).data

    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    client.get("/api/auth/me")

    customer.refresh_from_db()
    assert customer.last_seen_at is not None
    assert (timezone.now() - customer.last_seen_at).total_seconds() < 30
