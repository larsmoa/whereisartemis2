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

type IconProps = { className?: string };

/** Plan / map view — frame with center (camera from above). */
function IconTopView({ className }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** Elevation / profile — vertical plane with horizon. */
function IconSideView({ className }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="5"
        y="3"
        width="14"
        height="18"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

/** Orbit — arc and camera dot (free navigation). */
function IconFreeOrbit({ className }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 14a8 8 0 0 1 14.5-4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M19 6v4h-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="16" r="2" fill="currentColor" />
    </svg>
  );
}

const OPTIONS: {
  id: SceneView;
  label: string;
  Icon: (props: IconProps) => JSX.Element;
}[] = [
  { id: "top", label: "Top view", Icon: IconTopView },
  { id: "side", label: "Side view", Icon: IconSideView },
  { id: "free", label: "Free orbit", Icon: IconFreeOrbit },
];

const ICON_CLASS = "h-5 w-5 shrink-0";

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
            <Icon className={ICON_CLASS} />
          </button>
        );
      })}
    </div>
  );
}
