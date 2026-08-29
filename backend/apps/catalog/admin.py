from django.contrib import admin
from django.utils.html import format_html

from .models import Category, Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["thumbnail", "name", "category", "price", "is_active"]
    list_display_links = ["name"]
    list_filter = ["category", "is_active"]
    search_fields = ["name", "description"]
    prepopulated_fields = {"slug": ("name",)}

    @admin.display(description="")
    def thumbnail(self, product):
        if not product.image:
            return "--"
        return format_html(
            '<img src="{}" style="height:40px;width:40px;object-fit:cover;border-radius:4px">',
            product.image.url,
        )


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}
