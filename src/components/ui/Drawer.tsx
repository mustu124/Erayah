"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";
import { IconButton } from "./IconButton";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  /** Accessible name. Shown as the heading unless `header` replaces the top row. */
  title: string;
  /** Custom top row (replaces the default title + close button). */
  header?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Full-height side panel built on the native modal <dialog>: focus is trapped
 * inside, the page behind is inert, Esc and a tap on the backdrop close it,
 * and focus returns to the opener. Fades in and out (opacity only).
 */
export function Drawer({ open, onClose, side = "right", title, header, children, className }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) document.documentElement.style.overflow = "";
  }, [open]);

  useEffect(() => () => void (document.documentElement.style.overflow = ""), []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "drawer fixed inset-y-0 m-0 h-dvh max-h-none w-[min(100vw,26rem)] max-w-none bg-paper p-0 text-ink",
        side === "right" ? "right-0 left-auto" : "right-auto left-0",
        className,
      )}
    >
      <div className="flex h-full flex-col">
        {header ?? (
          <div className="flex min-h-16 items-center justify-between border-b border-mist px-4">
            <h2 id={titleId} className="font-body text-label font-medium uppercase">
              {title}
            </h2>
            <IconButton label="Close" onClick={onClose}>
              <Icon icon={X} />
            </IconButton>
          </div>
        )}
        {header ? (
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
        ) : null}
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </dialog>
  );
}
