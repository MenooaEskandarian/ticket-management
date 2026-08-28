import { NavLink, Outlet, useNavigate } from "react-router";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/useAuth";
import { Bloom } from "./Bloom";

const CUSTOMER_LINKS = [
  { to: "/shop", label: "Shop" },
  { to: "/orders", label: "My orders" },
  { to: "/tickets", label: "Support" },
];

const SUPPORT_LINKS = [
  { to: "/support", label: "Tickets" },
  { to: "/support/notifications", label: "Notifications" },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const links = user?.role === "SUPPORT" ? SUPPORT_LINKS : CUSTOMER_LINKS;

  function handleSignOut() {
    signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
          <NavLink to={user?.role === "SUPPORT" ? "/support" : "/shop"} className="flex items-center gap-2">
            <Bloom className="size-6 text-primary" />
            <span className="font-display text-lg font-semibold">GolGift</span>
          </NavLink>

          <nav className="flex flex-1 items-center gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/support"}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                      {initials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm sm:inline">{user.full_name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSignOut}>
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Outlet />
      </main>

      <footer className="border-t py-6">
        <div className="mx-auto max-w-6xl px-6 text-sm text-muted-foreground">
          GolGift — fresh flowers, delivered with care.
        </div>
      </footer>
    </div>
  );
}
