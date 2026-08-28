import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SlaLevel, TicketKind, TicketStatus } from "@/types";

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  PENDING: "Pending",
  CLOSED: "Closed",
};

const STATUS_TONES: Record<TicketStatus, string> = {
  OPEN: "bg-primary/15 text-primary",
  PENDING: "bg-accent text-accent-foreground",
  CLOSED: "bg-muted text-muted-foreground",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", STATUS_TONES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

const SLA_LABELS: Record<SlaLevel, string> = {
  ANSWERED: "Answered",
  WAITING: "Awaiting reply",
  WARNING: "Over 24h",
  CRITICAL: "Over 72h",
};

/**
 * Green answered, amber past 24 hours, red past 72. "Awaiting reply" covers the
 * gap the brief leaves open: unanswered, but not yet late.
 */
const SLA_TONES: Record<SlaLevel, string> = {
  ANSWERED: "bg-sla-answered-soft text-sla-answered",
  WAITING: "bg-sla-waiting-soft text-sla-waiting",
  WARNING: "bg-sla-warning-soft text-sla-warning",
  CRITICAL: "bg-sla-critical-soft text-sla-critical",
};

export function SlaBadge({ level }: { level: SlaLevel }) {
  return (
    <Badge
      variant="secondary"
      className={cn("border-transparent gap-1.5", SLA_TONES[level])}
      data-sla={level}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {SLA_LABELS[level]}
    </Badge>
  );
}

const KIND_LABELS: Record<TicketKind, string> = {
  DELIVERY_ISSUE: "Delivery problem",
  SHIPMENT_REQUEST: "Shipment request",
  GENERAL: "General",
};

export function TicketKindBadge({ kind }: { kind: TicketKind }) {
  return <Badge variant="outline">{KIND_LABELS[kind]}</Badge>;
}
