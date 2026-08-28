from django.conf import settings
from django.utils.module_loading import import_string

from .base import BaseChannel

_cache: list[BaseChannel] | None = None


def get_channels() -> list[BaseChannel]:
    """Instantiate the channels named in settings, once per process."""
    global _cache
    if _cache is None:
        _cache = [import_string(path)() for path in settings.NOTIFICATION_CHANNELS]
    return _cache


def reset_channels() -> None:
    """Drop the cache so tests can swap the configured channel list."""
    global _cache
    _cache = None


__all__ = ["BaseChannel", "get_channels", "reset_channels"]
