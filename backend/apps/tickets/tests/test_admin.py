"""Removing a ticket in the admin releases its order for a fresh one."""

import pytest
from django.urls import reverse

from apps.accounts.models import UserRole
from apps.accounts.tests.factories import UserFactory
from apps.orders.tests.factories import OrderFactory
from apps.tickets.models import Ticket
from apps.tickets.tests.factories import TicketFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def admin_client_(client):
    staff = UserFactory(role=UserRole.SUPPORT, is_staff=True, is_superuser=True)
    client.force_login(staff)
    return client


def test_deleting_a_ticket_frees_its_order(admin_client_, customer):
    order = OrderFactory(customer=customer, delivered=True)
    ticket = TicketFactory(order=order)

    response = admin_client_.post(
        reverse("admin:tickets_ticket_delete", args=[ticket.pk]),
        {"post": "yes"},
        SERVER_NAME="localhost",
    )

    assert response.status_code == 302
    assert not Ticket.objects.filter(pk=ticket.pk).exists()
    # The order survives, and now has no ticket standing in the way of a new one.
    order.refresh_from_db()
    assert not hasattr(order, "ticket")


def test_a_freed_order_accepts_a_new_ticket(admin_client_, as_customer, customer):
    order = OrderFactory(customer=customer, delivered=True)
    ticket = TicketFactory(order=order)

    admin_client_.post(
        reverse("admin:tickets_ticket_delete", args=[ticket.pk]),
        {"post": "yes"},
        SERVER_NAME="localhost",
    )
    response = as_customer.post(
        "/api/tickets",
        {
            "order": order.id,
            "subject": "Opening this again from scratch",
            "body": "The previous ticket was removed, so this one should be allowed.",
        },
        format="multipart",
    )

    assert response.status_code == 201


def test_the_ticket_list_page_loads(admin_client_, customer):
    TicketFactory(order__customer=customer)

    response = admin_client_.get(reverse("admin:tickets_ticket_changelist"), SERVER_NAME="localhost")

    assert response.status_code == 200


def test_the_order_list_shows_which_orders_are_free(admin_client_, customer):
    OrderFactory(customer=customer, delivered=True)

    response = admin_client_.get(reverse("admin:orders_order_changelist"), SERVER_NAME="localhost")

    assert response.status_code == 200
    assert b"free to open" in response.content


def test_the_notification_log_cannot_be_edited(admin_client_):
    response = admin_client_.get(
        reverse("admin:notifications_notificationlog_changelist"), SERVER_NAME="localhost"
    )

    assert response.status_code == 200
    # Read-only: the admin offers no way to create a delivery record by hand.
    assert b"Add notification log" not in response.content
