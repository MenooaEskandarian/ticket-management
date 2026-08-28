import factory

from apps.catalog.models import Category, Product


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: f"Category {n}")


class ProductFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Product

    category = factory.SubFactory(CategoryFactory)
    name = factory.Sequence(lambda n: f"Bouquet {n}")
    description = "A hand-tied seasonal bouquet."
    price = "42.00"
