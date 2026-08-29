"""Short-lived tokens that let EventSource authenticate.

The browser's EventSource cannot send an Authorization header, and putting the
access token in the query string would write a long-lived credential into every
proxy and server access log.

So the client exchanges its normal credentials for a token that is good for one
minute and nothing else. It stays usable for that minute rather than being
single-use, because EventSource retries connections on its own and a token
consumed by the first attempt would break the second.
"""

import secrets

import redis
from django.conf import settings

# Imported as a module, not by name: the client is swapped out in tests, and a
# bound reference here would keep pointing at the original.
from . import events

KEY_PREFIX = "stream-token:"


def issue(user) -> tuple[str, int]:
    """Mint a stream token for this user. Returns the token and its lifetime."""
    token = secrets.token_urlsafe(32)
    ttl = settings.REALTIME_TOKEN_TTL_SECONDS
    events.get_client().set(f"{KEY_PREFIX}{token}", str(user.pk), ex=ttl)
    return token, ttl


def user_id_for(token: str) -> int | None:
    """Resolve a stream token, or None if it is unknown or has expired."""
    if not token:
        return None
    try:
        value = events.get_client().get(f"{KEY_PREFIX}{token}")
    except redis.RedisError:
        return None
    return int(value) if value else None
