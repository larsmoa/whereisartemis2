"use client";

import type { JSX } from "react";
import type { SceneView } from "@/types";

export interface SceneViewToggleProps {
  value: SceneView;
  onChange: (view: SceneView) => void;
  className?: string;
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
}: SceneViewToggleProps): JSX.Element {
  return (
    <div
      role="tablist"
      aria-label="Scene view"
      className={`flex w-full min-w-0 gap-1 rounded-lg border border-white/10 bg-black/70 p-1 backdrop-blur-sm ${className}`}
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
            className={`min-h-11 min-w-0 flex-1 rounded-md px-2 text-sm font-medium transition-colors sm:px-3 ${
              selected
                ? "bg-white/15 text-white"
                : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
