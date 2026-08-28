"""The form a customer gets depends on the order's status, and the server enforces it."""

import pytest

from apps.orders.models import OrderStatus
from apps.orders.tests.factories import OrderFactory
from apps.tickets.models import TicketKind
from conftest import image_upload

pytestmark = pytest.mark.django_db


def open_ticket(client, order, **overrides):
    payload = {
        "order": order.id,
        "subject": "Something needs attention",
        "body": "Here are the details of what went wrong.",
    }
    payload.update(overrides)
    return client.post("/api/tickets", payload, format="multipart")


def test_delivered_order_opens_a_delivery_issue(as_customer, delivered_order):
    response = open_ticket(as_customer, delivered_order)

    assert response.status_code == 201
    assert response.data["kind"] == TicketKind.DELIVERY_ISSUE


def test_shipped_order_opens_a_shipment_request_and_exposes_the_driver(as_customer, shipped_order):
    response = open_ticket(as_customer, shipped_order)

    assert response.status_code == 201
    assert response.data["kind"] == TicketKind.SHIPMENT_REQUEST
    assert response.data["driver"]["full_name"] == shipped_order.driver.full_name


@pytest.mark.parametrize(
    "status",
    [OrderStatus.AWAITING_PAYMENT, OrderStatus.PAID, OrderStatus.IN_PREPARATION],
)
def test_other_statuses_open_a_general_ticket(as_customer, customer, status):
    order = OrderFactory(customer=customer, status=status)

    response = open_ticket(as_customer, order)

    assert response.status_code == 201
    assert response.data["kind"] == TicketKind.GENERAL


def test_photos_are_accepted_on_a_delivered_order(as_customer, delivered_order):
    response = open_ticket(as_customer, delivered_order, attachments=image_upload())

    assert response.status_code == 201
    assert len(response.data["messages"][0]["attachments"]) == 1


@pytest.mark.parametrize("trait", ["paid", "shipped"])
def test_photos_are_rejected_when_the_order_is_not_delivered(as_customer, customer, trait):
    order = OrderFactory(customer=customer, **({"shipped": True} if trait == "shipped" else {}))

    response = open_ticket(as_customer, order, attachments=image_upload())

    assert response.status_code == 400
    assert "delivered order" in str(response.data["fields"]["attachments"])


def test_an_order_accepts_only_one_ticket(as_customer, delivered_order):
    first = open_ticket(as_customer, delivered_order)

    duplicate = open_ticket(as_customer, delivered_order)

    assert duplicate.status_code == 409
    assert duplicate.data["code"] == "ticket_exists"
    # The client needs the existing id so it can send the customer to that thread.
    assert duplicate.data["ticket_id"] == first.data["id"]


def test_a_customer_cannot_open_a_ticket_on_someone_elses_order(as_customer, other_customer):
    order = OrderFactory(customer=other_customer, delivered=True)

    response = open_ticket(as_customer, order)

    assert response.status_code == 400
    assert "your own order" in str(response.data["fields"]["order"])
