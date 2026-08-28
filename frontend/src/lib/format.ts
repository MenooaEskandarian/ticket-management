import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

/** "12 Mar 2026, 14:05" -- readable, unambiguous, no locale surprises. */
export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value);
  return date ? format(date, "d MMM yyyy, HH:mm") : "--";
}

export function formatDate(value: string | null | undefined): string {
  const date = toDate(value);
  return date ? format(date, "d MMM yyyy") : "--";
}

export function formatRelative(value: string | null | undefined): string {
  const date = toDate(value);
  return date ? `${formatDistanceToNow(date)} ago` : "never";
}

export function formatMoney(amount: string | number): string {
  const value = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(
    Number.isFinite(value) ? value : 0,
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
