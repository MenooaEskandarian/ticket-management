import { Phone, Truck } from "lucide-react";
import type { Driver } from "@/types";

/** Shown while an order is out for delivery, as the shipment form requires. */
export function DriverCard({ driver, trackingCode }: { driver: Driver; trackingCode?: string }) {
  return (
    <div className="rounded-xl border bg-secondary/40 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Truck className="size-4 text-primary" />
        Out for delivery
      </p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Driver</dt>
          <dd className="font-medium">{driver.full_name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Vehicle</dt>
          <dd className="font-medium">{driver.vehicle_plate}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Contact</dt>
          <dd className="flex items-center gap-1 font-medium">
            <Phone className="size-3" />
            {driver.phone}
          </dd>
        </div>
        {trackingCode && (
          <div>
            <dt className="text-muted-foreground">Tracking</dt>
            <dd className="font-mono font-medium">{trackingCode}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
