import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { revalidateTag } from "next/cache";

import { TAGS } from "@/lib/cache-tags";
import { type CustomerOrder, getInvoiceSettings, getOrderById } from "@/lib/data/order";
import { createAdminClient } from "@/lib/supabase/admin";

import { InvoiceDocument } from "./InvoiceDocument";

const BUCKET = "invoices";

export const renderInvoice = async (order: CustomerOrder) =>
  renderToBuffer(<InvoiceDocument order={order} settings={await getInvoiceSettings()} />);

/**
 * The stored invoice PDF for a paid order, made on first call. Returns the PDF
 * bytes. Safe to call twice at once: the upload upserts the same file.
 */
export async function ensureInvoice(order: CustomerOrder): Promise<Buffer> {
  const supabase = createAdminClient();
  if (order.invoice_path) {
    const { data } = await supabase.storage.from(BUCKET).download(order.invoice_path);
    if (data) return Buffer.from(await data.arrayBuffer());
  }

  const pdf = await renderInvoice(order);
  const filePath = `${order.created_at.slice(0, 4)}/${order.order_number}.pdf`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, pdf, { contentType: "application/pdf", upsert: true });
  if (error) {
    // The download route can render on the fly, so a failed upload isn't fatal.
    console.error(`invoice upload ${order.order_number}:`, error.message);
    return pdf;
  }
  await supabase.from("orders").update({ invoice_path: filePath }).eq("id", order.id);
  return pdf;
}

/**
 * Runs once after an order is placed (from /verify, the webhook or a fully
 * gift-carded order): store the invoice and refresh stock on product pages.
 */
export async function afterOrderPlaced(orderId: string) {
  // Every product read is tagged "products", so this refreshes stock everywhere.
  revalidateTag(TAGS.products, "max");
  const order = await getOrderById(orderId);
  if (!order) return;
  try {
    await ensureInvoice(order);
  } catch (error) {
    console.error(`invoice ${order.order_number}:`, error);
  }
}

