import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "@/components/Layout";
import { RequireAuth, RequireSupport } from "@/features/auth/guards";
import LoginPage from "@/features/auth/LoginPage";
import StorefrontPage from "@/features/catalog/StorefrontPage";
import OrdersPage from "@/features/orders/OrdersPage";
import OrderDetailPage from "@/features/orders/OrderDetailPage";

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
          { path: "tickets", element: <div /> },
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
