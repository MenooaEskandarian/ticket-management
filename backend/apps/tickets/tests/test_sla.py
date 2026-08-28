"""Response-age banding and unanswered counts behind the dashboard colours."""

from datetime import timedelta

import pytest
from django.utils import timezone

from apps.accounts.models import UserRole
from apps.tickets.services import SlaLevel, sla_level
from apps.tickets.tests.factories import TicketFactory, TicketMessageFactory

pytestmark = pytest.mark.django_db


def waiting_ticket(hours, **kwargs):
    """A ticket whose customer has been waiting `hours` for a reply."""
    now = timezone.now()
    return TicketFactory(
        last_customer_message_at=now - timedelta(hours=hours),
        last_message_at=now - timedelta(hours=hours),
        **kwargs,
    )


def test_a_ticket_with_no_messages_reads_as_answered():
    assert sla_level(TicketFactory()) == SlaLevel.ANSWERED


def test_a_staff_reply_after_the_customer_reads_as_answered():
    now = timezone.now()
    ticket = TicketFactory(
        last_customer_message_at=now - timedelta(hours=90),
        last_staff_message_at=now - timedelta(hours=1),
    )

    assert sla_level(ticket) == SlaLevel.ANSWERED


def test_a_fresh_unanswered_message_is_only_waiting():
    assert sla_level(waiting_ticket(2)) == SlaLevel.WAITING


def test_waiting_past_twenty_four_hours_is_a_warning():
    assert sla_level(waiting_ticket(25)) == SlaLevel.WARNING


def test_waiting_past_seventy_two_hours_is_critical():
    assert sla_level(waiting_ticket(73)) == SlaLevel.CRITICAL


def test_the_critical_band_wins_at_the_boundary(settings):
    # Exactly on 72h must not fall through to the warning band.
    assert sla_level(waiting_ticket(settings.TICKET_SLA_CRITICAL_HOURS)) == SlaLevel.CRITICAL


def test_the_warning_band_starts_exactly_on_the_threshold(settings):
    assert sla_level(waiting_ticket(settings.TICKET_SLA_WARNING_HOURS)) == SlaLevel.WARNING


def test_unanswered_count_only_counts_customer_messages_since_the_last_reply(
    as_agent, customer, agent
):
    ticket = TicketFactory(order__customer=customer)
    TicketMessageFactory(ticket=ticket, author=customer)
    TicketMessageFactory(ticket=ticket, author=agent, author_role=UserRole.SUPPORT)
    ticket.last_staff_message_at = timezone.now()
    ticket.save(update_fields=["last_staff_message_at"])
    TicketMessageFactory(ticket=ticket, author=customer)
    TicketMessageFactory(ticket=ticket, author=customer)

    row = next(t for t in as_agent.get("/api/tickets").data["results"] if t["id"] == ticket.id)

    assert row["unanswered_count"] == 2
    assert row["message_count"] == 4
