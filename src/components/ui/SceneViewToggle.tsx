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

/** Top view — Z-axis arrow pointing toward the viewer (foreshortened axis dot + radiating ticks). */
function IconTopView({ className }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* four radiating ticks at 45° */}
      <line
        x1="12"
        y1="12"
        x2="6.5"
        y2="6.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="12"
        x2="17.5"
        y2="6.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="12"
        x2="6.5"
        y2="17.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="12"
        x2="17.5"
        y2="17.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* axis dot coming toward viewer */}
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

/** Side view — X/Y grid with a bold horizon line (ecliptic edge-on). */
function IconSideView({ className }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* vertical grid lines */}
      <line
        x1="8"
        y1="4"
        x2="8"
        y2="20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      <line
        x1="16"
        y1="4"
        x2="16"
        y2="20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      {/* horizontal grid lines */}
      <line
        x1="4"
        y1="8"
        x2="20"
        y2="8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      <line
        x1="4"
        y1="16"
        x2="20"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      />
      {/* bold horizon / ecliptic line */}
      <line
        x1="3"
        y1="12"
        x2="21"
        y2="12"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Free orbit — isometric cube (3-D perspective / free navigation). */
function IconFreeOrbit({ className }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* top face */}
      <path
        d="M12 3 L20 7.5 L12 12 L4 7.5 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      {/* left face */}
      <path
        d="M4 7.5 L4 16.5 L12 21 L12 12 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        opacity="0.55"
      />
      {/* right face */}
      <path
        d="M20 7.5 L20 16.5 L12 21 L12 12 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        opacity="0.8"
      />
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
