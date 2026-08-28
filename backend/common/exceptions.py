from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler as drf_exception_handler


class ConflictError(APIException):
    """Raised when a request clashes with the current state of a record.

    Carries an arbitrary payload so the client can act on the conflict rather
    than only display it -- the ticket endpoints use it to hand back the id of
    the ticket that already exists for an order.
    """

    status_code = status.HTTP_409_CONFLICT
    default_detail = "This action conflicts with the current state."
    default_code = "conflict"

    def __init__(self, detail=None, code=None, payload=None):
        super().__init__(detail=detail, code=code)
        self.payload = payload or {}


def _first_message(value) -> str:
    """DRF wraps most messages in a list; the client wants one sentence."""
    if isinstance(value, list):
        return str(value[0]) if value else ""
    if isinstance(value, dict):
        return _first_message(next(iter(value.values()), ""))
    return str(value)


def _error_code(exc) -> str:
    detail = getattr(exc, "detail", None)
    if hasattr(detail, "code"):
        return detail.code
    if isinstance(detail, list) and detail and hasattr(detail[0], "code"):
        return detail[0].code
    return getattr(exc, "default_code", "error")


def api_exception_handler(exc, context):
    """Give every error the same shape: a message, a code, and per-field detail."""
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    detail = response.data
    body = {"code": _error_code(exc)}

    if isinstance(detail, dict):
        if "detail" in detail:
            body["detail"] = _first_message(detail["detail"])
            fields = {key: value for key, value in detail.items() if key != "detail"}
            if fields:
                body["fields"] = fields
        else:
            body["detail"] = _first_message(detail)
            body["fields"] = detail
    elif isinstance(detail, list):
        body["detail"] = _first_message(detail)
    else:
        body["detail"] = str(detail)

    if isinstance(exc, ConflictError) and exc.payload:
        body.update(exc.payload)

    response.data = body
    return response
