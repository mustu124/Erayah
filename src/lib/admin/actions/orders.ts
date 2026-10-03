"use server";

import { z } from "zod";

import { adminAction, AdminError, check, optionalText } from "@/lib/admin/action";
import { NEXT_STATUSES, ORDER_STATUSES, type OrderStatus, RESTOCK_ON } from "@/lib/admin/orders";
import { TAGS } from "@/lib/cache-tags";
import { createAdminClient } from "@/lib/supabase/admin";

const statusInput = z.object({
  orderId: z.uuid(),
  to: z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]]),
  note: optionalText(500),
});

/** Moves an order along (placed → confirmed → packed → shipped → delivered, or cancelled / returned / refunded). */
export const changeOrderStatus = adminAction(
  { schema: statusInput, tags: (i) => (RESTOCK_ON.includes(i.to) ? [TAGS.products] : []) },
  async ({ orderId, to, note }, admin) => {
    const db = createAdminClient();
    const order = check(await db.from("orders").select("status, payment_status").eq("id", orderId).single(), "order");
    if (!NEXT_STATUSES[order.status].includes(to)) {
      throw new AdminError(`An order that is “${order.status.replace("_", " ")}” can't be moved to “${to}”.`);
    }

    const update: { status: OrderStatus; payment_status?: "refunded" } = { status: to };
    if (to === "refunded") update.payment_status = "refunded";
    check(await db.from("orders").update(update).eq("id", orderId).eq("status", order.status), "order");
    check(
      await db.from("order_events").insert({ order_id: orderId, type: "status_change", from_value: order.status, to_value: to, note, actor_email: admin.email }),
      "order event",
    );

    let restocked = false;
    if (RESTOCK_ON.includes(to)) {
      const { data, error } = await db.rpc("restore_stock", { p_order_id: orderId });
      if (error) throw new Error(`restore_stock: ${error.message}`);
      restocked = Boolean(data);
    }
    return { message: restocked ? `Marked ${to}. The pieces are back in stock.` : `Marked ${to}.` };
  },
);

const recordsInput = z.object({
  orderId: z.uuid(),
  courierName: optionalText(80),
  trackingNumber: optionalText(80),
  internalNotes: optionalText(4000),
});

/** Courier, tracking number and internal notes: for the owner's records only, never shown to customers. */
export const saveOrderRecords = adminAction({ schema: recordsInput }, async ({ orderId, courierName, trackingNumber, internalNotes }, admin) => {
  const db = createAdminClient();
  const before = check(await db.from("orders").select("courier_name, tracking_number").eq("id", orderId).single(), "order");
  check(
    await db.from("orders").update({ courier_name: courierName, tracking_number: trackingNumber, internal_notes: internalNotes }).eq("id", orderId),
    "order",
  );
  if (before.courier_name !== courierName || before.tracking_number !== trackingNumber) {
    const parts = [courierName && `courier ${courierName}`, trackingNumber && `tracking ${trackingNumber}`].filter(Boolean);
    await db.from("order_events").insert({
      order_id: orderId,
      type: "note",
      note: parts.length ? `Shipping details: ${parts.join(", ")}` : "Shipping details cleared",
      actor_email: admin.email,
    });
  }
  return { message: "Saved." };
});

const noteInput = z.object({ orderId: z.uuid(), note: z.string().trim().min(1, "Write a note first.").max(1000) });

/** Adds a note to the order's timeline. */
export const addOrderNote = adminAction({ schema: noteInput }, async ({ orderId, note }, admin) => {
  check(await createAdminClient().from("order_events").insert({ order_id: orderId, type: "note", note, actor_email: admin.email }), "note");
  return { message: "Note added." };
});
