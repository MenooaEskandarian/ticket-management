import { z } from "zod";
import type { OrderStatus, TicketKind } from "@/types";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_PHOTOS = 5;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** The order's status decides the form, exactly as the server does. */
export function kindForOrderStatus(status: OrderStatus): TicketKind {
  if (status === "DELIVERED") return "DELIVERY_ISSUE";
  if (status === "SHIPPED") return "SHIPMENT_REQUEST";
  return "GENERAL";
}

export const SHIPMENT_REQUEST_TYPES = [
  { value: "RESCHEDULE", label: "Change the delivery time" },
  { value: "CHANGE_ADDRESS", label: "Change the delivery address" },
  { value: "LEAVE_SAFE", label: "Leave it in a safe place" },
  { value: "CONTACT_DRIVER", label: "Get a message to the driver" },
  { value: "OTHER", label: "Something else" },
] as const;

const MAX_FILE_MB = Math.round(MAX_FILE_BYTES / (1024 * 1024));

/**
 * Why a file was turned down, named so the customer knows which one to replace.
 * The picker uses this for immediate feedback; the schema below stays the
 * authority, so a file can never slip through by skipping the picker.
 */
export function rejectionReason(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) {
    return `${file.name} is larger than ${MAX_FILE_MB} MB.`;
  }
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name} is not a JPEG, PNG or WebP image.`;
  }
  return null;
}

const photo = z
  .instanceof(File)
  .refine((file) => file.size <= MAX_FILE_BYTES, `Each photo must be ${MAX_FILE_MB} MB or smaller.`)
  .refine(
    (file) => (ACCEPTED_TYPES as readonly string[]).includes(file.type),
    "Photos must be JPEG, PNG or WebP.",
  );

const order = z.number({ error: "Choose which order this is about." }).int().positive();

/** Report a problem with something that has already arrived. */
const deliveryIssue = z.object({
  kind: z.literal("DELIVERY_ISSUE"),
  order,
  subject: z.string().trim().min(3, "Give your report a short title.").max(180),
  description: z
    .string()
    .trim()
    .min(20, "Please describe the problem in a little more detail (20 characters or more)."),
  photos: z
    .array(photo)
    .min(1, "Add at least one photo of the problem.")
    .max(MAX_PHOTOS, `Add up to ${MAX_PHOTOS} photos.`),
});

/** Ask for something to change while the order is with the driver. */
const shipmentRequest = z.object({
  kind: z.literal("SHIPMENT_REQUEST"),
  order,
  requestType: z.enum(
    SHIPMENT_REQUEST_TYPES.map((option) => option.value) as [string, ...string[]],
    { error: "Choose what you would like us to do." },
  ),
  message: z.string().trim().min(10, "Tell us a little more (10 characters or more)."),
});

/** Anything else: a plain message to the support team. */
const general = z.object({
  kind: z.literal("GENERAL"),
  order,
  subject: z.string().trim().min(3, "Give your message a short title.").max(180),
  message: z.string().trim().min(10, "Tell us a little more (10 characters or more)."),
});

export const ticketSchema = z.discriminatedUnion("kind", [
  deliveryIssue,
  shipmentRequest,
  general,
]);

export type TicketFormValues = z.infer<typeof ticketSchema>;

export const schemaForKind = {
  DELIVERY_ISSUE: deliveryIssue,
  SHIPMENT_REQUEST: shipmentRequest,
  GENERAL: general,
} as const;

/** Flatten whichever variant was filled in into the multipart body the API takes. */
export function toFormData(values: TicketFormValues): FormData {
  const form = new FormData();
  form.append("order", String(values.order));

  if (values.kind === "DELIVERY_ISSUE") {
    form.append("subject", values.subject);
    form.append("body", values.description);
    values.photos.forEach((file) => form.append("attachments", file));
  } else if (values.kind === "SHIPMENT_REQUEST") {
    const label = SHIPMENT_REQUEST_TYPES.find((o) => o.value === values.requestType)?.label ?? "";
    form.append("subject", label);
    form.append("body", values.message);
  } else {
    form.append("subject", values.subject);
    form.append("body", values.message);
  }

  return form;
}
