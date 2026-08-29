import { cn } from "@/lib/utils";

/** Quietly says whether updates are arriving on their own. */
export function LiveIndicator({ connected }: { connected: boolean }) {
  return (
    <span
      className="flex items-center gap-1.5 text-xs text-muted-foreground"
      data-testid="live-indicator"
      data-connected={connected}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          connected ? "bg-sla-answered animate-pulse" : "bg-muted-foreground/40",
        )}
      />
      {connected ? "Live" : "Offline"}
    </span>
  );
}
