"use client";

import { useState } from "react";

import { useAdminAction } from "@/components/admin/use-action";
import { Labeled, STATUS_LABELS, TextArea, TextInput } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { addOrderNote, changeOrderStatus, saveOrderRecords } from "@/lib/admin/actions/orders";

const HINTS: Record<string, string> = {
  confirmed: "You've checked the order and will prepare it.",
  packed: "It's packed and waiting for the courier.",
  shipped: "Handed to the courier. Add the courier and tracking number below for your records.",
  delivered: "The customer has received it.",
  cancelled: "Puts the pieces back in stock. Refund any payment from the Razorpay dashboard.",
  returned: "The pieces came back. They go back into stock.",
  refunded: "You've refunded the payment in Razorpay.",
};

export function StatusForm({ orderId, next }: { orderId: string; next: string[] }) {
  const [to, setTo] = useState(next[0] ?? "");
  const [note, setNote] = useState("");
  const { run, pending } = useAdminAction(changeOrderStatus);

  if (!next.length) return <p className="text-body-sm text-ink/60">This order is complete. No further status changes.</p>;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if ((to === "cancelled" || to === "refunded") && !window.confirm(`Mark this order as ${STATUS_LABELS[to].toLowerCase()}?`)) return;
        const r = await run({ orderId, to: to as never, note });
        if (r.ok) setNote("");
      }}
      className="space-y-3"
    >
      <fieldset>
        <legend className="mb-2 text-body-sm text-ink">Move to</legend>
        <div className="flex flex-wrap gap-2">
          {next.map((s) => (
            <label key={s} className={`inline-flex min-h-11 cursor-pointer items-center rounded-xs border px-4 text-body-sm ${to === s ? "border-ink bg-ink text-ivory" : "border-mist hover:border-ink/40"}`}>
              <input type="radio" name="to" value={s} checked={to === s} onChange={() => setTo(s)} className="sr-only" />
              {STATUS_LABELS[s]}
            </label>
          ))}
        </div>
        {HINTS[to] ? <p className="mt-2 text-caption text-ink/65">{HINTS[to]}</p> : null}
      </fieldset>
      <Labeled label="Note (optional)" htmlFor="status-note">
        <TextInput id="status-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="e.g. Customer asked to cancel on WhatsApp" />
      </Labeled>
      <Button type="submit" disabled={pending || !to}>
        {pending ? "Saving…" : `Mark as ${STATUS_LABELS[to]?.toLowerCase() ?? ""}`}
      </Button>
    </form>
  );
}

type Records = { courierName: string; trackingNumber: string; internalNotes: string };

export function RecordsForm({ orderId, initial }: { orderId: string; initial: Records }) {
  const [v, setV] = useState(initial);
  const { run, pending } = useAdminAction(saveOrderRecords);
  const set = (k: keyof Records) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run({ orderId, ...v });
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Courier" htmlFor="courier">
          <TextInput id="courier" value={v.courierName} onChange={set("courierName")} maxLength={80} placeholder="e.g. Delhivery" />
        </Labeled>
        <Labeled label="Tracking number" htmlFor="tracking">
          <TextInput id="tracking" value={v.trackingNumber} onChange={set("trackingNumber")} maxLength={80} />
        </Labeled>
      </div>
      <Labeled label="Internal notes" htmlFor="internal-notes" hint="Only you and your staff see these.">
        <TextArea id="internal-notes" rows={3} value={v.internalNotes} onChange={set("internalNotes")} maxLength={4000} />
      </Labeled>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function NoteForm({ orderId }: { orderId: string }) {
  const [note, setNote] = useState("");
  const { run, pending } = useAdminAction(addOrderNote);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if ((await run({ orderId, note })).ok) setNote("");
      }}
      className="flex gap-2"
    >
      <label htmlFor="timeline-note" className="sr-only">
        Add a note to the timeline
      </label>
      <TextInput id="timeline-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Add a note to the timeline" />
      <Button type="submit" variant="outline" disabled={pending || !note.trim()} className="shrink-0 px-5">
        Add
      </Button>
    </form>
  );
}
