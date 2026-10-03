import { z } from "zod";

import { MAX_QUANTITY } from "@/stores/cart";

import { INDIAN_STATES } from "./states";

// Checkout validation, shared by the form (browser) and the API routes (server).

export const PINCODE_RE = /^[1-9]\d{5}$/;

const text = (max: number) => z.string().trim().max(max);
// Accepts "", null or missing (the browser sends its already-parsed form, where blanks are null).
const optional = (max: number) =>
  text(max)
    .nullish()
    .transform((v) => v || null);

export const cartItemSchema = z.object({
  productId: z.number().int().positive(),
  variantLabel: z.string().trim().max(60).nullable().optional(),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
});

export const itemsSchema = z.array(cartItemSchema).min(1, "Your cart is empty.").max(50);

export const giftCardCodeSchema = z
  .string()
  .trim()
  .max(40)
  .nullish()
  .transform((v) => v?.toUpperCase() || null);

export const contactSchema = z.object({
  email: z.email("Please enter a valid email address.").trim().max(200),
  // Indian mobile numbers: 10 digits starting 6–9. "+91", spaces and dashes are tolerated.
  phone: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|91|0)(?=\d{10}$)/, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Please enter a 10-digit mobile number.")),
});

export const addressSchema = z.object({
  name: text(100).min(2, "Please enter the full name."),
  pincode: z.string().trim().regex(PINCODE_RE, "Please enter a 6-digit pincode."),
  line1: text(200).min(3, "Please enter the house number and street."),
  line2: optional(200),
  landmark: optional(120),
  city: text(80).min(2, "Please enter the city."),
  state: z.enum(INDIAN_STATES, "Please choose a state."),
});

export const checkoutSchema = z.object({
  contact: contactSchema,
  address: addressSchema,
  isGift: z.boolean().default(false),
  giftNote: optional(500),
  giftCardCode: giftCardCodeSchema,
});

export type CheckoutForm = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;

/** POST /api/checkout/quote */
export const quoteRequestSchema = z.object({
  items: itemsSchema,
  pincode: z.string().trim().regex(PINCODE_RE).optional().or(z.literal("").transform(() => undefined)),
  state: z.enum(INDIAN_STATES).optional().or(z.literal("").transform(() => undefined)),
  giftCardCode: giftCardCodeSchema,
});

/** POST /api/checkout/create */
export const createRequestSchema = checkoutSchema.extend({
  items: itemsSchema,
  idempotencyKey: z.string().regex(/^[\w-]{16,80}$/),
});

/** POST /api/checkout/verify (what Razorpay Checkout hands back). */
export const verifyRequestSchema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().regex(/^[0-9a-f]{64}$/),
});

/** First message of each field's error, keyed by dotted path ("address.pincode"). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    out[key] ??= issue.message;
  }
  return out;
}
