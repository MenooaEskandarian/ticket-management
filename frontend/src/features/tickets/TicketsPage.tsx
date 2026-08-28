import { Link } from "react-router";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TicketKindBadge, TicketStatusBadge } from "@/components/TicketBadges";
import { formatDateTime } from "@/lib/format";
import { useTickets } from "./api";

export default function TicketsPage() {
  const { data: tickets, isLoading } = useTickets();

  return (
    <div>
      <PageHeader
        title="Support"
        description="One ticket per order. Re-open an existing ticket to follow something up."
        actions={
          <Button asChild>
            <Link to="/tickets/new">
              <Plus className="size-4" />
              Open a ticket
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !tickets?.length ? (
        <EmptyState
          title="No tickets yet"
          description="If something is not right with an order, tell us and we will pick it up."
          action={
            <Button asChild variant="outline">
              <Link to="/tickets/new">Open a ticket</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} to={`/tickets/${ticket.id}`} className="block">
              <Card className="gap-3 p-5 transition-colors hover:bg-secondary/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-display text-lg leading-snug">{ticket.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      Order {ticket.order_number} · opened {formatDateTime(ticket.created_at)}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TicketStatusBadge status={ticket.status} />
                  <TicketKindBadge kind={ticket.kind} />
                  <span className="text-sm text-muted-foreground">
                    Last message {formatDateTime(ticket.last_message_at)}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
