# GolGift — Support Ticketing

A support ticketing system built into the customer panel of a flower shop. Customers raise a
ticket against an order, support agents work the queue from a dashboard, and every message in
either direction notifies the customer by email and SMS.

Built for the GolGift full-stack technical assessment.

---

## What it does

**For customers**

- Browse the shop and see every order, active and past, with its live status.
- Open one ticket per order. The form changes with the order's status:
  - **Delivered** — describe the problem and attach photos.
  - **Shipped** — see the assigned driver's details and request a change to the delivery.
  - **Anything else** — a plain message to the support team.
- Follow the conversation, attach more photos, close a ticket, and re-open it within a week of
  delivery.

**For support agents**

- A queue of every ticket, newest first, sortable by status, age, last message or unanswered count.
- Each row is tinted by how long the customer has been waiting: green answered, amber past 24
  hours, red past 72.
- A toggle to show only tickets on delivered orders, plus search across subject, order number and
  customer name.
- A notification log showing every email and SMS the system produced.

---

## Requirements coverage

| Requirement | Where it lives |
|---|---|
| Form adapts to order status | `backend/apps/tickets/services.py` (`kind_for_order`), `frontend/src/features/tickets/schemas.ts` |
| Photo upload on delivered orders | `backend/apps/tickets/validators.py`, `frontend/src/features/tickets/PhotoPicker.tsx` |
| Driver shown for shipped orders | `backend/apps/orders/models.py`, `frontend/src/components/DriverCard.tsx` |
| One ticket per order | `Ticket.order` is a `OneToOneField`; the API answers `409` with the existing ticket's id |
| Re-open within a week of delivery | `services.can_reopen` / `reopen_ticket` |
| Email + SMS on every message | `backend/apps/notifications/` — both channels fire from `notify_ticket_message` |
| Message timestamps and "Last seen" | `frontend/src/features/tickets/TicketDetailPage.tsx`, `apps/accounts/middleware.py` |
| Admin list, default newest first | `frontend/src/features/admin/AdminTicketsPage.tsx` |
| Response-age colour coding | `services.sla_level`, exposed as `sla_level` on the API |
| Delivered-only filter | `?delivered_only=true` in `apps/tickets/filters.py` |
| Unanswered message counts | Annotated in `apps/tickets/views.py` |
| Upload size and type limits | `apps/tickets/validators.py` — decoded with Pillow, not trusted by header |
| Docker Compose behind Nginx | `docker-compose.yml`, `nginx/nginx.conf` |

---

## Running it

### With Docker Compose

Everything — database, API, front end and Nginx — comes up in containers. This is the intended
way to review the project.

```bash
docker compose up --build
```

Then open **http://localhost:8080**.

On first boot the backend applies migrations, collects static files and seeds a demo shop
(products, customers, drivers and orders covering every status). Set `SEED_DEMO_DATA=false` to
skip the seeding.

To use a different port, set `WEB_PORT`:

```bash
WEB_PORT=3000 docker compose up --build
```

### For development

The database runs in Docker; the API and the front end run on your machine with hot reload.

```bash
docker compose up -d db
```

Backend — Python 3.14:

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_demo
.venv/bin/python manage.py runserver 8000
```

Front end — Node 24 or newer:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` and `/media` to Django on port 8000.

### Demo accounts

All three use the password `golgift1234`.

| Role | Email |
|---|---|
| Customer | `customer@golgift.test` |
| Customer (second, for checking isolation) | `jamie@golgift.test` |
| Support agent | `support@golgift.test` |

The login page has buttons that fill these in.

---

## Tests

```bash
cd backend && .venv/bin/python -m pytest      # 49 tests
cd frontend && npm test                        # 36 tests
```

The backend tests concentrate on the rules that are easy to get wrong: which form each order
status produces, the one-ticket-per-order constraint, the re-open window from all three angles,
upload validation (including a text file posing as a JPEG), the 24- and 72-hour SLA boundaries,
unanswered counts, and that both notification channels fire for every message.

The front-end tests cover the conditional form for each status group, Zod validation surfacing,
the photo picker, the dashboard's sorting, delivered-only toggle and row colouring, and the route
guards.

---

## API

Addressed without trailing slashes. Interactive docs at `/api/docs`.

```
POST /api/auth/login          POST /api/auth/refresh      GET /api/auth/me
GET  /api/catalog/products    GET  /api/catalog/categories
GET  /api/orders              GET  /api/orders/{id}          # ?ticketable=true
GET  /api/tickets             GET  /api/tickets/{id}         # role-scoped
POST /api/tickets                                            # multipart
POST /api/tickets/{id}/messages                              # multipart
POST /api/tickets/{id}/reopen POST /api/tickets/{id}/close
GET  /api/notifications                                      # agents only
```

Agents can filter the ticket list with `delivered_only`, `status`, `sla`, `search` and `ordering`.

---

## Layout

```
backend/
  config/            settings split by environment, root urls
  common/            base model, pagination, error shape
  apps/
    accounts/        user with roles, JWT auth, last-seen middleware
    catalog/         products and categories
    orders/          orders, items, drivers, demo seeding
    tickets/         tickets, messages, attachments, and the rules
    notifications/   pluggable email and SMS channels
frontend/src/
  components/        layout, badges, shared pieces
  features/          auth · catalog · orders · tickets · admin
  lib/               API client, query client, formatters
nginx/               reverse proxy configuration
```

Ticket rules live in `apps/tickets/services.py` rather than in views or serializers, so they can
be tested on their own and there is one place to look when a rule needs to change.

---

## Time spent

**About 1 hour 45 minutes of wall-clock time**, end to end — from reading the brief to this README.

That figure is short because I used AI tooling (Claude) heavily throughout, which is how I
normally work. I directed the architecture, made the design and trade-off decisions recorded
below, reviewed every change, and verified the behaviour myself — running the API, clicking
through the UI, and checking the containers. The commit history reflects the real order the work
was done in.

---

## Assumptions

- **The re-open window starts at delivery.** A closed ticket re-opens within seven days of
  `delivered_at`. If the order has not been delivered yet there is no window to run out, so
  re-opening stays available — the order is still in flight and the customer should not be locked
  out of their own thread.
- **A fourth response state was needed.** The brief names three colours: green answered, amber
  past 24 hours, red past 72. That leaves a gap — a message sent ten minutes ago is neither
  answered nor late. I added a neutral "awaiting reply" band for unanswered messages under 24
  hours rather than colouring them green, which would have been untrue.
- **Attachments belong to delivery problems.** The brief attaches photos to the delivered-order
  form, so the API rejects attachments on the other two ticket types rather than silently
  accepting them.
- **Notifications always go to the customer**, for their own messages as well as agent replies.
  The brief asks for a notification on *every* message, and the customer is the recipient in both
  directions.
- **Orders are seeded, not purchased.** There is no cart or checkout — the assessment does not ask
  for one, and orders across all five statuses are what the ticket rules actually need.
- **Both roles share one ticket page.** An agent sees the SLA badge and acts on the same view the
  customer uses, rather than maintaining two near-identical screens.

---

## Trade-offs, and what is left out

- **Notifications are synchronous.** Both channels are called in the request that creates the
  message. The sinks are local — a log line, a database row and a CSV append — so there is nothing
  slow to defer. They sit behind `notify_ticket_message`, so moving to Celery or similar means
  queueing one function rather than restructuring anything.
- **No real email or SMS gateway.** As the brief allows, each notification writes a log line, a
  `NotificationLog` row, and a row in `backend/var/notifications/{email,sms}.csv`. The agent-facing
  notification log makes the events visible rather than something you take on trust.
- **Tokens live in `localStorage`.** Simple and sufficient here. A production deployment should
  prefer httpOnly refresh cookies, since `localStorage` is readable by any injected script.
- **Response-age bands are computed on read.** Fine at this scale, and it keeps the value honest.
  A large queue would want them precomputed or indexed.
- **No live updates.** The dashboard reflects the last fetch; there is no websocket or polling. The
  brief explicitly rules out push notifications.
- **Product images are generated at seed time** by a small Pillow routine rather than shipped as
  binary assets, which keeps the repository clean and the seeding self-contained.
- **Left out deliberately:** cart and checkout, payment, pagination controls in the UI (the API
  paginates, the pages request a large page), attachment virus scanning, rate limiting, and
  internationalisation.
