"""Populate the database with a demo shop: products, customers and orders.

The order set deliberately covers every status in the workflow, plus a
delivered order inside the re-open window and one outside it, so each branch of
the ticket rules can be exercised by hand.
"""

import math
import random
from datetime import timedelta
from decimal import Decimal
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from PIL import Image, ImageDraw

from apps.accounts.models import User, UserRole
from apps.catalog.models import Category, Product
from apps.orders.models import Driver, Order, OrderItem, OrderStatus

DEMO_PASSWORD = "golgift1234"

CATEGORIES = ["Bouquets", "Arrangements", "Potted Plants", "Gift Sets"]

# name, category, price, description, (petal colour, centre colour)
PRODUCTS = [
    (
        "Blush Peony Bouquet",
        "Bouquets",
        "48.00",
        "Twelve soft-blush peonies wrapped in kraft paper and tied with linen ribbon.",
        ((236, 170, 186), (247, 226, 190)),
    ),
    (
        "Crimson Rose Dozen",
        "Bouquets",
        "55.00",
        "A classic dozen long-stem crimson roses, cut fresh the morning they ship.",
        ((178, 46, 62), (243, 219, 168)),
    ),
    (
        "Wild Meadow Bunch",
        "Bouquets",
        "36.00",
        "Cornflower, chamomile and grasses gathered the way they grow.",
        ((146, 168, 209), (250, 238, 176)),
    ),
    (
        "Sunlit Tulip Bundle",
        "Bouquets",
        "32.00",
        "Fifteen stems of yellow and apricot tulips for a bright kitchen table.",
        ((242, 189, 92), (238, 152, 76)),
    ),
    (
        "White Lily Arrangement",
        "Arrangements",
        "62.00",
        "Oriental lilies and eucalyptus arranged in a footed ceramic bowl.",
        ((243, 240, 232), (233, 205, 130)),
    ),
    (
        "Autumn Ember Vase",
        "Arrangements",
        "58.00",
        "Rust dahlias, amaranth and dried wheat in a smoked glass vase.",
        ((196, 96, 58), (226, 178, 106)),
    ),
    (
        "Garden Party Centrepiece",
        "Arrangements",
        "74.00",
        "A low, wide centrepiece of garden roses and trailing jasmine.",
        ((222, 143, 160), (240, 226, 196)),
    ),
    (
        "Olive & Sage Wreath",
        "Arrangements",
        "46.00",
        "Preserved olive branches and sage on a woven willow base.",
        ((123, 146, 106), (198, 205, 168)),
    ),
    (
        "Monstera in Stone Pot",
        "Potted Plants",
        "68.00",
        "A well-rooted monstera deliciosa in a hand-thrown stoneware pot.",
        ((74, 122, 84), (204, 196, 178)),
    ),
    (
        "Trailing Ivy Basket",
        "Potted Plants",
        "34.00",
        "English ivy in a seagrass basket, happy in low light.",
        ((92, 130, 92), (214, 199, 172)),
    ),
    (
        "Rosemary Topiary",
        "Potted Plants",
        "41.00",
        "A clipped rosemary standard that doubles as kitchen herb.",
        ((110, 138, 112), (226, 214, 186)),
    ),
    (
        "Bloom & Candle Gift Box",
        "Gift Sets",
        "79.00",
        "A seasonal posy boxed with a beeswax candle and hand-dipped chocolates.",
        ((214, 158, 172), (238, 214, 178)),
    ),
]

DRIVERS = [
    ("Nima Rahimi", "+44 7700 900118", "GX21 KLM"),
    ("Ellie Foster", "+44 7700 900243", "LT19 NRE"),
    ("Tomas Varga", "+44 7700 900377", "BD70 WQA"),
]


def make_product_image(petal_rgb, centre_rgb, seed: int) -> ContentFile:
    """Draw a simple stylised bloom so the storefront has real imagery."""
    size = 800
    rng = random.Random(seed)
    image = Image.new("RGB", (size, size), (250, 247, 241))
    draw = ImageDraw.Draw(image)

    # Warm vertical wash behind the flower.
    top, bottom = (252, 248, 242), (236, 233, 224)
    for y in range(size):
        blend = y / size
        draw.line(
            [(0, y), (size, y)],
            fill=tuple(int(top[i] + (bottom[i] - top[i]) * blend) for i in range(3)),
        )

    cx = cy = size // 2
    petal_count = rng.choice([6, 7, 8])
    for ring, (radius, petal_len) in enumerate(((150, 128), (96, 92))):
        offset = math.pi / petal_count if ring else 0
        shade = 1.0 if ring == 0 else 0.86
        colour = tuple(min(255, int(c * shade)) for c in petal_rgb)
        for i in range(petal_count):
            angle = offset + (2 * math.pi * i / petal_count)
            px, py = cx + radius * math.cos(angle), cy + radius * math.sin(angle)
            draw.ellipse(
                [px - petal_len / 2, py - petal_len / 2, px + petal_len / 2, py + petal_len / 2],
                fill=colour,
            )

    draw.ellipse([cx - 74, cy - 74, cx + 74, cy + 74], fill=centre_rgb)
    draw.ellipse(
        [cx - 40, cy - 40, cx + 40, cy + 40], fill=tuple(max(0, int(c * 0.82)) for c in centre_rgb)
    )

    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=88)
    return ContentFile(buffer.getvalue())


class Command(BaseCommand):
    help = "Seed demo users, flower products and orders covering every order status."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing demo orders and products before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            Order.objects.all().delete()
            Product.objects.all().delete()
            Category.objects.all().delete()
            Driver.objects.all().delete()
            self.stdout.write("Cleared existing catalogue and orders.")

        users = self._seed_users()
        categories = self._seed_categories()
        products = self._seed_products(categories)
        drivers = self._seed_drivers()
        self._seed_orders(users, products, drivers)

        self.stdout.write(self.style.SUCCESS("\nDemo data ready."))
        self.stdout.write(f"  Customer      customer@golgift.test / {DEMO_PASSWORD}")
        self.stdout.write(f"  Customer (2)  jamie@golgift.test / {DEMO_PASSWORD}")
        self.stdout.write(f"  Support agent support@golgift.test / {DEMO_PASSWORD}")

    def _seed_users(self):
        specs = [
            ("customer@golgift.test", "Sara Ahmadi", "+44 7700 900461", UserRole.CUSTOMER),
            ("jamie@golgift.test", "Jamie Okonkwo", "+44 7700 900512", UserRole.CUSTOMER),
            ("support@golgift.test", "Reza Karimi", "+44 7700 900733", UserRole.SUPPORT),
        ]
        users = {}
        for email, name, phone, role in specs:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"full_name": name, "phone": phone, "role": role},
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save(update_fields=["password"])
            users[email] = user

        if not User.objects.filter(email="admin@golgift.test").exists():
            User.objects.create_superuser(
                "admin@golgift.test", DEMO_PASSWORD, full_name="Site Administrator"
            )
        self.stdout.write(f"Users: {len(users) + 1}")
        return users

    def _seed_categories(self):
        return {
            name: Category.objects.get_or_create(name=name, defaults={"slug": slugify(name)})[0]
            for name in CATEGORIES
        }

    def _seed_products(self, categories):
        products = []
        for index, (name, category, price, description, palette) in enumerate(PRODUCTS):
            product, created = Product.objects.get_or_create(
                slug=slugify(name),
                defaults={
                    "name": name,
                    "category": categories[category],
                    "price": Decimal(price),
                    "description": description,
                },
            )
            # Check storage, not just the field: a database restored alongside an
            # empty media volume still has paths pointing at files that are gone.
            if created or not product.image or not product.image.storage.exists(product.image.name):
                product.image.save(
                    f"{product.slug}.jpg", make_product_image(*palette, seed=index), save=True
                )
            products.append(product)
        self.stdout.write(f"Products: {len(products)}")
        return products

    def _seed_drivers(self):
        return [
            Driver.objects.get_or_create(
                vehicle_plate=plate, defaults={"full_name": name, "phone": phone}
            )[0]
            for name, phone, plate in DRIVERS
        ]

    def _seed_orders(self, users, products, drivers):
        if Order.objects.exists():
            self.stdout.write("Orders already present, leaving them untouched.")
            return

        now = timezone.now()
        customer = users["customer@golgift.test"]
        other = users["jamie@golgift.test"]

        # (customer, status, days since placed, days since shipped, days since delivered)
        plan = [
            (customer, OrderStatus.AWAITING_PAYMENT, 1, None, None),
            (customer, OrderStatus.PAID, 3, None, None),
            (customer, OrderStatus.IN_PREPARATION, 4, None, None),
            (customer, OrderStatus.SHIPPED, 6, 1, None),
            (customer, OrderStatus.SHIPPED, 8, 2, None),
            # Inside the re-open window.
            (customer, OrderStatus.DELIVERED, 10, 5, 2),
            # Outside it -- re-opening this one must be refused.
            (customer, OrderStatus.DELIVERED, 30, 24, 20),
            (customer, OrderStatus.DELIVERED, 14, 10, 6),
            (other, OrderStatus.DELIVERED, 9, 5, 3),
            (other, OrderStatus.SHIPPED, 5, 1, None),
        ]

        rng = random.Random(7)
        for index, (buyer, status, placed, shipped, delivered) in enumerate(plan):
            order = Order.objects.create(
                customer=buyer,
                status=status,
                placed_at=now - timedelta(days=placed),
                shipped_at=None if shipped is None else now - timedelta(days=shipped),
                delivered_at=None if delivered is None else now - timedelta(days=delivered),
                driver=drivers[index % len(drivers)] if shipped is not None else None,
                tracking_code=f"GG{rng.randrange(10**7, 10**8)}" if shipped is not None else "",
            )
            for product in rng.sample(products, rng.randint(1, 3)):
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=rng.randint(1, 2),
                    unit_price=product.price,
                )
            order.recalculate_total()

        self.stdout.write(f"Orders: {len(plan)}")
