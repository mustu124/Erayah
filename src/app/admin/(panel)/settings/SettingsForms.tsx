"use client";

import { useState } from "react";

import { useAdminAction } from "@/components/admin/use-action";
import { Labeled, TextArea, TextInput, Toggle } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { saveSettings } from "@/lib/admin/actions/settings";

type Settings = {
  businessName: string;
  businessAddress: string;
  gstin: string;
  gstRate: string;
  pricesIncludeGst: boolean;
  invoicePrefix: string;
  whatsappNumber: string;
  supportEmail: string;
  supportPhone: string;
  instagramUrl: string;
  businessHours: string;
};

export function SettingsForm({ initial }: { initial: Settings }) {
  const [v, setV] = useState(initial);
  const save = useAdminAction(saveSettings);
  const f = save.fields;
  const set = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (v.invoicePrefix !== initial.invoicePrefix && !window.confirm("Changing the prefix changes how new order numbers start. Continue?")) return;
        save.run({ ...v, gstRate: v.gstRate as unknown as number });
      }}
      className="space-y-6"
    >
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-body text-label font-medium text-ink uppercase">Business (printed on invoices)</legend>
        <Labeled label="Legal business name" htmlFor="biz-name" error={f.businessName}>
          <TextInput id="biz-name" value={v.businessName} onChange={set("businessName")} maxLength={120} />
        </Labeled>
        <Labeled label="GSTIN" htmlFor="gstin" error={f.gstin} hint="Leave empty if not registered. With a GSTIN, invoices become tax invoices.">
          <TextInput id="gstin" value={v.gstin} onChange={(e) => setV({ ...v, gstin: e.target.value.toUpperCase() })} maxLength={15} className="uppercase" />
        </Labeled>
        <Labeled label="Registered address" htmlFor="biz-address" className="sm:col-span-2">
          <TextArea id="biz-address" rows={2} value={v.businessAddress} onChange={set("businessAddress")} maxLength={400} />
        </Labeled>
        <Labeled label="GST rate (%)" htmlFor="gst-rate" error={f.gstRate}>
          <TextInput id="gst-rate" inputMode="decimal" value={v.gstRate} onChange={set("gstRate")} />
        </Labeled>
        <div className="flex items-end">
          <Toggle checked={v.pricesIncludeGst} onChange={(pricesIncludeGst) => setV({ ...v, pricesIncludeGst })} label={v.pricesIncludeGst ? "Prices include GST" : "GST is added at checkout"} />
        </div>
        <Labeled label="Order and invoice prefix" htmlFor="prefix" error={f.invoicePrefix} hint="e.g. ERY → ERY-2026-00001">
          <TextInput id="prefix" value={v.invoicePrefix} onChange={(e) => setV({ ...v, invoicePrefix: e.target.value.toUpperCase() })} maxLength={5} className="uppercase" />
        </Labeled>
      </fieldset>

      <fieldset className="grid gap-4 border-t border-mist pt-5 sm:grid-cols-2">
        <legend className="mb-2 pt-5 font-body text-label font-medium text-ink uppercase">Contact (shown on the site)</legend>
        <Labeled label="WhatsApp number" htmlFor="whatsapp" error={f.whatsappNumber} hint="With country code, e.g. 919876543210. Used by every WhatsApp button.">
          <TextInput id="whatsapp" inputMode="tel" value={v.whatsappNumber} onChange={set("whatsappNumber")} maxLength={20} />
        </Labeled>
        <Labeled label="Instagram link" htmlFor="instagram" error={f.instagramUrl}>
          <TextInput id="instagram" value={v.instagramUrl} onChange={set("instagramUrl")} maxLength={200} placeholder="https://www.instagram.com/erayah" />
        </Labeled>
        <Labeled label="Support email" htmlFor="support-email" error={f.supportEmail}>
          <TextInput id="support-email" type="email" value={v.supportEmail} onChange={set("supportEmail")} maxLength={200} />
        </Labeled>
        <Labeled label="Support phone" htmlFor="support-phone">
          <TextInput id="support-phone" inputMode="tel" value={v.supportPhone} onChange={set("supportPhone")} maxLength={30} />
        </Labeled>
        <Labeled label="Business hours" htmlFor="business-hours" className="sm:col-span-2" hint="Shown on the Contact page, e.g. Monday to Saturday, 10 am to 7 pm.">
          <TextInput id="business-hours" value={v.businessHours} onChange={set("businessHours")} maxLength={120} />
        </Labeled>
      </fieldset>

      <Button type="submit" disabled={save.pending}>
        {save.pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
