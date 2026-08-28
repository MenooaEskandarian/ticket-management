import { Navigate, Outlet, useLocation } from "react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "./useAuth";

function Waiting() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function RequireAuth() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Waiting />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}

export function RequireSupport() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Waiting />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "SUPPORT") return <Navigate to="/orders" replace />;
  return <Outlet />;
}
