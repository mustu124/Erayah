import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

type IconButtonProps = Omit<ComponentProps<"button">, "aria-label" | "children"> & {
  /** Required: icon buttons have no visible text. */
  label: string;
  children: ReactNode;
};

/** 44px square tap target around a small icon. */
export function IconButton({ label, className, type = "button", children, ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        "relative inline-flex size-11 shrink-0 items-center justify-center rounded-xs text-ink transition-opacity duration-300 hover:opacity-70 disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Small ink count badge for the cart and wishlist icons. */
export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute top-1.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] leading-none font-medium text-ivory"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
