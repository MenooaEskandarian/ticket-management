from datetime import timedelta

from django.conf import settings
from django.utils import timezone


class LastSeenMiddleware:
    """Record when an authenticated user was last active.

    The update runs on the way *out* of the view on purpose. Token
    authentication is performed by DRF during dispatch, so on the way in
    ``request.user`` is still anonymous for every API call.

    Writes are throttled to one per LAST_SEEN_THROTTLE_SECONDS so an active
    session does not add a row update to every single request.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.throttle = timedelta(seconds=settings.LAST_SEEN_THROTTLE_SECONDS)

    def __call__(self, request):
        response = self.get_response(request)

        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            return response

        now = timezone.now()
        if user.last_seen_at is None or now - user.last_seen_at >= self.throttle:
            type(user).objects.filter(pk=user.pk).update(last_seen_at=now)
            user.last_seen_at = now

        return response
