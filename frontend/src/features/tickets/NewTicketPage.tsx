import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { DriverCard } from "@/components/DriverCard";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { apiErrorBody, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useOrder, useTicketableOrders } from "@/features/orders/api";
import { useCreateTicket } from "./api";
import { PhotoPicker } from "./PhotoPicker";
import {
  SHIPMENT_REQUEST_TYPES,
  kindForOrderStatus,
  schemaForKind,
  toFormData,
  type TicketFormValues,
} from "./schemas";

/**
 * Collect every photo problem worth showing.
 *
 * Array-level issues (too few, too many) arrive as a plain `.message`, but a
 * problem with one file lands under its index instead -- reading only
 * `.message` there shows nothing, and the form looks like it ignored the click.
 */
function photoErrors(error: unknown): string[] {
  if (!error || typeof error !== "object") return [];

  const own = (error as { message?: string }).message;
  if (own) return [own];

  return Object.entries(error)
    .filter(([key]) => /^\d+$/.test(key))
    .map(([, issue]) => (issue as { message?: string } | undefined)?.message)
    .filter((message): message is string => Boolean(message));
}

/** What the customer is told about the form they have been given. */
const KIND_INTRO = {
  DELIVERY_ISSUE: "This order was delivered, so you can send us photos of the problem.",
  SHIPMENT_REQUEST: "This order is with a driver. Tell us what you would like to change.",
  GENERAL: "Send the support team a message about this order.",
} as const;

export default function NewTicketPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data: orders, isLoading } = useTicketableOrders();
  const createTicket = useCreateTicket();

  const preselected = params.get("order");
  const orderId = Number(params.get("order") ?? 0) || undefined;
  const { data: selectedOrder } = useOrder(orderId);

  // The order's status is what decides which variant of the form applies.
  const kind = selectedOrder ? kindForOrderStatus(selectedOrder.status) : "GENERAL";

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(schemaForKind[kind]) as never,
    mode: "onSubmit",
    defaultValues: { kind, order: orderId } as never,
  });

  const { reset, setError } = form;

  // Switching order can switch the whole shape of the form, so start it over.
  useEffect(() => {
    reset({ kind, order: orderId, photos: [] } as never);
  }, [kind, orderId, reset]);

  const chooserOrders = useMemo(() => orders ?? [], [orders]);

  async function onSubmit(values: TicketFormValues) {
    try {
      const ticket = await createTicket.mutateAsync(toFormData(values));
      navigate(`/tickets/${ticket.id}`);
    } catch (error) {
      const body = apiErrorBody(error);
      // The order already has a ticket -- send the customer to that thread.
      if (body?.ticket_id) {
        navigate(`/tickets/${body.ticket_id}`);
        return;
      }
      setError("root", { message: errorMessage(error, "We could not open that ticket.") });
    }
  }

  if (isLoading) return <p className="text-muted-foreground">Loading your orders…</p>;

  if (!preselected) {
    return (
      <div>
        <PageHeader
          title="Open a ticket"
          description="Choose the order you would like help with."
        />
        {!chooserOrders.length ? (
          <EmptyState
            title="Every order already has a ticket"
            description="To follow something up, re-open the existing ticket for that order."
            action={
              <Button asChild variant="outline">
                <Link to="/tickets">Go to my tickets</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {chooserOrders.map((order) => (
              <Link key={order.id} to={`/tickets/new?order=${order.id}`} className="block">
                <Card className="flex-row items-center justify-between gap-4 p-5 transition-colors hover:bg-secondary/40">
                  <div>
                    <p className="font-display text-lg">{order.number}</p>
                    <p className="text-sm text-muted-foreground">
                      Placed {formatDate(order.placed_at)}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  const errors = form.formState.errors as Record<string, { message?: string }>;

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
        <Link to="/tickets/new">
          <ArrowLeft className="size-4" />
          Choose a different order
        </Link>
      </Button>

      <PageHeader
        title="Open a ticket"
        description={selectedOrder ? `About order ${selectedOrder.number}` : undefined}
      />

      {selectedOrder && (
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-3">
            <OrderStatusBadge status={selectedOrder.status} />
            <span className="text-sm text-muted-foreground">{KIND_INTRO[kind]}</span>
          </div>
          {kind === "SHIPMENT_REQUEST" && selectedOrder.driver && (
            <DriverCard driver={selectedOrder.driver} trackingCode={selectedOrder.tracking_code} />
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {kind === "DELIVERY_ISSUE"
              ? "Report a problem"
              : kind === "SHIPMENT_REQUEST"
                ? "Request a change"
                : "Message support"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {errors.root?.message && (
              <Alert variant="destructive">
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}

            {kind === "SHIPMENT_REQUEST" ? (
              <div className="space-y-2">
                <Label htmlFor="requestType">What would you like us to do?</Label>
                <Controller
                  control={form.control}
                  name={"requestType" as never}
                  render={({ field }) => (
                    <Select value={field.value as string} onValueChange={field.onChange}>
                      <SelectTrigger id="requestType" className="w-full">
                        <SelectValue placeholder="Choose a request" />
                      </SelectTrigger>
                      <SelectContent>
                        {SHIPMENT_REQUEST_TYPES.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.requestType?.message && (
                  <p className="text-sm text-destructive">{errors.requestType.message}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="A short summary"
                  {...form.register("subject" as never)}
                />
                {errors.subject?.message && (
                  <p className="text-sm text-destructive">{errors.subject.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="body">
                {kind === "DELIVERY_ISSUE" ? "What went wrong?" : "Your message"}
              </Label>
              <Textarea
                id="body"
                rows={5}
                placeholder={
                  kind === "DELIVERY_ISSUE"
                    ? "Tell us what arrived and what was wrong with it."
                    : "How can we help?"
                }
                {...form.register(
                  (kind === "DELIVERY_ISSUE" ? "description" : "message") as never,
                )}
              />
              {(errors.description?.message || errors.message?.message) && (
                <p className="text-sm text-destructive">
                  {errors.description?.message ?? errors.message?.message}
                </p>
              )}
            </div>

            {kind === "DELIVERY_ISSUE" && (
              <div className="space-y-2">
                <Label>Photos</Label>
                <p className="text-sm text-muted-foreground">
                  JPEG, PNG or WebP, up to 5 MB each.
                </p>
                <Controller
                  control={form.control}
                  name={"photos" as never}
                  render={({ field }) => (
                    <PhotoPicker
                      value={(field.value as File[]) ?? []}
                      onChange={field.onChange}
                      disabled={form.formState.isSubmitting}
                    />
                  )}
                />
                {photoErrors(errors.photos).map((problem) => (
                  <p key={problem} className="text-sm text-destructive">
                    {problem}
                  </p>
                ))}
              </div>
            )}

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Open ticket
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
