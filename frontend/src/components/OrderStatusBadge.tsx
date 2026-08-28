import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const LABELS: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  IN_PREPARATION: "In preparation",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
};

const TONES: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "bg-muted text-muted-foreground",
  PAID: "bg-secondary text-secondary-foreground",
  IN_PREPARATION: "bg-accent text-accent-foreground",
  SHIPPED: "bg-primary/15 text-primary",
  DELIVERED: "bg-sla-answered-soft text-sla-answered",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", TONES[status])}>
      {LABELS[status]}
    </Badge>
  );
}
