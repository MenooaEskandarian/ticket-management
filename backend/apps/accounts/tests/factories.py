import factory

from apps.accounts.models import User, UserRole


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        skip_postgeneration_save = True

    email = factory.Sequence(lambda n: f"customer{n}@example.test")
    full_name = factory.Faker("name")
    phone = factory.Sequence(lambda n: f"+44 7700 9{n:05d}")
    role = UserRole.CUSTOMER

    @factory.post_generation
    def password(obj, create, extracted, **kwargs):
        if create:
            obj.set_password(extracted or "test-password-123")
            obj.save(update_fields=["password"])


class SupportUserFactory(UserFactory):
    email = factory.Sequence(lambda n: f"agent{n}@example.test")
    role = UserRole.SUPPORT
