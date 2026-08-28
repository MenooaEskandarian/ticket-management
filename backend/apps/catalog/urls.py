from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, ProductViewSet

router = DefaultRouter(trailing_slash=False)
router.register("catalog/products", ProductViewSet, basename="product")
router.register("catalog/categories", CategoryViewSet, basename="category")

urlpatterns = router.urls
