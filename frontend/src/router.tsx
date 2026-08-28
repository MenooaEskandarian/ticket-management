import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "@/components/Layout";
import { RequireAuth, RequireSupport } from "@/features/auth/guards";
import LoginPage from "@/features/auth/LoginPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/shop" replace /> },
          { path: "shop", element: <div /> },
          { path: "orders", element: <div /> },
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
