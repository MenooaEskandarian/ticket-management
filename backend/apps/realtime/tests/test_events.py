"""Ticket activity is announced on both the ticket channel and the agent queue."""

import pytest
import redis

from apps.realtime import events
from apps.realtime.events import QUEUE_CHANNEL, ticket_channel
from apps.tickets.services import close_ticket, post_message
from apps.tickets.tests.factories import TicketFactory

pytestmark = pytest.mark.django_db


def test_a_message_is_announced_after_the_transaction_commits(
    customer, realtime_bus, django_capture_on_commit_callbacks
):
    ticket = TicketFactory(order__customer=customer)

    with django_capture_on_commit_callbacks(execute=True):
        post_message(ticket=ticket, author=customer, body="Any news on this?")
        # A browser reacting to the event would refetch, so the event must not
        # go out before the write it is announcing has landed.
        assert realtime_bus == []

    channels = [channel for channel, _ in realtime_bus]
    assert ticket_channel(ticket.pk) in channels
    assert QUEUE_CHANNEL in channels


def test_the_payload_says_what_happened(
    customer, realtime_bus, django_capture_on_commit_callbacks
):
    ticket = TicketFactory(order__customer=customer)

    with django_capture_on_commit_callbacks(execute=True):
        message = post_message(ticket=ticket, author=customer, body="A question for you.")

    _, payload = realtime_bus[0]
    assert payload["event"] == "message.posted"
    assert payload["ticket_id"] == ticket.pk
    assert payload["message_id"] == message.pk


def test_closing_a_ticket_is_announced(
    customer, realtime_bus, django_capture_on_commit_callbacks
):
    ticket = TicketFactory(order__customer=customer)

    with django_capture_on_commit_callbacks(execute=True):
        close_ticket(ticket)

    assert [payload["event"] for _, payload in realtime_bus] == [
        "ticket.closed",
        "ticket.closed",
    ]


def test_a_broker_outage_never_breaks_the_request(
    monkeypatch, customer, caplog, django_capture_on_commit_callbacks
):
    """Live updates sit on top of the app; they must not be able to sink it."""

    class BrokenClient:
        def publish(self, *_args):
            raise redis.ConnectionError("no route to redis")

    monkeypatch.setattr(events, "get_client", lambda: BrokenClient())
    ticket = TicketFactory(order__customer=customer)

    with django_capture_on_commit_callbacks(execute=True):
        close_ticket(ticket)

    ticket.refresh_from_db()
    assert ticket.status == "CLOSED"
    assert "Realtime publish" in caplog.text
