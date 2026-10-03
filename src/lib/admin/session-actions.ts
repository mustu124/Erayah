"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { requireAdmin } from "./auth";

// Sign-in, sign-out and password for /admin. Only people in admin_users get
// in; anyone else is signed straight back out with "No access".

export type SignInResult = { ok: true; message?: string } | { ok: false; error: string };

const NO_ACCESS = "No access. This account isn't an Erayah admin.";

/** Only same-site /admin paths, so "next" can't send anyone elsewhere. */
const safeNext = (next: string | null | undefined) =>
  next && /^\/admin(\/[\w\-/?=&%.]*)?$/.test(next) && !next.startsWith("/admin/login") ? next : "/admin";

async function admitOrSignOut(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const { data: row } = await createAdminClient().from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (row) return true;
  await supabase.auth.signOut();
  return false;
}

const credentials = z.object({
  email: z.email("Please enter your email address.").trim().toLowerCase(),
  password: z.string().min(1, "Please enter your password.").max(200),
  next: z.string().nullish(),
});

export async function signInWithPassword(input: z.input<typeof credentials>): Promise<SignInResult> {
  const parsed = credentials.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return { ok: false, error: "That email and password don't match." };
  if (!(await admitOrSignOut())) return { ok: false, error: NO_ACCESS };
  redirect(safeNext(parsed.data.next));
}

const magicLink = z.object({ email: z.email("Please enter your email address.").trim().toLowerCase(), next: z.string().nullish() });

export async function sendMagicLink(input: z.input<typeof magicLink>): Promise<SignInResult> {
  const parsed = magicLink.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const callback = new URL("/admin/auth/callback", env.NEXT_PUBLIC_SITE_URL);
  callback.searchParams.set("next", safeNext(parsed.data.next));
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false, emailRedirectTo: callback.toString() },
  });
  // Same answer whether or not the address has an account.
  if (error && !/signups? not allowed|user not found/i.test(error.message)) {
    console.error("magic link:", error.message);
    return { ok: false, error: "We couldn't send the link just now. Please try again in a minute." };
  }
  return { ok: true, message: "If this email belongs to an Erayah admin, a sign-in link is on its way." };
}

const callbackInput = z.object({
  code: z.string().max(500).nullish(),
  tokenHash: z.string().max(500).nullish(),
  type: z.enum(["magiclink", "invite", "email", "recovery", "signup"]).nullish(),
  accessToken: z.string().max(5000).nullish(),
  refreshToken: z.string().max(500).nullish(),
  next: z.string().nullish(),
});

/** Finishes a sign-in from an email link (magic link or invitation), whatever form the link took. */
export async function completeEmailSignIn(input: z.input<typeof callbackInput>): Promise<SignInResult & { next?: string }> {
  const parsed = callbackInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "This sign-in link isn't valid." };
  const { code, tokenHash, type, accessToken, refreshToken, next } = parsed.data;
  const supabase = await createClient();
  let error: { message: string } | null = null;
  if (code) ({ error } = await supabase.auth.exchangeCodeForSession(code));
  else if (tokenHash && type) ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  else if (accessToken && refreshToken) ({ error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }));
  else return { ok: false, error: "This sign-in link isn't valid." };
  if (error) return { ok: false, error: "This sign-in link has expired or was already used. Please request a new one." };
  if (!(await admitOrSignOut())) return { ok: false, error: NO_ACCESS };
  return { ok: true, next: safeNext(next) };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

const passwordInput = z
  .object({ password: z.string().min(10, "Use at least 10 characters.").max(200), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "The two passwords don't match.", path: ["confirm"] });

export async function setPassword(input: z.input<typeof passwordInput>): Promise<SignInResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Please sign in again." };
  }
  const parsed = passwordInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: error.message.includes("different") ? "Please choose a new password." : "Couldn't change the password. Please try again." };
  return { ok: true, message: "Password saved." };
}
