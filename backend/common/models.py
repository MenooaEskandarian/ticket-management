from django.db import models


class TimeStampedModel(models.Model):
    """Base for records where we care when they were created and last touched."""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
