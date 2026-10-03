import "server-only";

import { timingSafeEqual } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/types";

// Orders are private: a customer sees one only with its order number AND the
// access token from their confirmation link. Never cached.

export type CustomerOrder = Tables<"orders"> & { items: Tables<"order_items">[] };
export type InvoiceSettings = Pick<
  Tables<"site_settings">,
  "business_name" | "business_address" | "gstin" | "gst_rate" | "prices_include_gst" | "support_email" | "whatsapp_number"
>;

const tokenMatches = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

async function loadOrder(column: "id" | "order_number", value: string): Promise<CustomerOrder | null> {
  const { data, error } = await createAdminClient()
    .from("orders")
    .select("*, items:order_items(*)")
    .eq(column, value)
    .order("id", { referencedTable: "order_items" })
    .maybeSingle();
  if (error) throw new Error(`load order: ${error.message}`);
  return data as CustomerOrder | null;
}

/** The order if `token` is its access token, else null. */
export async function getOrderForCustomer(orderNumber: string, token: string | null | undefined) {
  if (!token || !/^[0-9a-f]{64}$/.test(token) || !/^[A-Z0-9]{1,5}-\d{4}-\d{5,}$/.test(orderNumber)) return null;
  const order = await loadOrder("order_number", orderNumber);
  return order && tokenMatches(order.access_token, token) ? order : null;
}

export const getOrderById = (id: string) => loadOrder("id", id);

/** For the admin panel only (no token check: callers have checked the admin). */
export const getOrderByNumber = (orderNumber: string) =>
  /^[A-Z0-9]{1,5}-\d{4}-\d{5,}$/.test(orderNumber) ? loadOrder("order_number", orderNumber) : Promise.resolve(null);

export async function getInvoiceSettings(): Promise<InvoiceSettings> {
  const { data, error } = await createAdminClient()
    .from("site_settings")
    .select("business_name, business_address, gstin, gst_rate, prices_include_gst, support_email, whatsapp_number")
    .eq("id", 1)
    .single();
  if (error) throw new Error(`load settings: ${error.message}`);
  return data;
}
