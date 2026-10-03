import type { ComponentProps, ReactNode } from "react";

import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type FieldProps = ComponentProps<"input"> & {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  prefix?: string;
  optional?: boolean;
};

/** Labelled input with its error message tied to it for screen readers. */
export function Field({ id, label, error, hint, prefix, optional, className, ...props }: FieldProps) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-body-sm text-ink">
        {label}
        {optional ? <span className="text-ink/55"> (optional)</span> : null}
      </label>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-body text-ink/70">{prefix}</span>
        ) : null}
        <Input
          id={id}
          name={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(prefix && "pl-12", error && "border-plum")}
          {...props}
        />
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-caption text-ink/65">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-caption text-plum">
          {error}
        </p>
      ) : null}
    </div>
  );
}
