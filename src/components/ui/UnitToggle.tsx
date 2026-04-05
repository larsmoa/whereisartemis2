"use client";

import type { JSX } from "react";
import type { UnitSystem } from "@/lib/format";

export interface UnitToggleProps {
  value: UnitSystem;
  onChange: (view: UnitSystem) => void;
  className?: string;
  /** Default: vertical toolbox (stacked). Use `horizontal` for a full-width row. */
  orientation?: "vertical" | "horizontal";
}

export function UnitToggle({
  value,
  onChange,
  className = "",
  orientation = "vertical",
}: UnitToggleProps): JSX.Element {
  const vertical = orientation === "vertical";
  const isMetric = value === "metric";

  return (
    <div
      className={`flex rounded-lg border border-white/10 bg-black/70 p-1 shadow-lg backdrop-blur-sm ${
        vertical ? "w-auto flex-col" : "w-full min-w-0 flex-row"
      } ${className}`}
    >
      <button
        type="button"
        aria-label="Toggle unit system"
        title="Toggle unit system"
        onClick={(): void => {
          onChange(isMetric ? "us" : "metric");
        }}
        className={`flex items-center justify-center rounded-md font-bold transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          vertical
            ? "h-10 w-10 flex-col gap-1"
            : "min-h-11 min-w-0 flex-1 flex-row gap-2 px-2 sm:px-3"
        }`}
      >
        <span className={`text-[10px] leading-none ${isMetric ? "text-white" : "text-zinc-600"}`}>
          KM
        </span>
        <span className={`text-[10px] leading-none ${!isMetric ? "text-white" : "text-zinc-600"}`}>
          MI
        </span>
      </button>
    </div>
  );
}
