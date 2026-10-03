import { Mail, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState, PageHeader, Panel } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { requireAdminPage } from "@/lib/admin/auth";
import { formatDateTimeLong } from "@/lib/admin/time";
import { cn } from "@/lib/cn";
import { createAdminClient } from "@/lib/supabase/admin";

import { MessageActions } from "./MessageActions";

export const metadata: Metadata = { title: "Messages" };

const reply = "inline-flex min-h-9 items-center gap-1.5 rounded-xs border border-mist px-3 text-caption hover:border-ink/40";

export default async function MessagesPage() {
  const admin = await requireAdminPage();
  const { data: messages } = await createAdminClient()
    .from("contact_messages")
    .select("id, name, email, phone, message, is_read, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const unread = (messages ?? []).filter((m) => !m.is_read).length;

  return (
    <>
      <PageHeader title="Messages" description="From the contact form on the site. Reply by email, phone or WhatsApp; the site doesn't send anything itself." />
      <Panel title={unread ? `${unread} unread` : "All read"}>
        {!messages?.length ? (
          <EmptyState>No messages yet.</EmptyState>
        ) : (
          <ul className="divide-y divide-mist">
            {messages.map((m) => {
              const digits = m.phone?.replace(/\D/g, "") ?? "";
              return (
                <li key={m.id} className={cn("py-4", !m.is_read && "border-l-2 border-plum pl-3")}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className={cn("text-body", !m.is_read && "font-medium")}>{m.name}</p>
                    <p className="text-caption text-ink/55">{formatDateTimeLong(m.created_at)}</p>
                  </div>
                  <p className="mt-2 text-body-sm whitespace-pre-line text-ink/85">{m.message}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {m.email ? (
                      <a href={`mailto:${m.email}?subject=${encodeURIComponent("Your message to Erayah")}`} className={reply}>
                        <Icon icon={Mail} size={14} /> {m.email}
                      </a>
                    ) : null}
                    {m.phone ? (
                      <>
                        <a href={`tel:+${digits}`} className={reply}>
                          <Icon icon={Phone} size={14} /> {m.phone}
                        </a>
                        <a href={`https://wa.me/${digits}?text=${encodeURIComponent(`Hello ${m.name.split(/\s+/)[0]}, this is Erayah, replying to your message.`)}`} target="_blank" rel="noopener noreferrer" className={reply}>
                          <Icon icon={MessageCircle} size={14} /> WhatsApp
                        </a>
                      </>
                    ) : null}
                    <span className="flex-1" />
                    <MessageActions id={m.id} read={m.is_read} canDelete={admin.role === "owner"} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
