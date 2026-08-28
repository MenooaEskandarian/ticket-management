from rest_framework import serializers

from apps.catalog.serializers import ProductSerializer

from .models import Driver, Order, OrderItem


class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = ["id", "full_name", "phone", "vehicle_plate"]
        read_only_fields = fields


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product", "quantity", "unit_price", "line_total"]


class OrderListSerializer(serializers.ModelSerializer):
    item_count = serializers.IntegerField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "number",
            "status",
            "status_display",
            "total_amount",
            "placed_at",
            "shipped_at",
            "delivered_at",
            "item_count",
        ]


class OrderDetailSerializer(OrderListSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    driver = DriverSerializer(read_only=True)
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)

    class Meta(OrderListSerializer.Meta):
        fields = OrderListSerializer.Meta.fields + [
            "items",
            "driver",
            "tracking_code",
            "customer_name",
        ]
