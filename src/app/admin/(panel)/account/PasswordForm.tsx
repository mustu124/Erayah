"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Labeled, TextInput } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { setPassword } from "@/lib/admin/session-actions";

export function PasswordForm() {
  const [password, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await setPassword({ password, confirm });
          if (r.ok) {
            toast.success(r.message ?? "Password saved.");
            setPw("");
            setConfirm("");
          } else toast.error(r.error);
        });
      }}
      className="space-y-3"
    >
      <Labeled label="New password" htmlFor="new-password">
        <TextInput id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPw(e.target.value)} />
      </Labeled>
      <Labeled label="Type it again" htmlFor="confirm-password">
        <TextInput id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Labeled>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
