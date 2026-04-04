"use client";

import type { JSX } from "react";
import type { SceneView } from "@/types";

export interface SceneViewToggleProps {
  value: SceneView;
  onChange: (view: SceneView) => void;
  className?: string;
  /** Default: vertical toolbox (stacked). Use `horizontal` for a full-width row. */
  orientation?: "vertical" | "horizontal";
}

const OPTIONS: { id: SceneView; label: string }[] = [
  { id: "top", label: "Top" },
  { id: "side", label: "Side" },
  { id: "free", label: "Free" },
];

export function SceneViewToggle({
  value,
  onChange,
  className = "",
  orientation = "vertical",
}: SceneViewToggleProps): JSX.Element {
  const vertical = orientation === "vertical";

  return (
    <div
      role="tablist"
      aria-label="Scene view"
      className={`flex gap-1 rounded-lg border border-white/10 bg-black/70 p-1 shadow-lg backdrop-blur-sm ${
        vertical ? "w-auto flex-col" : "w-full min-w-0 flex-row"
      } ${className}`}
    >
      {OPTIONS.map(({ id, label }) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={0}
            onClick={(): void => {
              onChange(id);
            }}
            className={`rounded-md font-medium transition-colors ${
              vertical
                ? `min-h-10 min-w-[4.25rem] px-3 py-2 text-xs ${selected ? "bg-white/15 text-white" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"}`
                : `min-h-11 min-w-0 flex-1 px-2 text-sm sm:px-3 ${selected ? "bg-white/15 text-white" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"}`
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
