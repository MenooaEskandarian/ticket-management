import { Link, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { DriverCard } from "@/components/DriverCard";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { SlaBadge, TicketKindBadge, TicketStatusBadge } from "@/components/TicketBadges";
import { formatDateTime, formatRelative } from "@/lib/format";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/features/auth/useAuth";
import { useEventStream } from "@/features/realtime/useEventStream";
import { LiveIndicator } from "@/components/LiveIndicator";
import { MessageThread } from "./MessageThread";
import { ReplyBox } from "./ReplyBox";
import { useTicket, useTicketAction } from "./api";

export default function TicketDetailPage() {
  const { id } = useParams();
  const ticketId = id ? Number(id) : undefined;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: ticket, isLoading } = useTicket(ticketId);
  const close = useTicketAction(ticketId ?? 0, "close");
  const reopen = useTicketAction(ticketId ?? 0, "reopen");

  // Refetch rather than merge the event payload, so the fetch path stays the
  // one place this page gets its data from.
  const live = useEventStream(ticketId ? `/realtime/tickets/${ticketId}` : null, () =>
    queryClient.invalidateQueries({ queryKey: ["tickets"] }),
  );

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (!ticket) return <p className="text-muted-foreground">That ticket could not be found.</p>;

  const isSupport = user?.role === "SUPPORT";
  const backTo = isSupport ? "/support" : "/tickets";
  const actionError = errorMessage(reopen.error ?? close.error, "");

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["tickets", ticketId] });
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link to={backTo}>
          <ArrowLeft className="size-4" />
          {isSupport ? "All tickets" : "My tickets"}
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl">{ticket.subject}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <TicketStatusBadge status={ticket.status} />
            <TicketKindBadge kind={ticket.kind} />
            {isSupport && <SlaBadge level={ticket.sla_level} />}
            <span className="text-sm text-muted-foreground">
              Ticket #{ticket.id} · opened {formatDateTime(ticket.created_at)}
            </span>
            <LiveIndicator connected={live} />
          </div>
        </div>

        <div className="flex gap-2">
          {ticket.status !== "CLOSED" ? (
            <Button variant="outline" onClick={() => close.mutate()} disabled={close.isPending}>
              <CheckCircle2 className="size-4" />
              Close ticket
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => reopen.mutate()}
              disabled={reopen.isPending || !ticket.can_reopen}
            >
              <RotateCcw className="size-4" />
              Re-open
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {ticket.status === "CLOSED" && !ticket.can_reopen && (
        <Alert>
          <AlertDescription>
            This ticket is closed and the re-opening window has passed. Orders can be revisited for
            seven days after delivery.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <MessageThread messages={ticket.messages} />

              {ticket.status !== "CLOSED" && (
                <>
                  <Separator />
                  <ReplyBox
                    ticketId={ticket.id}
                    allowPhotos={ticket.kind === "DELIVERY_ISSUE"}
                    onSent={refresh}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Order</p>
                <Link to={`/orders/${ticket.order}`} className="font-medium hover:underline">
                  {ticket.order_number}
                </Link>
                <div className="mt-1">
                  <OrderStatusBadge status={ticket.order_status} />
                </div>
              </div>

              <div>
                <p className="text-muted-foreground">Customer</p>
                <p className="font-medium">{ticket.customer_name}</p>
              </div>

              <div>
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="size-3.5" />
                  Last seen
                </p>
                <p className="font-medium">{formatRelative(ticket.customer_last_seen_at)}</p>
              </div>

              <div>
                <p className="text-muted-foreground">Last message</p>
                <p className="font-medium">{formatDateTime(ticket.last_message_at)}</p>
              </div>

              {ticket.closed_at && (
                <div>
                  <p className="text-muted-foreground">Closed</p>
                  <p className="font-medium">{formatDateTime(ticket.closed_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {ticket.driver && ticket.order_status === "SHIPPED" && (
            <DriverCard driver={ticket.driver} />
          )}
        </div>
      </div>
    </div>
  );
}
