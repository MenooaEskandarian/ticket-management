import { Link, useParams } from "react-router";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { DriverCard } from "@/components/DriverCard";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useOrder } from "./api";

export default function OrderDetailPage() {
  const { id } = useParams();
  const { data: order, isLoading } = useOrder(id ? Number(id) : undefined);

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (!order) return <p className="text-muted-foreground">That order could not be found.</p>;

  const timeline = [
    { label: "Placed", at: order.placed_at },
    { label: "Shipped", at: order.shipped_at },
    { label: "Delivered", at: order.delivered_at },
  ].filter((entry) => entry.at);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link to="/orders">
          <ArrowLeft className="size-4" />
          All orders
        </Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl">{order.number}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <Button asChild variant="outline">
          <Link to={`/tickets/new?order=${order.id}`}>
            <LifeBuoy className="size-4" />
            Get help with this order
          </Link>
        </Button>
      </div>

      {order.driver && order.status === "SHIPPED" && (
        <DriverCard driver={order.driver} trackingCode={order.tracking_code} />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                {item.product.image && (
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="size-16 rounded-lg bg-muted object-cover"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium">{item.product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} × {formatMoney(item.unit_price)}
                  </p>
                </div>
                <span className="font-medium">{formatMoney(item.line_total)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-display text-lg">
              <span>Total</span>
              <span>{formatMoney(order.total_amount)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {timeline.map((entry) => (
                <li key={entry.label} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-medium">{entry.label}</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(entry.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
