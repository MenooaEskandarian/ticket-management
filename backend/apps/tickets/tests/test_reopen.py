"""Re-opening is limited to a window that starts when the order is delivered."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.orders.tests.factories import OrderFactory
from apps.tickets.models import TicketStatus
from apps.tickets.services import close_ticket
from apps.tickets.tests.factories import TicketFactory

pytestmark = pytest.mark.django_db


def test_a_closed_ticket_reopens_inside_the_window(as_customer, delivered_order):
    ticket = TicketFactory(order=delivered_order)
    close_ticket(ticket)

    response = as_customer.post(f"/api/tickets/{ticket.id}/reopen")

    assert response.status_code == 200
    assert response.data["status"] == TicketStatus.OPEN
    assert response.data["reopened_at"] is not None


def test_a_closed_ticket_will_not_reopen_after_the_window(as_customer, customer, settings):
    order = OrderFactory(customer=customer, delivered=True)
    order.delivered_at = timezone.now() - timedelta(days=settings.TICKET_REOPEN_WINDOW_DAYS + 1)
    order.save(update_fields=["delivered_at"])
    ticket = TicketFactory(order=order)
    close_ticket(ticket)

    response = as_customer.post(f"/api/tickets/{ticket.id}/reopen")

    assert response.status_code == 400
    assert "no longer be re-opened" in response.data["detail"]


def test_an_undelivered_order_can_always_be_reopened(as_customer, paid_order):
    # Nothing has been delivered, so the window has not started counting.
    ticket = TicketFactory(order=paid_order)
    close_ticket(ticket)

    response = as_customer.post(f"/api/tickets/{ticket.id}/reopen")

    assert response.status_code == 200
    assert response.data["status"] == TicketStatus.OPEN


def test_an_open_ticket_cannot_be_reopened(as_customer, delivered_order):
    ticket = TicketFactory(order=delivered_order)

    response = as_customer.post(f"/api/tickets/{ticket.id}/reopen")

    assert response.status_code == 400
    assert "already open" in response.data["detail"]


def test_a_closed_ticket_refuses_new_messages(as_customer, delivered_order):
    ticket = TicketFactory(order=delivered_order)
    close_ticket(ticket)

    response = as_customer.post(f"/api/tickets/{ticket.id}/messages", {"body": "One more thing."})

    assert response.status_code == 400
    assert "closed" in response.data["detail"]


def test_the_detail_view_reports_whether_reopening_is_available(as_customer, delivered_order):
    ticket = TicketFactory(order=delivered_order)
    close_ticket(ticket)

    response = as_customer.get(f"/api/tickets/{ticket.id}")

    assert response.data["can_reopen"] is True
    assert response.data["reopen_deadline"] is not None
