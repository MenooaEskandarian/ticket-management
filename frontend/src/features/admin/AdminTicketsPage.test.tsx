/** The dashboard controls the brief calls out: sorting, the toggle, and colour coding. */
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { makeTicket, paginated, renderWithProviders } from "@/test/utils";
import AdminTicketsPage from "./AdminTicketsPage";

const TICKETS = [
  makeTicket({ id: 1, subject: "Answered already", sla_level: "ANSWERED", unanswered_count: 0 }),
  makeTicket({
    id: 2,
    subject: "Waiting over a day",
    sla_level: "WARNING",
    unanswered_count: 1,
    order_status: "SHIPPED",
  }),
  makeTicket({
    id: 3,
    subject: "Waiting over three days",
    sla_level: "CRITICAL",
    unanswered_count: 2,
    order_status: "DELIVERED",
  }),
];

/** Records the query string of each request so assertions can inspect it. */
function mockTickets(onRequest?: (url: URL) => void) {
  server.use(
    http.get("*/api/tickets", ({ request }) => {
      const url = new URL(request.url);
      onRequest?.(url);
      const delivered = url.searchParams.get("delivered_only") === "true";
      const rows = delivered ? TICKETS.filter((t) => t.order_status === "DELIVERED") : TICKETS;
      return HttpResponse.json(paginated(rows));
    }),
  );
}

describe("support queue", () => {
  it("lists every ticket with its order, customer and unanswered count", async () => {
    mockTickets();
    renderWithProviders(<AdminTicketsPage />);

    expect(await screen.findByText("Answered already")).toBeInTheDocument();
    expect(screen.getAllByText("Sara Ahmadi")).toHaveLength(3);
    expect(screen.getByText("Waiting over three days")).toBeInTheDocument();
  });

  it("asks the server for newest first by default", async () => {
    const seen: string[] = [];
    mockTickets((url) => seen.push(url.searchParams.get("ordering") ?? ""));
    renderWithProviders(<AdminTicketsPage />);

    await screen.findByText("Answered already");
    expect(seen[0]).toBe("-created_at");
  });

  it("tints each row by how long the customer has waited", async () => {
    mockTickets();
    renderWithProviders(<AdminTicketsPage />);

    await screen.findByText("Answered already");

    const critical = document.querySelector('[data-sla="CRITICAL"]');
    const warning = document.querySelector('[data-sla="WARNING"]');
    expect(critical?.className).toContain("border-l-sla-critical");
    expect(warning?.className).toContain("border-l-sla-warning");
  });

  it("narrows to delivered orders when the toggle is switched on", async () => {
    const user = userEvent.setup();
    const seen: (string | null)[] = [];
    mockTickets((url) => seen.push(url.searchParams.get("delivered_only")));
    renderWithProviders(<AdminTicketsPage />);

    await screen.findByText("Answered already");
    await user.click(screen.getByRole("switch", { name: /delivered orders only/i }));

    await waitFor(() => expect(seen).toContain("true"));
    await waitFor(() => {
      expect(screen.queryByText("Answered already")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Waiting over three days")).toBeInTheDocument();
  });

  it("flips the sort direction when a sortable header is clicked", async () => {
    const user = userEvent.setup();
    const seen: (string | null)[] = [];
    mockTickets((url) => seen.push(url.searchParams.get("ordering")));
    renderWithProviders(<AdminTicketsPage />);

    await screen.findByText("Answered already");
    await user.click(screen.getByRole("button", { name: /unanswered/i }));

    await waitFor(() => expect(seen).toContain("-unanswered_count"));
  });
});
