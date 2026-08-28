import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatDate, formatMoney } from "@/lib/format";
import { useOrders } from "./api";

export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();

  return (
    <div>
      <PageHeader
        title="My orders"
        description="Every order you have placed, active and past."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : !orders?.length ? (
        <EmptyState title="No orders yet" description="Your orders will appear here once placed." />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} to={`/orders/${order.id}`} className="block">
              <Card className="flex-row items-center justify-between gap-4 p-5 transition-colors hover:bg-secondary/40">
                <div className="space-y-1">
                  <p className="font-display text-lg">{order.number}</p>
                  <p className="text-sm text-muted-foreground">
                    Placed {formatDate(order.placed_at)} · {order.item_count}{" "}
                    {order.item_count === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="flex items-center gap-5">
                  <OrderStatusBadge status={order.status} />
                  <span className="font-medium">{formatMoney(order.total_amount)}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
