from decimal import Decimal

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class OrderStatus(models.TextChoices):
    AWAITING_PAYMENT = "AWAITING_PAYMENT", "Awaiting payment"
    PAID = "PAID", "Paid"
    IN_PREPARATION = "IN_PREPARATION", "In preparation"
    SHIPPED = "SHIPPED", "Shipped"
    DELIVERED = "DELIVERED", "Delivered"


class Driver(TimeStampedModel):
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=32)
    vehicle_plate = models.CharField(max_length=20)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return f"{self.full_name} ({self.vehicle_plate})"


class Order(TimeStampedModel):
    number = models.CharField(max_length=20, unique=True, blank=True)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders"
    )
    status = models.CharField(
        max_length=20, choices=OrderStatus.choices, default=OrderStatus.AWAITING_PAYMENT
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))

    placed_at = models.DateTimeField()
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    # Set once the order leaves the shop; drives the shipment ticket form.
    driver = models.ForeignKey(
        Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders"
    )
    tracking_code = models.CharField(max_length=40, blank=True)

    class Meta:
        ordering = ["-placed_at"]
        indexes = [models.Index(fields=["customer", "-placed_at"])]

    def __str__(self):
        return self.number or f"Order {self.pk}"

    def save(self, *args, **kwargs):
        creating = self._state.adding
        super().save(*args, **kwargs)
        # The human-facing number embeds the primary key, so it is unique
        # without a separate counter to keep in step.
        if creating and not self.number:
            self.number = f"GG-{self.placed_at.year}-{self.pk:04d}"
            super().save(update_fields=["number"])

    @property
    def is_delivered(self) -> bool:
        return self.status == OrderStatus.DELIVERED

    @property
    def is_shipped(self) -> bool:
        return self.status == OrderStatus.SHIPPED

    def recalculate_total(self) -> Decimal:
        total = sum((item.line_total for item in self.items.all()), Decimal("0.00"))
        self.total_amount = total
        self.save(update_fields=["total_amount"])
        return total


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("catalog.Product", on_delete=models.PROTECT, related_name="+")
    quantity = models.PositiveIntegerField(default=1)
    # Copied at purchase time so later price changes do not rewrite order history.
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"

    @property
    def line_total(self) -> Decimal:
        return self.unit_price * self.quantity
