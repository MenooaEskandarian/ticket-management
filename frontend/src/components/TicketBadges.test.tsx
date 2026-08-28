import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SlaLevel } from "@/types";
import { SlaBadge } from "./TicketBadges";

describe("SlaBadge", () => {
  it.each([
    ["ANSWERED", "Answered", "text-sla-answered"],
    ["WAITING", "Awaiting reply", "text-sla-waiting"],
    ["WARNING", "Over 24h", "text-sla-warning"],
    ["CRITICAL", "Over 72h", "text-sla-critical"],
  ] as [SlaLevel, string, string][])(
    "renders %s as %s in its own colour",
    (level, label, tone) => {
      render(<SlaBadge level={level} />);

      const badge = screen.getByText(label).closest("[data-sla]");
      expect(badge).toHaveAttribute("data-sla", level);
      expect(badge?.className).toContain(tone);
    },
  );
});
