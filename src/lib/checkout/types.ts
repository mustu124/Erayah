// Shapes returned by the create_order database function and the checkout API.

export type QuoteLine = {
  product_id: number;
  slug: string;
  variant_label: string | null;
  name: string;
  image: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

/** create_order result (dry run or real). Amounts in paise. */
export type OrderQuote = {
  existing: boolean;
  order_id: string | null;
  order_number: string | null;
  access_token: string | null;
  status?: "pending_payment" | "placed" | "cancelled" | string;
  payment_status?: string;
  payment_method?: "razorpay" | "gift_card";
  subtotal: number;
  shipping_fee: number | null;
  gift_card_code: string | null;
  gift_card_amount: number;
  gst_amount: number;
  total: number;
  est_days_min?: number | null;
  est_days_max?: number | null;
  lines?: QuoteLine[];
  razorpay_order_id?: string | null;
};

/** /api/checkout/quote response. */
export type QuoteResponse = {
  lines: (QuoteLine & { imageUrl: string | null })[];
  subtotal: number;
  shippingFee: number | null;
  giftCardCode: string | null;
  giftCardAmount: number;
  gstAmount: number;
  total: number;
  estDaysMin: number | null;
  estDaysMax: number | null;
};

/** /api/checkout/create response. */
export type CreateResponse =
  | { kind: "placed"; orderNumber: string; accessToken: string }
  | {
      kind: "razorpay";
      orderNumber: string;
      /** Lets the browser open the order page even if /verify can't be reached (the webhook still confirms). */
      accessToken: string;
      keyId: string;
      razorpayOrderId: string;
      amount: number;
      currency: "INR";
      prefill: { name: string; email: string; contact: string };
    };

/** Error body from any checkout route. `field` points at the form field to fix. */
export type CheckoutError = { error: string; code?: string; field?: string; fields?: Record<string, string> };
