"use client";

import { useState, useTransition } from "react";

import { useAdminAction } from "@/components/admin/use-action";
import { inputCls, Labeled, TextInput, Toggle } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { deleteShippingRule, saveShippingRule, testShippingQuote } from "@/lib/admin/actions/shipping";
import { INDIAN_STATES } from "@/lib/checkout/states";
import { formatPrice } from "@/lib/format/price";

export type Rule = {
  id: number;
  name: string;
  matchType: "default" | "state" | "pincode_prefix";
  matchValue: string;
  rate: number;
  freeAbove: number | null;
  estDaysMin: number;
  estDaysMax: number;
  priority: number;
  isActive: boolean;
};

const BLANK: Omit<Rule, "id"> = { name: "", matchType: "state", matchValue: "", rate: 10000, freeAbove: null, estDaysMin: 7, estDaysMax: 10, priority: 0, isActive: true };
const r2 = (paise: number | null) => (paise === null ? "" : String(paise / 100));

export function RuleForm({ rule }: { rule?: Rule }) {
  const init = rule ?? { ...BLANK, id: 0 };
  const [v, setV] = useState({ ...init, rate: r2(init.rate), freeAbove: r2(init.freeAbove) });
  const save = useAdminAction(saveShippingRule);
  const remove = useAdminAction(deleteShippingRule);
  const f = save.fields;
  const id = rule ? `rule-${rule.id}` : "rule-new";
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await save.run({
          id: rule?.id ?? null,
          name: v.name,
          matchType: v.matchType,
          matchValue: v.matchValue,
          rate: v.rate.replace(/[₹,\s]/g, "") as unknown as number,
          freeAbove: v.freeAbove.trim() ? (v.freeAbove.replace(/[₹,\s]/g, "") as unknown as number) : null,
          estDaysMin: v.estDaysMin,
          estDaysMax: v.estDaysMax,
          priority: v.priority,
          isActive: v.isActive,
        });
        if (r.ok && !rule) setV({ ...BLANK, id: 0, rate: r2(BLANK.rate), freeAbove: "" });
      }}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <Labeled label="Name" htmlFor={`${id}-name`} error={f.name}>
        <TextInput id={`${id}-name`} value={v.name} onChange={set("name")} maxLength={80} placeholder="e.g. Maharashtra" />
      </Labeled>
      <Labeled label="Applies to" htmlFor={`${id}-type`}>
        <select id={`${id}-type`} value={v.matchType} onChange={(e) => setV({ ...v, matchType: e.target.value as Rule["matchType"], matchValue: "" })} className={inputCls}>
          <option value="default">Everywhere else (default)</option>
          <option value="state">A state</option>
          <option value="pincode_prefix">Pincodes starting with…</option>
        </select>
      </Labeled>
      {v.matchType === "state" ? (
        <Labeled label="State" htmlFor={`${id}-value`} error={f.matchValue}>
          <select id={`${id}-value`} value={v.matchValue} onChange={set("matchValue")} className={inputCls}>
            <option value="">Choose a state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Labeled>
      ) : v.matchType === "pincode_prefix" ? (
        <Labeled label="Pincode starts with" htmlFor={`${id}-value`} error={f.matchValue}>
          <TextInput id={`${id}-value`} inputMode="numeric" maxLength={6} value={v.matchValue} onChange={set("matchValue")} placeholder="400" />
        </Labeled>
      ) : (
        <div className="hidden lg:block" />
      )}
      <Labeled label="Charge (₹)" htmlFor={`${id}-rate`} error={f.rate}>
        <TextInput id={`${id}-rate`} inputMode="decimal" value={v.rate} onChange={set("rate")} />
      </Labeled>
      <Labeled label="Free above (₹, optional)" htmlFor={`${id}-free`} error={f.freeAbove}>
        <TextInput id={`${id}-free`} inputMode="decimal" value={v.freeAbove} onChange={set("freeAbove")} placeholder="No free shipping" />
      </Labeled>
      <Labeled label="Delivery (working days)" htmlFor={`${id}-min`} error={f.estDaysMax ?? f.estDaysMin}>
        <div className="flex items-center gap-2">
          <TextInput id={`${id}-min`} type="number" min={1} value={v.estDaysMin} onChange={(e) => setV({ ...v, estDaysMin: Number(e.target.value) })} aria-label="Earliest" />
          <span>to</span>
          <TextInput type="number" min={1} value={v.estDaysMax} onChange={(e) => setV({ ...v, estDaysMax: Number(e.target.value) })} aria-label="Latest" />
        </div>
      </Labeled>
      <Labeled label="Priority" htmlFor={`${id}-priority`} hint="Higher wins when two rules of the same kind match.">
        <TextInput id={`${id}-priority`} type="number" value={v.priority} onChange={(e) => setV({ ...v, priority: Number(e.target.value) })} />
      </Labeled>
      <div className="flex items-end">
        <Toggle checked={v.isActive} onChange={(isActive) => setV({ ...v, isActive })} label={v.isActive ? "On" : "Off"} />
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit" disabled={save.pending}>
          {save.pending ? "Saving…" : rule ? "Save rule" : "Add rule"}
        </Button>
        {rule ? (
          <Button variant="link" className="px-3 text-plum" onClick={() => window.confirm("Remove this rule?") && remove.run({ id: rule.id })}>
            Remove
          </Button>
        ) : null}
      </div>
    </form>
  );
}

type Result = Awaited<ReturnType<typeof testShippingQuote>>;

export function QuoteTester() {
  const [pincode, setPincode] = useState("");
  const [state, setState] = useState("");
  const [value, setValue] = useState("3000");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => setResult(await testShippingQuote({ pincode, state, cartValue: value })));
        }}
        className="grid gap-3 sm:grid-cols-[1fr_1.4fr_1fr_auto]"
      >
        <Labeled label="Pincode" htmlFor="test-pin">
          <TextInput id="test-pin" inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value)} />
        </Labeled>
        <Labeled label="State (as at checkout)" htmlFor="test-state">
          <select id="test-state" value={state} onChange={(e) => setState(e.target.value)} className={inputCls}>
            <option value="">Not given</option>
            {INDIAN_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Cart value (₹)" htmlFor="test-value">
          <TextInput id="test-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </Labeled>
        <div className="flex items-end">
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Checking…" : "Check"}
          </Button>
        </div>
      </form>
      {result ? (
        <p role="status" className="mt-3 bg-ivory px-4 py-3 text-body-sm">
          {"error" in result ? (
            result.error
          ) : (
            <>
              <strong className="font-medium">{result.fee === 0 ? "Free shipping" : `${formatPrice(result.fee)} shipping`}</strong>, delivered in {result.estDaysMin}–{result.estDaysMax} working days. Rule:{" "}
              {result.rule?.name ?? "—"}
              {result.rule?.free_above && result.fee === 0 ? ` (free above ${formatPrice(result.rule.free_above)})` : ""}.
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}
