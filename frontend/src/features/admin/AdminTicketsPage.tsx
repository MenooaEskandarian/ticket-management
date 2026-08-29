import { useState } from "react";
import { Link } from "react-router";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { SlaBadge, TicketStatusBadge } from "@/components/TicketBadges";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SlaLevel } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { useTickets } from "@/features/tickets/api";
import { useEventStream } from "@/features/realtime/useEventStream";
import { LiveIndicator } from "@/components/LiveIndicator";
import { useDebounced } from "./useDebounced";

/** Response age is shown twice: as a badge, and as a tint on the whole row. */
const ROW_TINT: Record<SlaLevel, string> = {
  ANSWERED: "border-l-sla-answered",
  WAITING: "border-l-sla-waiting",
  WARNING: "border-l-sla-warning bg-sla-warning-soft/30",
  CRITICAL: "border-l-sla-critical bg-sla-critical-soft/40",
};

const COLUMNS = [
  { key: "id", label: "Ticket", sortable: false },
  { key: "order", label: "Order", sortable: false },
  { key: "customer", label: "Customer", sortable: false },
  { key: "status", label: "Status", sortable: true },
  { key: "sla", label: "Response", sortable: false },
  { key: "created_at", label: "Opened", sortable: true },
  { key: "last_message_at", label: "Last message", sortable: true },
  { key: "unanswered_count", label: "Unanswered", sortable: true },
] as const;

export default function AdminTicketsPage() {
  const [deliveredOnly, setDeliveredOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("-created_at");
  const debouncedSearch = useDebounced(search);

  const queryClient = useQueryClient();
  const { data: tickets, isLoading } = useTickets({
    delivered_only: deliveredOnly,
    search: debouncedSearch,
    ordering,
  });

  const live = useEventStream("/realtime/queue", () =>
    queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  );

  function toggleSort(field: string) {
    setOrdering((current) => (current === `-${field}` ? field : `-${field}`));
  }

  function sortIcon(field: string) {
    if (ordering === `-${field}`) return <ArrowDown className="size-3.5" />;
    if (ordering === field) return <ArrowUp className="size-3.5" />;
    return <ChevronsUpDown className="size-3.5 opacity-40" />;
  }

  const waiting = tickets?.filter((ticket) => ticket.sla_level !== "ANSWERED").length ?? 0;

  return (
    <div>
      <PageHeader
        title="Support queue"
        description="Newest first. Rows are tinted by how long a customer has been waiting."
        actions={
          <div className="flex items-center gap-3">
            <LiveIndicator connected={live} />
            <Badge variant="secondary" className="text-sm">
              {waiting} awaiting a reply
            </Badge>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search subject, order or customer"
            aria-label="Search tickets"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="delivered-only"
            checked={deliveredOnly}
            onCheckedChange={setDeliveredOnly}
          />
          <Label htmlFor="delivered-only">Delivered orders only</Label>
        </div>
      </div>

      <Card className="overflow-hidden py-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead key={column.key}>
                    {column.sortable ? (
                      <button
                        type="button"
                        className="flex items-center gap-1.5 font-medium hover:text-foreground"
                        onClick={() => toggleSort(column.key)}
                      >
                        {column.label}
                        {sortIcon(column.key)}
                      </button>
                    ) : (
                      column.label
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={COLUMNS.length}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !tickets?.length ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length}>
                    <EmptyState
                      title="Nothing in the queue"
                      description="No tickets match the current filters."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    data-sla={ticket.sla_level}
                    className={cn("border-l-4", ROW_TINT[ticket.sla_level])}
                  >
                    <TableCell>
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="font-medium hover:underline"
                      >
                        #{ticket.id}
                      </Link>
                      <p className="max-w-52 truncate text-xs text-muted-foreground">
                        {ticket.subject}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{ticket.order_number}</p>
                      <OrderStatusBadge status={ticket.order_status} />
                    </TableCell>
                    <TableCell className="text-sm">{ticket.customer_name}</TableCell>
                    <TableCell>
                      <TicketStatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell>
                      <SlaBadge level={ticket.sla_level} />
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                      {formatDateTime(ticket.created_at)}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                      {formatDateTime(ticket.last_message_at)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex size-7 items-center justify-center rounded-full text-sm font-medium",
                          ticket.unanswered_count > 0
                            ? "bg-sla-critical-soft text-sla-critical"
                            : "text-muted-foreground",
                        )}
                      >
                        {ticket.unanswered_count}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
