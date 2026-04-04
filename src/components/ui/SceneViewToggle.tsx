"use client";

import type { JSX } from "react";
import { ArrowDownToLine, ArrowRightToLine, Orbit } from "lucide-react";
import type { SceneView } from "@/types";

export interface SceneViewToggleProps {
  value: SceneView;
  onChange: (view: SceneView) => void;
  className?: string;
  /** Default: vertical toolbox (stacked). Use `horizontal` for a full-width row. */
  orientation?: "vertical" | "horizontal";
}

const OPTIONS: {
  id: SceneView;
  label: string;
  Icon: typeof ArrowDownToLine;
}[] = [
  { id: "top", label: "Top view", Icon: ArrowDownToLine },
  { id: "side", label: "Side view", Icon: ArrowRightToLine },
  { id: "free", label: "Free orbit", Icon: Orbit },
];

const ICON_SIZE = 20;

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
      {OPTIONS.map(({ id, label, Icon }) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-label={label}
            aria-selected={selected}
            title={label}
            tabIndex={0}
            onClick={(): void => {
              onChange(id);
            }}
            className={`flex items-center justify-center rounded-md font-medium transition-colors ${
              vertical
                ? `h-10 w-10 ${selected ? "bg-white/15 text-white" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"}`
                : `min-h-11 min-w-0 flex-1 px-2 sm:px-3 ${selected ? "bg-white/15 text-white" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"}`
            }`}
          >
            <Icon size={ICON_SIZE} strokeWidth={1.75} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
