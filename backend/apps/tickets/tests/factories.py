import factory

from apps.accounts.models import UserRole
from apps.orders.tests.factories import OrderFactory
from apps.tickets.models import Ticket, TicketKind, TicketMessage


class TicketFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Ticket

    order = factory.SubFactory(OrderFactory)
    subject = factory.Sequence(lambda n: f"Ticket subject {n}")
    kind = TicketKind.GENERAL


class TicketMessageFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TicketMessage

    ticket = factory.SubFactory(TicketFactory)
    author = factory.SelfAttribute("ticket.order.customer")
    author_role = UserRole.CUSTOMER
    body = "Could you take a look at this please?"
