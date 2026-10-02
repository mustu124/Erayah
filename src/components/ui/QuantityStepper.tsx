"use client";

import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** What is being counted, for screen readers, e.g. "Quantity of Dahlia Earrings". */
  label?: string;
  className?: string;
};

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  label = "Quantity",
  className,
}: QuantityStepperProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex h-11 items-center border border-mist bg-paper text-ink", className)}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex size-11 items-center justify-center transition-opacity duration-300 disabled:opacity-30"
      >
        <Icon icon={Minus} size={14} />
      </button>
      <output aria-live="polite" className="w-8 text-center text-body-sm tabular-nums">
        {value}
      </output>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex size-11 items-center justify-center transition-opacity duration-300 disabled:opacity-30"
      >
        <Icon icon={Plus} size={14} />
      </button>
    </div>
  );
}
