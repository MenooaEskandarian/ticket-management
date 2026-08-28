"""Every ticket message must reach the customer by email and SMS at once."""

import csv

import pytest

from apps.notifications.models import NotificationChannelName, NotificationLog
from apps.tickets.services import post_message
from apps.tickets.tests.factories import TicketFactory

pytestmark = pytest.mark.django_db


def test_a_customer_message_fires_both_channels(customer):
    ticket = TicketFactory(order__customer=customer)

    post_message(ticket=ticket, author=customer, body="Is my order on its way?")

    assert set(NotificationLog.objects.values_list("channel", flat=True)) == {
        NotificationChannelName.EMAIL,
        NotificationChannelName.SMS,
    }


def test_a_staff_reply_also_notifies_the_customer(customer, agent):
    ticket = TicketFactory(order__customer=customer)

    post_message(ticket=ticket, author=agent, body="It leaves the shop this afternoon.")

    assert NotificationLog.objects.count() == 2
    # Both notifications go to the customer, never back to the agent.
    assert set(NotificationLog.objects.values_list("recipient", flat=True)) == {
        customer.email,
        customer.phone,
    }


def test_each_channel_appends_a_csv_row(customer, notification_sink):
    ticket = TicketFactory(order__customer=customer)

    post_message(ticket=ticket, author=customer, body="Please deliver to the back door.")

    for filename in ("email.csv", "sms.csv"):
        with (notification_sink / filename).open(encoding="utf-8") as handle:
            rows = list(csv.DictReader(handle))
        assert len(rows) == 1
        assert rows[0]["recipient"] in {customer.email, customer.phone}
        assert rows[0]["ticket_id"] == str(ticket.id)


def test_every_message_in_a_thread_is_notified(customer, agent):
    ticket = TicketFactory(order__customer=customer)

    post_message(ticket=ticket, author=customer, body="Any update on this?")
    post_message(ticket=ticket, author=agent, body="Looking into it now.")
    post_message(ticket=ticket, author=customer, body="Thank you very much.")

    assert NotificationLog.objects.count() == 6


def test_the_log_is_visible_to_agents_only(as_agent, as_customer, customer):
    post_message(
        ticket=TicketFactory(order__customer=customer), author=customer, body="A question."
    )

    assert as_agent.get("/api/notifications").data["count"] == 2
    assert as_customer.get("/api/notifications").status_code == 403
