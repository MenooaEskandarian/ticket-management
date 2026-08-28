/** Signed-out visitors are sent to the login page; customers stay out of the agent area. */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { customer } from "@/test/utils";
import { AuthProvider } from "./useAuth";
import { RequireAuth, RequireSupport } from "./guards";

function renderAt(route: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/login" element={<p>Sign in page</p>} />
            <Route element={<RequireAuth />}>
              <Route path="/orders" element={<p>My orders</p>} />
              <Route element={<RequireSupport />}>
                <Route path="/support" element={<p>Support queue</p>} />
              </Route>
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("route guards", () => {
  it("sends a signed-out visitor to the login page", async () => {
    renderAt("/orders");

    expect(await screen.findByText("Sign in page")).toBeInTheDocument();
  });

  it("lets a signed-in customer through to their own area", async () => {
    localStorage.setItem("golgift.tokens", JSON.stringify({ access: "a", refresh: "r" }));
    server.use(http.get("*/api/auth/me", () => HttpResponse.json(customer)));

    renderAt("/orders");

    expect(await screen.findByText("My orders")).toBeInTheDocument();
  });

  it("keeps a customer out of the agent dashboard", async () => {
    localStorage.setItem("golgift.tokens", JSON.stringify({ access: "a", refresh: "r" }));
    server.use(http.get("*/api/auth/me", () => HttpResponse.json(customer)));

    renderAt("/support");

    // Bounced to the customer area rather than shown the queue.
    expect(await screen.findByText("My orders")).toBeInTheDocument();
    expect(screen.queryByText("Support queue")).not.toBeInTheDocument();
  });

  it("admits a support agent to the dashboard", async () => {
    localStorage.setItem("golgift.tokens", JSON.stringify({ access: "a", refresh: "r" }));
    server.use(
      http.get("*/api/auth/me", () =>
        HttpResponse.json({ ...customer, role: "SUPPORT", full_name: "Reza Karimi" }),
      ),
    );

    renderAt("/support");

    expect(await screen.findByText("Support queue")).toBeInTheDocument();
  });
});
