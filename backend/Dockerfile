FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production

WORKDIR /app

# Dependencies change far less often than application code, so install them
# from pyproject.toml alone and let the rest of the build reuse that layer.
COPY pyproject.toml ./
RUN pip install --no-cache-dir .

COPY . .

RUN chmod +x entrypoint.sh && \
    adduser --disabled-password --gecos "" appuser && \
    mkdir -p /app/staticfiles /app/media /app/var && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
