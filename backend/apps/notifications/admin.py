from django.contrib import admin

from .models import NotificationLog


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    """A record of what was sent, so nothing here is editable."""

    list_display = ["created_at", "channel", "recipient", "subject", "status", "ticket"]
    list_filter = ["channel", "status", "created_at"]
    search_fields = ["recipient", "subject", "body"]
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def get_readonly_fields(self, request, obj=None):
        return [field.name for field in self.model._meta.fields]
