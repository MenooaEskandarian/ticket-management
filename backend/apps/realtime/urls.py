from django.urls import path

from .views import queue_stream, stream_token, ticket_stream

urlpatterns = [
    path("realtime/token", stream_token, name="realtime-token"),
    path("realtime/queue", queue_stream, name="realtime-queue"),
    path("realtime/tickets/<int:pk>", ticket_stream, name="realtime-ticket"),
]
