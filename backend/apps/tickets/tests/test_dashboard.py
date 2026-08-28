"""Agent dashboard: scoping, ordering and the delivered-orders toggle."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.orders.tests.factories import OrderFactory
from apps.tickets.tests.factories import TicketFactory

pytestmark = pytest.mark.django_db


def test_a_customer_sees_only_their_own_tickets(as_customer, customer, other_customer):
    mine = TicketFactory(order__customer=customer)
    TicketFactory(order__customer=other_customer)

    response = as_customer.get("/api/tickets")

    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == mine.id


def test_a_customer_cannot_read_another_customers_ticket(as_customer, other_customer):
    theirs = TicketFactory(order__customer=other_customer)

    assert as_customer.get(f"/api/tickets/{theirs.id}").status_code == 404


def test_an_agent_sees_every_ticket(as_agent, customer, other_customer):
    TicketFactory(order__customer=customer)
    TicketFactory(order__customer=other_customer)

    assert as_agent.get("/api/tickets").data["count"] == 2


def test_tickets_are_listed_newest_first(as_agent, customer):
    older = TicketFactory(order__customer=customer)
    newer = TicketFactory(order__customer=customer)
    older.created_at = timezone.now() - timedelta(days=3)
    older.save(update_fields=["created_at"])

    ids = [row["id"] for row in as_agent.get("/api/tickets").data["results"]]

    assert ids == [newer.id, older.id]


def test_the_delivered_toggle_narrows_the_list(as_agent, customer):
    delivered = TicketFactory(order=OrderFactory(customer=customer, delivered=True))
    TicketFactory(order=OrderFactory(customer=customer, shipped=True))

    response = as_agent.get("/api/tickets?delivered_only=true")

    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == delivered.id


def test_the_delivered_toggle_off_returns_everything(as_agent, customer):
    TicketFactory(order=OrderFactory(customer=customer, delivered=True))
    TicketFactory(order=OrderFactory(customer=customer, shipped=True))

    assert as_agent.get("/api/tickets?delivered_only=false").data["count"] == 2


def test_tickets_can_be_sorted_by_last_message(as_agent, customer):
    now = timezone.now()
    quiet = TicketFactory(order__customer=customer, last_message_at=now - timedelta(days=2))
    busy = TicketFactory(order__customer=customer, last_message_at=now)

    ids = [r["id"] for r in as_agent.get("/api/tickets?ordering=-last_message_at").data["results"]]

    assert ids == [busy.id, quiet.id]


def test_agents_can_search_by_order_number(as_agent, customer):
    wanted = TicketFactory(order__customer=customer)
    TicketFactory(order__customer=customer)

    response = as_agent.get(f"/api/tickets?search={wanted.order.number}")

    assert [r["id"] for r in response.data["results"]] == [wanted.id]


def test_the_order_picker_excludes_orders_that_already_have_a_ticket(as_customer, customer):
    used = OrderFactory(customer=customer, delivered=True)
    free = OrderFactory(customer=customer, delivered=True)
    TicketFactory(order=used)

    response = as_customer.get("/api/orders?ticketable=true")

    assert [row["id"] for row in response.data["results"]] == [free.id]
