import type { Metadata } from "next";

import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

import { QuoteTester, type Rule, RuleForm } from "./ShippingForms";

export const metadata: Metadata = { title: "Shipping" };

const KIND_ORDER = { pincode_prefix: 0, state: 1, default: 2 } as const;

export default async function ShippingPage() {
  await requireAdminPage("owner");
  const { data } = await createAdminClient().from("shipping_rules").select("*").order("priority", { ascending: false }).order("id");
  const rules: Rule[] = (data ?? [])
    .map((r) => ({
      id: r.id,
      name: r.name,
      matchType: r.match_type,
      matchValue: r.match_value ?? "",
      rate: r.rate,
      freeAbove: r.free_above,
      estDaysMin: r.est_days_min,
      estDaysMax: r.est_days_max,
      priority: r.priority,
      isActive: r.is_active,
    }))
    .sort((a, b) => KIND_ORDER[a.matchType] - KIND_ORDER[b.matchType]);

  return (
    <>
      <PageHeader
        title="Shipping"
        description="The most specific rule wins: a pincode rule (longest match) beats a state rule, which beats the default. Prices include GST."
      />
      <div className="space-y-6">
        <Panel title="Test a delivery">
          <QuoteTester />
        </Panel>
        {rules.map((r) => (
          <Panel key={r.id} title={`${r.name}${r.isActive ? "" : " (off)"}`}>
            <RuleForm rule={r} />
          </Panel>
        ))}
        <Panel title="Add a rule">
          <RuleForm />
        </Panel>
      </div>
    </>
  );
}
