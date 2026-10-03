import type { Metadata } from "next";

import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

import { type AdminUser, AdminUsers, SettingsForm } from "./SettingsForms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const me = await requireAdminPage("owner");
  const db = createAdminClient();
  const [{ data: s }, { data: admins }] = await Promise.all([
    db.from("site_settings").select("*").eq("id", 1).single(),
    db.from("admin_users").select("user_id, email, role").order("created_at"),
  ]);
  const users: AdminUser[] = (admins ?? []).map((a) => ({ userId: a.user_id, email: a.email, role: a.role, you: a.user_id === me.userId }));

  return (
    <>
      <PageHeader title="Settings" description="Business details, contact links and who can use the admin." />
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
            }}
          />
        </Panel>
        <Panel title="Admin users">
          <AdminUsers users={users} />
        </Panel>
      </div>
    </>
  );
}
