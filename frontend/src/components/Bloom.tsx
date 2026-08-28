import { cn } from "@/lib/utils";

/** The GolGift mark: five petals around a seed head. */
export function Bloom({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("shrink-0", className)}>
      {[
        [16, 8.5],
        [23.5, 14],
        [20.5, 22.5],
        [11.5, 22.5],
        [8.5, 14],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="6" fill="currentColor" opacity="0.55" />
      ))}
      <circle cx="16" cy="16" r="5" fill="currentColor" />
    </svg>
  );
}
