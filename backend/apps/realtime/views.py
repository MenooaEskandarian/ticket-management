"""Server-sent event streams for live ticket updates.

These are plain async Django views rather than DRF views: a stream is held open
for as long as the browser stays on the page, and that only costs a socket when
the connection is handled asynchronously.

Nothing here is load-bearing. A browser that cannot open a stream still sees
everything on its next fetch.
"""

import logging

import redis.asyncio as aioredis
from asgiref.sync import sync_to_async
from django.conf import settings
from django.http import HttpResponse, StreamingHttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import User
from apps.tickets.models import Ticket

from . import tokens
from .events import QUEUE_CHANNEL, ticket_channel

logger = logging.getLogger("golgift.realtime")


@extend_schema(tags=["realtime"], request=None)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def stream_token(request):
    """Trade the caller's credentials for a token EventSource can carry in a URL."""
    token, ttl = tokens.issue(request.user)
    return Response({"token": token, "expires_in": ttl})


@sync_to_async
def _user_for_request(request) -> User | None:
    user_id = tokens.user_id_for(request.GET.get("token", ""))
    if user_id is None:
        return None
    return User.objects.filter(pk=user_id, is_active=True).first()


@sync_to_async
def _may_watch_ticket(user, ticket_id: int) -> bool:
    tickets = Ticket.objects.filter(pk=ticket_id)
    if not user.is_support:
        tickets = tickets.filter(order__customer=user)
    return tickets.exists()


async def _events(channel: str):
    """Yield SSE frames for one channel until the client goes away."""
    client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    pubsub = client.pubsub()

    try:
        await pubsub.subscribe(channel)
        # Tell the browser how long to wait before reconnecting on a drop.
        yield f"retry: {settings.REALTIME_RETRY_MS}\n\n".encode()

        while True:
            message = await pubsub.get_message(
                ignore_subscribe_messages=True,
                timeout=settings.REALTIME_KEEPALIVE_SECONDS,
            )
            if message is None:
                # A comment frame. Idle connections are dropped by proxies
                # otherwise, and the browser would reconnect for no reason.
                yield b": keepalive\n\n"
            else:
                yield f"data: {message['data']}\n\n".encode()
    except Exception as exc:
        logger.warning("Realtime stream on %s ended: %s", channel, exc)
    finally:
        try:
            await pubsub.aclose()
            await client.aclose()
        except Exception:
            logger.debug("Realtime cleanup for %s was already done", channel)


def _sse(stream) -> StreamingHttpResponse:
    response = StreamingHttpResponse(stream, content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    # Nginx buffers proxied responses by default, which would hold every event
    # until the buffer filled. This is belt and braces with the site config.
    response["X-Accel-Buffering"] = "no"
    return response


async def ticket_stream(request, pk: int):
    """Live updates for one conversation."""
    user = await _user_for_request(request)
    if user is None:
        return HttpResponse("A valid stream token is required.", status=401)
    if not await _may_watch_ticket(user, pk):
        return HttpResponse("Not your ticket.", status=403)

    return _sse(_events(ticket_channel(pk)))


async def queue_stream(request):
    """Live updates for the agent dashboard."""
    user = await _user_for_request(request)
    if user is None:
        return HttpResponse("A valid stream token is required.", status=401)
    if not user.is_support:
        return HttpResponse("Support agents only.", status=403)

    return _sse(_events(QUEUE_CHANNEL))
