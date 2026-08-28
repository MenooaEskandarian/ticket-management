from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "full_name", "phone", "role", "last_seen_at"]
        read_only_fields = fields


class LoginSerializer(TokenObtainPairSerializer):
    """Return the signed-in user alongside the tokens.

    Saves the client an extra round trip to /auth/me just to learn which role
    it should render.
    """

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data
