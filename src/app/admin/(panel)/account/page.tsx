import type { Metadata } from "next";

import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin/auth";

import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const admin = await requireAdminPage();
  return (
    <>
      <PageHeader title="My account" description={`${admin.email} · ${admin.role}`} />
      <Panel title="Password" className="max-w-xl">
        <p className="mb-4 text-body-sm text-ink/70">Set a password to sign in without waiting for an email link. Use at least 10 characters.</p>
        <PasswordForm />
      </Panel>
    </>
  );
}
