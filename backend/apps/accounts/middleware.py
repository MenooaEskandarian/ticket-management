from datetime import timedelta

from asgiref.sync import iscoroutinefunction, markcoroutinefunction, sync_to_async
from django.conf import settings
from django.utils import timezone


class LastSeenMiddleware:
    """Record when an authenticated user was last active.

    The update runs on the way *out* of the view on purpose. Token
    authentication is performed by DRF during dispatch, so on the way in
    ``request.user`` is still anonymous for every API call.

    Writes are throttled to one per LAST_SEEN_THROTTLE_SECONDS so an active
    session does not add a row update to every single request.

    Both calling conventions are supported. A sync-only middleware anywhere in
    the chain would force Django to run async views through ``async_to_sync``,
    which collapses the event streams in apps.realtime into a single response.
    """

    async_capable = True
    sync_capable = True

    def __init__(self, get_response):
        self.get_response = get_response
        self.throttle = timedelta(seconds=settings.LAST_SEEN_THROTTLE_SECONDS)
        self.is_async = iscoroutinefunction(get_response)
        if self.is_async:
            markcoroutinefunction(self)

    def __call__(self, request):
        if self.is_async:
            return self.__acall__(request)

        response = self.get_response(request)
        self.touch(request)
        return response

    async def __acall__(self, request):
        response = await self.get_response(request)
        await sync_to_async(self.touch)(request)
        return response

    def touch(self, request) -> None:
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            return

        now = timezone.now()
        if user.last_seen_at is None or now - user.last_seen_at >= self.throttle:
            type(user).objects.filter(pk=user.pk).update(last_seen_at=now)
            user.last_seen_at = now
