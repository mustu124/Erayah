// Razorpay Checkout (checkout.js), loaded only when the shopper pays.
// Docs: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/

export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  /** Logo in the payment window's header (URL or data URI). */
  image?: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  notes?: Record<string, string>;
  theme: { color: string };
  handler: (response: RazorpaySuccess) => void;
  modal: { ondismiss: () => void };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", cb: (response: { error: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loading: Promise<NonNullable<Window["Razorpay"]>> | null = null;

export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay unavailable")));
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("Couldn't load Razorpay"));
    };
    document.head.append(script);
  });
  return loading;
}

export type { RazorpayOptions };
