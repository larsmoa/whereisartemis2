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

/** Top view — circle with crosshairs (classic overhead map / plan). */
function IconTopView({ className }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      {/* horizontal crosshair */}
      <line
        x1="4"
        y1="12"
        x2="8"
        y2="12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="12"
        x2="20"
        y2="12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* vertical crosshair */}
      <line
        x1="12"
        y1="4"
        x2="12"
        y2="8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="16"
        x2="12"
        y2="20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

/** Side view — two stacked horizontal bars (elevation / horizon profile). */
function IconSideView({ className }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* upper bar */}
      <rect
        x="3"
        y="6"
        width="18"
        height="5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* lower bar (horizon / ground) */}
      <rect
        x="3"
        y="14"
        width="18"
        height="4"
        rx="1.5"
        fill="currentColor"
        opacity="0.25"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Free orbit — compass rose with four cardinal points (navigate freely). */
function IconFreeOrbit({ className }: IconProps): JSX.Element {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* outer ring */}
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3 2.5"
      />
      {/* N pointer (filled) */}
      <path d="M12 3 L14 10 L12 8.5 L10 10 Z" fill="currentColor" />
      {/* S pointer (outline) */}
      <path
        d="M12 21 L14 14 L12 15.5 L10 14 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill="none"
      />
      {/* W & E ticks */}
      <line
        x1="3"
        y1="12"
        x2="5.5"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line
        x1="18.5"
        y1="12"
        x2="21"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* centre dot */}
      <circle cx="12" cy="12" r="1.25" fill="currentColor" />
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
