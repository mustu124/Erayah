"use server";

import { createHash } from "node:crypto";

import { headers } from "next/headers";
import { z } from "zod";

import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

// The contact form. Messages are saved for the owner to read in /admin
// (the site sends no email). Bots are turned away by a hidden "website"
// honeypot field and a per-sender rate limit keyed on a salted hash of the IP.

export type ContactState = {
  status: "idle" | "sent" | "error";
  message?: string;
  fields?: Partial<Record<"name" | "contact" | "message", string>>;
};

const PER_10_MIN = 3;
const PER_DAY = 10;

const input = z.object({
  name: z.string().trim().min(1, "Please tell us your name.").max(120),
  contact: z
    .string()
    .trim()
    .min(1, "Please give an email or phone number so we can reply.")
    .max(254)
    .transform((v, ctx) => {
      if (v.includes("@")) {
        if (!z.email().safeParse(v).success) ctx.addIssue({ code: "custom", message: "That email address doesn't look right." });
        return { email: v.toLowerCase(), phone: null };
      }
      const digits = v.replace(/[\s\-()]/g, "").replace(/^\+/, "");
      if (!/^\d{10,15}$/.test(digits)) ctx.addIssue({ code: "custom", message: "Please enter a 10-digit mobile number or an email." });
      return { email: null, phone: digits.length === 10 ? `+91 ${digits}` : `+${digits}` };
    }),
  message: z.string().trim().min(10, "Please write a little more (at least 10 characters).").max(2000, "Please keep it under 2,000 characters."),
});

async function senderHash() {
  const h = await headers();
  const raw = h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  // One sender, one key: "::ffff:1.2.3.4" is 1.2.3.4, and loopback is loopback over IPv4 or IPv6.
  const ip = raw === "::1" ? "127.0.0.1" : raw.replace(/^::ffff:/i, "");
  return createHash("sha256").update(`${env.SUPABASE_SERVICE_ROLE_KEY.slice(-24)}:${ip}`).digest("hex").slice(0, 40);
}

export async function sendContactMessage(_prev: ContactState, form: FormData): Promise<ContactState> {
  // Humans never see or fill this field.
  // (Named so browsers and password managers don't autofill it.)
  if (String(form.get("hp_note") ?? "").trim()) return { status: "sent" };

  const parsed = input.safeParse({ name: form.get("name"), contact: form.get("contact"), message: form.get("message") });
  if (!parsed.success) {
    const fields: ContactState["fields"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<ContactState["fields"]>;
      fields[key] ??= issue.message;
    }
    return { status: "error", message: "Please check the form.", fields };
  }

  const db = createAdminClient();
  const ipHash = await senderHash();
  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const [recent, today] = await Promise.all([
    db.from("contact_messages").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since(10 * 60_000)),
    db.from("contact_messages").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since(86_400_000)),
  ]);
  if ((recent.count ?? 0) >= PER_10_MIN || (today.count ?? 0) >= PER_DAY) {
    return { status: "error", message: "You've sent us a few messages already. We'll reply soon; for anything urgent, please message us on WhatsApp." };
  }

  const { name, contact, message } = parsed.data;
  const { error } = await db.from("contact_messages").insert({ name, email: contact.email, phone: contact.phone, message, ip_hash: ipHash });
  if (error) {
    console.error("contact message:", error.message);
    return { status: "error", message: "We couldn't send that just now. Please try again, or message us on WhatsApp." };
  }
  return { status: "sent", message: "Thank you. We've received your message and will reply soon." };
}
