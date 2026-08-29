"""Move notification delivery off the request thread.

Sending is not something the customer should wait for: the reply they just
posted is already saved, and a slow or failing channel must not hold up the
response. Delivery is handed to a small pool of worker threads instead.

Two details matter here:

* Work is scheduled with ``transaction.on_commit``. ``post_message`` runs inside
  an atomic block, so a worker starting any earlier would query on its own
  connection and find no message row.
* Workers are given a primary key, not a model instance, and close their
  database connection when they finish. A thread that keeps a connection open
  holds a slot in the pool for the life of the process.
"""

import atexit
import logging
from concurrent.futures import ThreadPoolExecutor

from django.conf import settings
from django.db import connection, transaction

from .services import notify_ticket_message

logger = logging.getLogger("golgift.notifications")

_pool: ThreadPoolExecutor | None = None


def get_pool() -> ThreadPoolExecutor:
    global _pool
    if _pool is None:
        _pool = ThreadPoolExecutor(
            max_workers=settings.NOTIFICATION_WORKERS,
            thread_name_prefix="notify",
        )
        # Let anything already in flight finish rather than dropping it.
        atexit.register(_pool.shutdown, wait=True)
    return _pool


def _deliver(message_id: int) -> None:
    """Run the fan-out for one message on a worker thread."""
    from apps.tickets.models import TicketMessage

    try:
        message = TicketMessage.objects.select_related(
            "ticket", "ticket__order", "ticket__order__customer", "author"
        ).get(pk=message_id)
    except TicketMessage.DoesNotExist:
        # The message was rolled back or removed between commit and pick-up.
        logger.warning("Notification skipped: message %s no longer exists", message_id)
        return

    try:
        notify_ticket_message(message)
    except Exception:
        # A worker thread has nobody to raise to, so failures are recorded here.
        logger.exception("Notification delivery failed for message %s", message_id)
    finally:
        connection.close()


def queue_ticket_message(message) -> None:
    """Notify the customer about a message, once its transaction has committed.

    With ``NOTIFICATIONS_SYNC`` set the work runs inline instead, which is what
    the tests use so assertions do not race a worker.
    """
    if settings.NOTIFICATIONS_SYNC:
        notify_ticket_message(message)
        return

    message_id = message.pk
    transaction.on_commit(lambda: get_pool().submit(_deliver, message_id))
