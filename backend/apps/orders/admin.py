from django.contrib import admin
from django.utils.html import format_html

from .models import Driver, Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    autocomplete_fields = ["product"]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """Orders, with status editable.

    Moving an order between statuses is the quickest way to exercise the three
    ticket forms without reseeding the database.
    """

    list_display = ["number", "customer", "status", "placed_at", "total_amount", "ticket_link"]
    list_filter = ["status", "placed_at"]
    search_fields = ["number", "customer__full_name", "customer__email"]
    autocomplete_fields = ["customer", "driver"]
    date_hierarchy = "placed_at"
    inlines = [OrderItemInline]
    readonly_fields = ["number", "created_at", "updated_at"]

    fieldsets = (
        (None, {"fields": ("number", "customer", "status", "total_amount")}),
        ("Delivery", {"fields": ("driver", "tracking_code", "shipped_at", "delivered_at")}),
        ("Timestamps", {"fields": ("placed_at", "created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("customer", "ticket")

    @admin.display(description="Ticket")
    def ticket_link(self, order):
        ticket = getattr(order, "ticket", None)
        if ticket is None:
            return format_html('<span style="color:#7a7a7a">{}</span>', "none — free to open")
        return format_html(
            '<a href="/django-admin/tickets/ticket/{}/change/">#{}</a>', ticket.pk, ticket.pk
        )


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ["full_name", "phone", "vehicle_plate"]
    search_fields = ["full_name", "vehicle_plate"]
