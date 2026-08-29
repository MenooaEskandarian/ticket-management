"""Stream tokens, and who is allowed to subscribe to what."""

import pytest

from apps.realtime import tokens
from apps.tickets.tests.factories import TicketFactory

pytestmark = pytest.mark.django_db


def test_an_agent_can_mint_a_stream_token(as_agent):
    response = as_agent.post("/api/realtime/token")

    assert response.status_code == 200
    assert response.data["token"]
    assert response.data["expires_in"] == 60


def test_a_stream_token_cannot_be_minted_anonymously(api):
    assert api.post("/api/realtime/token").status_code == 401


def test_a_token_resolves_back_to_the_user_who_asked_for_it(customer, realtime_bus):
    token, _ttl = tokens.issue(customer)

    assert tokens.user_id_for(token) == customer.pk


def test_an_unknown_token_resolves_to_nobody(realtime_bus):
    assert tokens.user_id_for("not-a-real-token") is None
    assert tokens.user_id_for("") is None


def test_streaming_without_a_token_is_refused(client, customer):
    ticket = TicketFactory(order__customer=customer)

    response = client.get(f"/api/realtime/tickets/{ticket.pk}", SERVER_NAME="localhost")

    assert response.status_code == 401


def test_a_customer_cannot_stream_another_customers_ticket(
    client, customer, other_customer, realtime_bus
):
    theirs = TicketFactory(order__customer=other_customer)
    token, _ = tokens.issue(customer)

    response = client.get(
        f"/api/realtime/tickets/{theirs.pk}?token={token}", SERVER_NAME="localhost"
    )

    assert response.status_code == 403


def test_a_customer_cannot_stream_the_agent_queue(client, customer, realtime_bus):
    token, _ = tokens.issue(customer)

    response = client.get(f"/api/realtime/queue?token={token}", SERVER_NAME="localhost")

    assert response.status_code == 403
