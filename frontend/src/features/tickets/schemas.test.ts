import { describe, expect, it } from "vitest";
import { imageFile } from "@/test/utils";
import {
  MAX_FILE_BYTES,
  kindForOrderStatus,
  schemaForKind,
  toFormData,
  type TicketFormValues,
} from "./schemas";

describe("kindForOrderStatus", () => {
  it("gives a delivered order the photo report form", () => {
    expect(kindForOrderStatus("DELIVERED")).toBe("DELIVERY_ISSUE");
  });

  it("gives a shipped order the shipment request form", () => {
    expect(kindForOrderStatus("SHIPPED")).toBe("SHIPMENT_REQUEST");
  });

  it.each(["AWAITING_PAYMENT", "PAID", "IN_PREPARATION"] as const)(
    "gives a %s order the plain message form",
    (status) => {
      expect(kindForOrderStatus(status)).toBe("GENERAL");
    },
  );
});

describe("delivery issue schema", () => {
  const valid = {
    kind: "DELIVERY_ISSUE" as const,
    order: 1,
    subject: "Crushed on arrival",
    description: "Half the stems were snapped when the box arrived this morning.",
    photos: [imageFile()],
  };

  it("accepts a complete report", () => {
    expect(schemaForKind.DELIVERY_ISSUE.safeParse(valid).success).toBe(true);
  });

  it("requires at least one photo", () => {
    const result = schemaForKind.DELIVERY_ISSUE.safeParse({ ...valid, photos: [] });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("at least one photo");
  });

  it("rejects a photo over the size limit", () => {
    const oversized = imageFile("big.jpg", "image/jpeg", MAX_FILE_BYTES + 1);
    const result = schemaForKind.DELIVERY_ISSUE.safeParse({ ...valid, photos: [oversized] });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("5 MB or smaller");
  });

  it("rejects a file that is not an accepted image type", () => {
    const pdf = imageFile("invoice.pdf", "application/pdf");
    const result = schemaForKind.DELIVERY_ISSUE.safeParse({ ...valid, photos: [pdf] });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("JPEG, PNG or WebP");
  });

  it("wants a description with some substance to it", () => {
    expect(schemaForKind.DELIVERY_ISSUE.safeParse({ ...valid, description: "broken" }).success).toBe(
      false,
    );
  });
});

describe("toFormData", () => {
  it("sends the description as the body and attaches every photo", () => {
    const values: TicketFormValues = {
      kind: "DELIVERY_ISSUE",
      order: 7,
      subject: "Crushed on arrival",
      description: "Half the stems were snapped when the box arrived.",
      photos: [imageFile("a.jpg"), imageFile("b.jpg")],
    };

    const form = toFormData(values);

    expect(form.get("order")).toBe("7");
    expect(form.get("body")).toContain("Half the stems");
    expect(form.getAll("attachments")).toHaveLength(2);
  });

  it("turns the chosen shipment request into the subject", () => {
    const form = toFormData({
      kind: "SHIPMENT_REQUEST",
      order: 3,
      requestType: "RESCHEDULE",
      message: "Could the driver come after six?",
    });

    expect(form.get("subject")).toBe("Change the delivery time");
    expect(form.getAll("attachments")).toHaveLength(0);
  });
});
