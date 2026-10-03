"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { completeEmailSignIn } from "@/lib/admin/session-actions";

/**
 * Where sign-in and invitation emails land. Links arrive as ?code= (sign-in
 * link), ?token_hash=&type= (custom email templates) or #access_token=
 * (invitations), so this reads the URL in the browser and finishes on the server.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const linkError = query.get("error_description") ?? hash.get("error_description");
    const attempt = linkError
      ? Promise.resolve({ ok: false as const, error: "This sign-in link has expired or was already used. Please request a new one." })
      : completeEmailSignIn({
          code: query.get("code"),
          tokenHash: query.get("token_hash"),
          type: query.get("type") as never,
          accessToken: hash.get("access_token"),
          refreshToken: hash.get("refresh_token"),
          next: query.get("next"),
        });
    attempt.then((result) => {
      if (result.ok) router.replace(("next" in result && result.next) || "/admin");
      else setError(result.error);
    });
  }, [router]);

  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      {error ? (
        <>
          <p role="alert" className="max-w-sm text-body text-plum">
            {error}
          </p>
          <ButtonLink href="/admin/login">Back to sign in</ButtonLink>
        </>
      ) : (
        <p role="status" className="text-body text-ink/70">
          Signing you in…
        </p>
      )}
    </main>
  );
}
