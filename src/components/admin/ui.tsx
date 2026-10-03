import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

// Small building blocks for admin pages. Calm: white panels with thin borders
// on the warm off-white background, ink text, gold labels.

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-h1 text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-body-sm text-ink/70">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("border border-mist bg-paper", className)}>
      {title || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mist px-4 py-3 sm:px-5">
          {title ? <h2 className="font-body text-label font-medium text-ink uppercase">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, href, tone = "plain" }: { label: string; value: ReactNode; hint?: ReactNode; href?: string; tone?: "plain" | "alert" }) {
  const body = (
    <>
      <p className="text-label font-medium text-ink/65 uppercase">{label}</p>
      <p className={cn("mt-2 font-heading text-[28px] leading-none tabular-nums", tone === "alert" ? "text-plum" : "text-ink")}>{value}</p>
      {hint ? <p className="mt-2 text-caption text-ink/60">{hint}</p> : null}
    </>
  );
  const cls = "block border border-mist bg-paper p-4 transition-colors duration-300 sm:p-5";
  return href ? (
    <a href={href} className={cn(cls, "hover:border-ink/40")}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending_payment: "bg-mist/60 text-ink/70",
  placed: "bg-gold-light text-ink",
  confirmed: "bg-[#e7ecf3] text-[#2f4566]",
  packed: "bg-[#efe7f1] text-plum",
  shipped: "bg-[#e3eef0] text-[#28575e]",
  delivered: "bg-[#e5efe3] text-[#355a39]",
  cancelled: "bg-mist/60 text-ink/55 line-through",
  returned: "bg-[#f4e6e3] text-[#7a3b2e]",
  refunded: "bg-[#f4e6e3] text-[#7a3b2e]",
  // payment
  pending: "bg-mist/60 text-ink/70",
  paid: "bg-[#e5efe3] text-[#355a39]",
  failed: "bg-[#f4e6e3] text-[#7a3b2e]",
};

export const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  placed: "New",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-caption whitespace-nowrap", STATUS_STYLES[status] ?? "bg-mist text-ink", className)}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-4 py-10 text-center text-body-sm text-ink/60">{children}</p>;
}

/** Horizontal scroll wrapper so wide tables stay usable on a phone. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="-mx-4 overflow-x-auto sm:mx-0">{children}</div>;
}

export const th = "border-b border-mist px-3 py-2.5 text-left text-label font-medium whitespace-nowrap text-ink/65 uppercase";
export const td = "border-b border-mist px-3 py-3 align-middle text-body-sm text-ink";

type LabelProps = { label: string; error?: string; hint?: ReactNode; htmlFor: string; children: ReactNode; className?: string };

export function Labeled({ label, error, hint, htmlFor, children, className }: LabelProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-body-sm text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-caption text-ink/60">{hint}</p> : null}
      {error ? <p className="mt-1 text-caption text-plum">{error}</p> : null}
    </div>
  );
}

export const inputCls =
  "h-11 w-full rounded-xs border border-mist bg-paper px-3 text-body text-ink placeholder:text-ink/40 focus:border-ink aria-invalid:border-plum";
export const textareaCls =
  "w-full rounded-xs border border-mist bg-paper px-3 py-2 text-body text-ink placeholder:text-ink/40 focus:border-ink aria-invalid:border-plum";

export function TextInput({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputCls, className)} {...props} />;
}

export function TextArea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(textareaCls, className)} {...props} />;
}

/** A switch with a visible label; 44px tap target. */
export function Toggle({ checked, onChange, label, disabled, id }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; disabled?: boolean; id?: string }) {
  return (
    <label className={cn("inline-flex min-h-11 cursor-pointer items-center gap-3 text-body-sm text-ink", disabled && "cursor-default opacity-50")}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-300", checked ? "border-ink bg-ink" : "border-mist bg-mist/60")}
      >
        <span className={cn("absolute top-0.5 left-0.5 size-4.5 rounded-full bg-paper transition-transform duration-300", checked && "translate-x-5")} />
      </button>
      <span>{label}</span>
    </label>
  );
}
