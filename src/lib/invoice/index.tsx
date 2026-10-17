import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import sharp from "sharp";
import { revalidateTag } from "next/cache";

import { TAGS } from "@/lib/cache-tags";
import { type CustomerOrder, getInvoiceSettings, getOrderById } from "@/lib/data/order";
import { createAdminClient } from "@/lib/supabase/admin";

import { InvoiceDocument } from "./InvoiceDocument";

const BUCKET = "invoices";

/**
 * A small JPEG of each piece's photo (as it was when ordered), keyed by order
 * item id. Read from Storage once, when the invoice is first made; the PDF is
 * then stored. PDFs can't show WebP, hence the conversion. A missing photo
 * just leaves its row without one.
 */
async function itemThumbnails(order: CustomerOrder): Promise<Record<number, Buffer>> {
  const storage = createAdminClient().storage.from("product-images");
  const entries = await Promise.all(
    order.items.map(async (item) => {
      if (!item.image_path_snapshot) return null;
      try {
        const { data } = await storage.download(item.image_path_snapshot);
        if (!data) return null;
        const jpeg = await sharp(Buffer.from(await data.arrayBuffer()))
          .resize(144, 144, { fit: "cover" })
          .flatten({ background: "#f9eee1" })
          .jpeg({ quality: 80 })
          .toBuffer();
        return [item.id, jpeg] as const;
      } catch (error) {
        console.error(`invoice photo ${order.order_number}:`, (error as Error).message);
        return null;
      }
    }),
  );
  return Object.fromEntries(entries.filter((e) => e !== null));
}

export const renderInvoice = async (order: CustomerOrder) => {
  const [settings, photos] = await Promise.all([getInvoiceSettings(), itemThumbnails(order)]);
  return renderToBuffer(<InvoiceDocument order={order} settings={settings} photos={photos} />);
};

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

