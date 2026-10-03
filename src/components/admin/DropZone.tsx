"use client";

import { ImagePlus } from "lucide-react";
import { type ReactNode, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

type DropZoneProps = {
  onFile: (file: File) => void;
  accept: string;
  busy?: boolean;
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  compact?: boolean;
};

/** Drop a file here, or tap to choose one. */
export function DropZone({ onFile, accept, busy, label, hint, className, compact }: DropZoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const id = useId();

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files[0];
        if (file && !busy) onFile(file);
      }}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 rounded-xs border border-dashed text-center transition-colors duration-200",
        compact ? "px-2 py-2" : "px-3 py-6",
        over ? "border-ink bg-ivory" : "border-ink/25 bg-paper hover:border-ink/50",
        busy && "pointer-events-none opacity-60",
        className,
      )}
    >
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <label htmlFor={id} className="flex cursor-pointer flex-col items-center gap-1 after:absolute after:inset-0">
        {compact ? null : <Icon icon={ImagePlus} size={22} className="text-ink/50" />}
        <span className="text-body-sm text-ink">{busy ? "Uploading…" : label}</span>
        {hint && !busy ? <span className="text-caption text-ink/55">{hint}</span> : null}
      </label>
    </div>
  );
}
