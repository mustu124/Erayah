"use client";

import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { inputCls } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { sendMagicLink, signInWithPassword } from "@/lib/admin/session-actions";

/** Email + password, or a one-time sign-in link by email. */
export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next");
  const [mode, setMode] = useState<"password" | "link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(params.get("error"));
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = mode === "password" ? await signInWithPassword({ email, password, next }) : await sendMagicLink({ email, next });
      // A successful password sign-in redirects, so only messages come back.
      if (!result) return;
      if (result.ok) setNotice(result.message ?? null);
      else setError(result.error);
    });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <h1 className="font-heading text-h2 text-ink">Sign in</h1>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-body-sm text-ink">
          Email
        </label>
        <input id="email" type="email" autoComplete="username" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
      </div>
      {mode === "password" ? (
        <div>
          <label htmlFor="password" className="mb-1.5 block text-body-sm text-ink">
            Password
          </label>
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="bg-ivory px-3 py-2 text-body-sm text-plum">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="bg-ivory px-3 py-2 text-body-sm text-ink">
          {notice}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Please wait…" : mode === "password" ? "Sign in" : "Email me a sign-in link"}
      </Button>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "password" ? "link" : "password");
          setError(null);
          setNotice(null);
        }}
        className="block min-h-11 w-full text-center text-body-sm text-ink/75 underline decoration-ink/30 underline-offset-4 hover:text-ink"
      >
        {mode === "password" ? "Sign in with an email link instead" : "Sign in with a password instead"}
      </button>
    </form>
  );
}
