import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "@/components/Layout";
import { RequireAuth, RequireSupport } from "@/features/auth/guards";
import LoginPage from "@/features/auth/LoginPage";
import StorefrontPage from "@/features/catalog/StorefrontPage";
import OrdersPage from "@/features/orders/OrdersPage";
import OrderDetailPage from "@/features/orders/OrderDetailPage";
import TicketsPage from "@/features/tickets/TicketsPage";
import NewTicketPage from "@/features/tickets/NewTicketPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/shop" replace /> },
          { path: "shop", element: <StorefrontPage /> },
          { path: "orders", element: <OrdersPage /> },
          { path: "orders/:id", element: <OrderDetailPage /> },
          { path: "tickets", element: <TicketsPage /> },
          { path: "tickets/new", element: <NewTicketPage /> },
          {
            element: <RequireSupport />,
            children: [{ path: "support", element: <div /> }],
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
