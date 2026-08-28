from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer


@extend_schema(tags=["catalog"])
class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """The shop front. Browsable without signing in."""

    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    queryset = Product.objects.filter(is_active=True).select_related("category")
    filterset_fields = ["category__slug"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "price", "created_at"]
    lookup_field = "slug"


@extend_schema(tags=["catalog"])
class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    queryset = Category.objects.all()
    lookup_field = "slug"
