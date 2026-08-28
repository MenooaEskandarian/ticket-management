from datetime import timedelta

import factory
from django.utils import timezone

from apps.accounts.tests.factories import UserFactory
from apps.catalog.tests.factories import ProductFactory
from apps.orders.models import Driver, Order, OrderItem, OrderStatus


class DriverFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Driver

    full_name = factory.Faker("name")
    phone = factory.Sequence(lambda n: f"+44 7700 8{n:05d}")
    vehicle_plate = factory.Sequence(lambda n: f"GX{n:02d} KLM")


class OrderFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Order

    class Params:
        # Shorthands for the two statuses that change what the ticket form does.
        shipped = factory.Trait(
            status=OrderStatus.SHIPPED,
            shipped_at=factory.LazyFunction(lambda: timezone.now() - timedelta(days=1)),
            driver=factory.SubFactory(DriverFactory),
            tracking_code="GG12345678",
        )
        delivered = factory.Trait(
            status=OrderStatus.DELIVERED,
            shipped_at=factory.LazyFunction(lambda: timezone.now() - timedelta(days=4)),
            delivered_at=factory.LazyFunction(lambda: timezone.now() - timedelta(days=2)),
            driver=factory.SubFactory(DriverFactory),
            tracking_code="GG87654321",
        )

    customer = factory.SubFactory(UserFactory)
    status = OrderStatus.PAID
    placed_at = factory.LazyFunction(lambda: timezone.now() - timedelta(days=6))
    total_amount = "42.00"


class OrderItemFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = OrderItem

    order = factory.SubFactory(OrderFactory)
    product = factory.SubFactory(ProductFactory)
    quantity = 1
    unit_price = "42.00"
