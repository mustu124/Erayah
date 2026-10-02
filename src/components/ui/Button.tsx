import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant = "solid" | "outline" | "link";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-xs font-body transition-[opacity,background-color,color] duration-300 disabled:pointer-events-none disabled:opacity-40";

const VARIANTS: Record<ButtonVariant, string> = {
  solid:
    "min-h-11 px-7 bg-ink text-ivory text-[12px] font-medium uppercase tracking-[0.12em] hover:opacity-90",
  outline:
    "min-h-11 px-7 border border-ink text-ink text-[12px] font-medium uppercase tracking-[0.12em] hover:bg-ink hover:text-ivory",
  link: "min-h-11 px-0 text-body-sm text-ink underline decoration-1 underline-offset-4 decoration-ink/40 hover:decoration-ink",
};

export function buttonClasses(variant: ButtonVariant = "solid", className?: string) {
  return cn(BASE, VARIANTS[variant], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant };

export function Button({ variant = "solid", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant };

export function ButtonLink({ variant = "solid", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, className)} {...props} />;
}
