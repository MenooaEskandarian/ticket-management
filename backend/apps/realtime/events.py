"""Publish ticket activity so open browsers can be told about it.

Redis carries the events because more than one worker process serves the app: a
message posted on worker A has to reach a browser streaming from worker B, and
an in-process signal would never leave A.

Publishing is deliberately best-effort. Live updates are a convenience on top of
the normal fetch-on-navigate behaviour, so a Redis outage must never turn a
successful reply into a failed request.
"""

import json
import logging

import redis
from django.conf import settings
from django.db import transaction

logger = logging.getLogger("golgift.realtime")

QUEUE_CHANNEL = "queue"

_client: redis.Redis | None = None


def get_client() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _client


def reset_client() -> None:
    """Drop the cached connection so tests can point it somewhere else."""
    global _client
    _client = None


def ticket_channel(ticket_id: int) -> str:
    return f"ticket:{ticket_id}"


def publish(channel: str, payload: dict) -> None:
    try:
        get_client().publish(channel, json.dumps(payload))
    except redis.RedisError as exc:
        logger.warning("Realtime publish to %s failed: %s", channel, exc)


def publish_ticket_event(ticket, event: str, **extra) -> None:
    """Announce a change on one ticket, and to the agent queue.

    Sent after the transaction commits, so a browser that reacts by refetching
    cannot beat the write it is reacting to.
    """
    payload = {
        "event": event,
        "ticket_id": ticket.pk,
        "order_id": ticket.order_id,
        "status": ticket.status,
        **extra,
    }

    def send():
        publish(ticket_channel(ticket.pk), payload)
        publish(QUEUE_CHANNEL, payload)

    transaction.on_commit(send)
