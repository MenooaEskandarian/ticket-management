"""Delivery is handed to a worker thread only after the transaction commits."""

import threading

import pytest

from apps.notifications import dispatch
from apps.notifications.models import NotificationLog
from apps.tickets.services import post_message
from apps.tickets.tests.factories import TicketFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def scheduled(monkeypatch):
    """Record what would be handed to the pool, without starting a thread."""
    calls = []

    class RecordingPool:
        def submit(self, _fn, *args):
            calls.append(args)

    monkeypatch.setattr(dispatch, "get_pool", lambda: RecordingPool())
    return calls


def test_nothing_is_scheduled_until_the_transaction_commits(
    settings, customer, scheduled, django_capture_on_commit_callbacks
):
    settings.NOTIFICATIONS_SYNC = False
    ticket = TicketFactory(order__customer=customer)

    with django_capture_on_commit_callbacks(execute=True):
        message = post_message(ticket=ticket, author=customer, body="Any news on this?")
        # Still inside the block: the message row exists, but a worker starting
        # now would not be able to see it, so nothing may be queued yet.
        assert scheduled == []

    assert scheduled == [(message.pk,)]


def test_posting_a_message_does_not_wait_for_delivery(
    settings, as_customer, customer, scheduled, django_capture_on_commit_callbacks
):
    settings.NOTIFICATIONS_SYNC = False
    ticket = TicketFactory(order__customer=customer)

    with django_capture_on_commit_callbacks(execute=True):
        response = as_customer.post(f"/api/tickets/{ticket.id}/messages", {"body": "A question."})
        # The customer has their 201 before any channel has been touched.
        assert response.status_code == 201
        assert NotificationLog.objects.count() == 0

    assert len(scheduled) == 1


def test_a_missing_message_is_logged_rather_than_raising(caplog):
    # A rolled-back message can still leave a task queued, and a worker thread
    # has nowhere to raise, so it has to absorb this.
    dispatch._deliver(999_999)

    assert "no longer exists" in caplog.text


def test_delivery_failure_does_not_escape_the_worker(monkeypatch, customer, caplog):
    ticket = TicketFactory(order__customer=customer)
    message = post_message(ticket=ticket, author=customer, body="Posting a question.")
    monkeypatch.setattr(
        dispatch,
        "notify_ticket_message",
        lambda _message: (_ for _ in ()).throw(RuntimeError("gateway unavailable")),
    )

    dispatch._deliver(message.pk)

    assert "Notification delivery failed" in caplog.text


def test_the_pool_is_built_once(settings):
    dispatch._pool = None

    first = dispatch.get_pool()
    second = dispatch.get_pool()

    assert first is second
    assert first._max_workers == settings.NOTIFICATION_WORKERS


@pytest.mark.django_db(transaction=True)
def test_a_worker_thread_delivers_on_both_channels(settings):
    """The real path: a separate thread, on its own database connection.

    This needs committed data, hence the transactional database -- a worker
    cannot see rows still sitting in another connection's open transaction.
    """
    settings.NOTIFICATIONS_SYNC = True
    ticket = TicketFactory()
    message = post_message(
        ticket=ticket, author=ticket.order.customer, body="Checking the worker path."
    )
    NotificationLog.objects.all().delete()

    worker = threading.Thread(target=dispatch._deliver, args=(message.pk,))
    worker.start()
    worker.join(timeout=10)

    assert not worker.is_alive()
    assert NotificationLog.objects.count() == 2
