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


def api_exception_handler(exc, context):
    """Give every error the same shape: a message, a code, and per-field detail."""
    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    detail = response.data
    body = {"code": getattr(exc, "default_code", "error")}

    if isinstance(detail, dict):
        message = detail.get("detail")
        if message is not None:
            body["detail"] = str(message)
        else:
            body["detail"] = "The request could not be processed."
            body["fields"] = detail
    elif isinstance(detail, list):
        body["detail"] = "The request could not be processed."
        body["fields"] = {"non_field_errors": detail}
    else:
        body["detail"] = str(detail)

    if isinstance(exc, ConflictError) and exc.payload:
        body.update(exc.payload)

    response.data = body
    return response
