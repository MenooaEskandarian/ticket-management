import { describe, expect, it } from "vitest";
import { formatBytes, formatDateTime, formatMoney } from "./format";

describe("formatters", () => {
  it("renders timestamps in a readable, unambiguous form", () => {
    expect(formatDateTime("2026-03-12T14:05:00Z")).toMatch(/12 Mar 2026/);
  });

  it("falls back rather than printing Invalid Date", () => {
    expect(formatDateTime(null)).toBe("--");
    expect(formatDateTime("not-a-date")).toBe("--");
  });

  it("formats money and file sizes", () => {
    expect(formatMoney("48.00")).toBe("£48.00");
    expect(formatBytes(2048)).toBe("2 KB");
  });
});
