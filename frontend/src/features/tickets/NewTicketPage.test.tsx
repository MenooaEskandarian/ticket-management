/** The brief's central rule: the order's status decides what the form asks for. */
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { makeOrder, paginated, renderWithProviders } from "@/test/utils";
import type { OrderStatus } from "@/types";
import NewTicketPage from "./NewTicketPage";

function mockOrder(status: OrderStatus) {
  const order = makeOrder({
    id: 5,
    status,
    driver:
      status === "SHIPPED"
        ? { id: 1, full_name: "Nima Rahimi", phone: "+44 7700 900118", vehicle_plate: "GX21 KLM" }
        : null,
  });

  server.use(
    http.get("*/api/orders/5", () => HttpResponse.json(order)),
    http.get("*/api/orders", () => HttpResponse.json(paginated([order]))),
  );
}

function renderForOrder(status: OrderStatus) {
  mockOrder(status);
  return renderWithProviders(<NewTicketPage />, { route: "/tickets/new?order=5" });
}

describe("ticket form by order status", () => {
  it("asks for photos when the order was delivered", async () => {
    renderForOrder("DELIVERED");

    expect(await screen.findByText("Report a problem")).toBeInTheDocument();
    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
    expect(screen.getByText("What went wrong?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add photos/i })).toBeInTheDocument();
  });

  it("shows the driver and no photo field when the order is shipped", async () => {
    renderForOrder("SHIPPED");

    expect(await screen.findByText("Request a change")).toBeInTheDocument();
    expect(screen.getByText("Nima Rahimi")).toBeInTheDocument();
    expect(screen.getByText("GX21 KLM")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add photos/i })).not.toBeInTheDocument();
  });

  it("offers only free text for an order that has not shipped", async () => {
    renderForOrder("PAID");

    expect(await screen.findByText("Message support")).toBeInTheDocument();
    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
    expect(screen.getByLabelText("Your message")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add photos/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Out for delivery")).not.toBeInTheDocument();
  });
});

describe("validation", () => {
  it("surfaces the schema's messages instead of submitting", async () => {
    const user = userEvent.setup();
    renderForOrder("PAID");

    await screen.findByText("Message support");
    await user.click(screen.getByRole("button", { name: /open ticket/i }));

    await waitFor(() => {
      expect(screen.getByText(/give your message a short title/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/tell us a little more/i)).toBeInTheDocument();
  });

  it("requires a photo before a delivery problem can be sent", async () => {
    const user = userEvent.setup();
    renderForOrder("DELIVERED");

    await screen.findByText("Report a problem");
    await user.type(screen.getByLabelText("Subject"), "Crushed on arrival");
    await user.type(
      screen.getByLabelText("What went wrong?"),
      "Half the stems were snapped when the box arrived this morning.",
    );
    await user.click(screen.getByRole("button", { name: /open ticket/i }));

    await waitFor(() => {
      expect(screen.getByText(/add at least one photo/i)).toBeInTheDocument();
    });
  });
});
