"use client";

import { Toaster as Sonner } from "sonner";

/** Save confirmations and errors, top centre, in brand colours. */
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "!rounded-xs !border !border-mist !bg-paper !font-body !text-body-sm !text-ink !shadow-sm",
          error: "!border-plum/40 !text-plum",
          success: "!text-ink",
        },
      }}
    />
  );
}
