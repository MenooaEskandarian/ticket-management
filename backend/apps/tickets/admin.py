from django.contrib import admin
from django.utils.html import format_html

from .models import Attachment, Ticket, TicketMessage
from .services import sla_level


class TicketMessageInline(admin.TabularInline):
    model = TicketMessage
    extra = 0
    fields = ["author", "author_role", "body", "created_at"]
    readonly_fields = ["created_at"]


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    """Tickets, with the whole thread on one page.

    Deleting a ticket releases its order: an order may only carry one, so
    removing it is how an order becomes available to open a fresh ticket
    against.
    """

    list_display = [
        "id",
        "subject",
        "order",
        "customer_name",
        "kind",
        "status",
        "response_age",
        "created_at",
    ]
    list_display_links = ["id", "subject"]
    list_filter = ["status", "kind", "created_at", "order__status"]
    search_fields = ["subject", "order__number", "order__customer__full_name"]
    autocomplete_fields = ["order"]
    date_hierarchy = "created_at"
    inlines = [TicketMessageInline]

    readonly_fields = [
        "created_at",
        "updated_at",
        "last_message_at",
        "last_customer_message_at",
        "last_staff_message_at",
    ]
    fieldsets = (
        (None, {"fields": ("order", "subject", "kind", "status")}),
        ("Lifecycle", {"fields": ("closed_at", "reopened_at", "created_at", "updated_at")}),
        (
            "Response tracking",
            {
                "classes": ("collapse",),
                "fields": (
                    "last_message_at",
                    "last_customer_message_at",
                    "last_staff_message_at",
                ),
            },
        ),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("order", "order__customer")

    @admin.display(description="Customer", ordering="order__customer__full_name")
    def customer_name(self, ticket):
        return ticket.order.customer.full_name

    @admin.display(description="Response")
    def response_age(self, ticket):
        level = sla_level(ticket)
        colour = {
            "ANSWERED": "#2f6b46",
            "WAITING": "#5a6b7a",
            "WARNING": "#a5701a",
            "CRITICAL": "#a32b1e",
        }[level]
        return format_html('<b style="color:{}">{}</b>', colour, level.title())


@admin.register(TicketMessage)
class TicketMessageAdmin(admin.ModelAdmin):
    list_display = ["id", "ticket", "author", "author_role", "created_at"]
    list_filter = ["author_role", "created_at"]
    search_fields = ["body", "ticket__subject"]
    autocomplete_fields = ["ticket"]
    readonly_fields = ["created_at"]


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ["id", "original_name", "message", "content_type", "size_bytes", "uploaded_at"]
    list_filter = ["content_type", "uploaded_at"]
    search_fields = ["original_name"]
    readonly_fields = ["uploaded_at", "preview"]

    @admin.display(description="Preview")
    def preview(self, attachment):
        if not attachment.file:
            return "--"
        return format_html('<img src="{}" style="max-height:240px">', attachment.file.url)
