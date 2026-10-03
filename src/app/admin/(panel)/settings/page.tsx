import type { Metadata } from "next";

import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

import { SettingsForm } from "./SettingsForms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdminPage("owner");
  const { data: s } = await createAdminClient().from("site_settings").select("*").eq("id", 1).single();

  return (
    <>
      <PageHeader title="Settings" description="Business details and contact links." />
      <div className="space-y-6">
        <Panel>
          <SettingsForm
            initial={{
              businessName: s?.business_name ?? "Erayah",
              businessAddress: s?.business_address ?? "",
              gstin: s?.gstin ?? "",
              gstRate: String(s?.gst_rate ?? 3),
              pricesIncludeGst: s?.prices_include_gst ?? true,
              invoicePrefix: s?.invoice_prefix ?? "ERY",
              whatsappNumber: s?.whatsapp_number ?? "",
              supportEmail: s?.support_email ?? "",
              supportPhone: s?.support_phone ?? "",
              instagramUrl: s?.instagram_url ?? "",
              businessHours: s?.business_hours ?? "",
            }}
          />
        </Panel>
      </div>
    </>
  );
}
