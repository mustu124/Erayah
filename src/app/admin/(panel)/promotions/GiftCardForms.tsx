"use client";

import { useState } from "react";

import { useAdminAction } from "@/components/admin/use-action";
import { Labeled, TextInput } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { createGiftCard, setGiftCardActive } from "@/lib/admin/actions/promotions";

// No 0/O or 1/I, so codes read clearly over the phone.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generate = () => "ERY" + Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => ALPHABET[b % ALPHABET.length]).join("");

export function NewGiftCard() {
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [expires, setExpires] = useState("");
  const [note, setNote] = useState("");
  const create = useAdminAction(createGiftCard);
  const f = create.fields;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await create.run({ code, amount: amount.replace(/[₹,\s]/g, "") as unknown as number, expiresOn: expires || null, note });
        if (r.ok) {
          setCode("");
          setAmount("");
          setExpires("");
          setNote("");
        }
      }}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <Labeled label="Code" htmlFor="gc-code" error={f.code}>
        <div className="flex gap-2">
          <TextInput id="gc-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={32} className="uppercase" />
          <Button variant="outline" className="shrink-0 px-3" onClick={() => setCode(generate())}>
            Generate
          </Button>
        </div>
      </Labeled>
      <Labeled label="Amount (₹)" htmlFor="gc-amount" error={f.amount}>
        <TextInput id="gc-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="2000" />
      </Labeled>
      <Labeled label="Expires (optional)" htmlFor="gc-expires" hint="Usable until the end of this day.">
        <TextInput id="gc-expires" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
      </Labeled>
      <Labeled label="Note (optional)" htmlFor="gc-note" hint="Who it's for, why it was issued.">
        <TextInput id="gc-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      </Labeled>
      <div className="sm:col-span-2 lg:col-span-4">
        <Button type="submit" disabled={create.pending}>
          {create.pending ? "Creating…" : "Create gift card"}
        </Button>
      </div>
    </form>
  );
}

export function ActiveToggle({ id, active }: { id: number; active: boolean }) {
  const toggle = useAdminAction(setGiftCardActive);
  return (
    <Button
      variant="link"
      className="min-h-9 px-0"
      disabled={toggle.pending}
      onClick={() => {
        if (active && !window.confirm("Deactivate this gift card? It won't work at checkout.")) return;
        toggle.run({ id, active: !active });
      }}
    >
      {active ? "Deactivate" : "Reactivate"}
    </Button>
  );
}
