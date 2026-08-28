import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Order, OrderDetail, Ticket, User } from "@/types";

export function renderWithProviders(ui: ReactElement, { route = "/" } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}

export function imageFile(name = "photo.jpg", type = "image/jpeg", bytes = 1024): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

export const customer: User = {
  id: 1,
  email: "customer@golgift.test",
  full_name: "Sara Ahmadi",
  phone: "+44 7700 900461",
  role: "CUSTOMER",
  last_seen_at: "2026-08-28T12:00:00Z",
};

export function makeOrder(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: 1,
    number: "GG-2026-0001",
    status: "PAID",
    status_display: "Paid",
    total_amount: "42.00",
    placed_at: "2026-08-20T10:00:00Z",
    shipped_at: null,
    delivered_at: null,
    item_count: 1,
    items: [],
    driver: null,
    tracking_code: "",
    customer_name: "Sara Ahmadi",
    ...overrides,
  };
}

export function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 1,
    subject: "A problem with my order",
    kind: "GENERAL",
    status: "OPEN",
    order: 1,
    order_number: "GG-2026-0001",
    order_status: "PAID",
    customer_name: "Sara Ahmadi",
    created_at: "2026-08-28T10:00:00Z",
    last_message_at: "2026-08-28T10:00:00Z",
    sla_level: "WAITING",
    unanswered_count: 1,
    message_count: 1,
    ...overrides,
  };
}

export function paginated<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results };
}

export type { Order };
