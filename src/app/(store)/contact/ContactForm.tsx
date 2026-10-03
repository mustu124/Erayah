"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { type ContactState, sendContactMessage } from "@/lib/contact/actions";

const label = "mb-1.5 block text-body-sm text-ink";

/** Name, email or phone, message. Works before JavaScript loads (plain form post). */
export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactMessage, { status: "idle" });
  const f = state.fields ?? {};

  if (state.status === "sent") {
    return (
      <div role="status" className="border border-mist bg-paper px-6 py-10 text-center">
        <p className="font-heading text-h2 text-ink">Thank you</p>
        <p className="mt-3 text-body text-ink/75">{state.message ?? "We've received your message and will reply soon."}</p>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-5">
      <div>
        <label htmlFor="contact-name" className={label}>
          Name
        </label>
        <Input id="contact-name" name="name" autoComplete="name" maxLength={120} aria-invalid={f.name ? true : undefined} aria-describedby={f.name ? "contact-name-error" : undefined} className={cn(f.name && "border-plum")} />
        {f.name ? (
          <p id="contact-name-error" className="mt-1 text-caption text-plum">
            {f.name}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="contact-reach" className={label}>
          Email or phone
        </label>
        <Input id="contact-reach" name="contact" autoComplete="email" maxLength={254} aria-invalid={f.contact ? true : undefined} aria-describedby={f.contact ? "contact-reach-error" : undefined} className={cn(f.contact && "border-plum")} />
        {f.contact ? (
          <p id="contact-reach-error" className="mt-1 text-caption text-plum">
            {f.contact}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="contact-message" className={label}>
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={6}
          maxLength={2000}
          aria-invalid={f.message ? true : undefined}
          aria-describedby={f.message ? "contact-message-error" : undefined}
          className={cn("w-full rounded-xs border border-mist bg-paper px-3 py-2 text-body text-ink focus:border-ink", f.message && "border-plum")}
        />
        {f.message ? (
          <p id="contact-message-error" className="mt-1 text-caption text-plum">
            {f.message}
          </p>
        ) : null}
      </div>
      {/* Left empty by people; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-hp">Leave this empty</label>
        <input id="contact-hp" name="hp_note" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      {state.status === "error" && state.message && !Object.keys(f).length ? (
        <p role="alert" className="bg-ivory px-4 py-3 text-body-sm text-plum">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
