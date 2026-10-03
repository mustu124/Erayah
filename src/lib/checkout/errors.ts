import type { CheckoutError } from "./types";

// Turns create_order's exception codes ("OUT_OF_STOCK:12") into what the shopper reads.

export function checkoutErrorFrom(message: string): CheckoutError & { status: number } {
  const [code, id] = message.split(":");
  switch (code) {
    case "OUT_OF_STOCK":
      return { status: 409, code, field: `item.${id}`, error: "Sorry, one of your pieces has just sold out. Please update your cart." };
    case "PRODUCT_UNAVAILABLE":
    case "VARIANT_UNAVAILABLE":
    case "VARIANT_REQUIRED":
      return { status: 409, code, field: `item.${id}`, error: "One of your pieces is no longer available. Please update your cart." };
    case "INVALID_QUANTITY":
      return { status: 400, code, field: `item.${id}`, error: "Please check the quantities in your cart." };
    case "EMPTY_CART":
      return { status: 400, code, error: "Your cart is empty." };
    case "GIFT_CARD_INVALID":
      return { status: 400, code, field: "giftCardCode", error: "This gift card isn't valid or has no balance left." };
    case "NO_SHIPPING_RULE":
      return { status: 400, code, field: "address.pincode", error: "We can't deliver to this pincode yet. Please message us on WhatsApp." };
    case "INVALID_ADDRESS":
      return { status: 400, code, error: "Please check your delivery details." };
    default:
      return { status: 500, code: "UNKNOWN", error: "Something went wrong on our side. Please try again." };
  }
}
