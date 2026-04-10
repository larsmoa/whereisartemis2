"use client";

import { useState, useMemo, useCallback } from "react";
import type { ActivityType } from "@/types";
import { useTimeline } from "@/hooks/useTimeline";
import { useArtemisData } from "@/hooks/useArtemisData";
import { useInterpolatedArtemisData } from "@/hooks/useInterpolatedArtemisData";
import { getUpcomingEvents } from "@/lib/timeline";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCountdown(deltaMs: number): string {
  if (deltaMs <= 0) return "now";
  const totalS = Math.floor(deltaMs / 1000);
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;
  if (h > 0) return `${h.toString()}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m.toString()}m ${s.toString().padStart(2, "0")}s`;
  return `${s.toString()}s`;
}

const ACTIVITY_DOT: Record<ActivityType, string> = {
  maneuver: "bg-amber-400",
  science: "bg-sky-400",
  sleep: "bg-indigo-400",
  meal: "bg-emerald-400",
  pao: "bg-purple-400",
  config: "bg-zinc-400",
  exercise: "bg-teal-400",
  "off-duty": "bg-rose-400",
  other: "bg-zinc-500",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function NextEventCard(): React.JSX.Element {
  const { data: timeline } = useTimeline();
  const { data: rawData } = useArtemisData();
  const data = useInterpolatedArtemisData(rawData);
  const metMs = data ? data.missionElapsedSeconds * 1000 : 0;

  // Combined chronological sequence of all upcoming events
  const upcomingEvents = useMemo(
    () =>
      timeline && metMs > 0
        ? getUpcomingEvents(metMs, timeline.milestones, timeline.activities, 40)
        : [],
    [timeline, metMs],
  );

  const [offset, setOffset] = useState(0);

  const focusedEvent = upcomingEvents[offset] ?? null;
  const canGoPrev = offset > 0;
  const canGoNext = offset < upcomingEvents.length - 1;

  const goPrev = useCallback((): void => {
    setOffset((o) => Math.max(0, o - 1));
  }, []);

  const goNext = useCallback((): void => {
    setOffset((o) => Math.min(upcomingEvents.length - 1, o + 1));
  }, [upcomingEvents.length]);

  // No data yet — render placeholder matching StatCard shape
  if (!focusedEvent) {
    return (
      <div className="relative overflow-hidden flex h-full flex-col gap-0.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm sm:px-5 sm:py-4">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 sm:text-xs">
          Next Event
        </span>
        <span className="font-mono text-lg font-bold text-white tabular-nums sm:text-2xl">—</span>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden flex h-full flex-col rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm sm:px-5 sm:py-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 sm:text-xs">
          Next Event
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={goPrev}
            disabled={!canGoPrev}
            aria-label="Previous event"
            className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
          >
            ‹
          </button>
          <button
            onClick={goNext}
            disabled={!canGoNext}
            aria-label="Next event"
            className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
          >
            ›
          </button>
        </div>
      </div>

      {/* Major event — milestone */}
      {focusedEvent.kind === "milestone" && (
        <div className="mt-1.5 flex-1 min-w-0">
          <div className="flex items-start gap-1.5">
            <span className="mt-0.5 shrink-0 text-[9px] text-white/50">◆</span>
            <p className="text-xs font-semibold text-white leading-snug line-clamp-2 sm:text-sm">
              {focusedEvent.item.name}
            </p>
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-zinc-400 sm:text-xs">
            T− {formatCountdown(focusedEvent.timeMs - metMs)}
          </p>
        </div>
      )}

      {/* Minor event — activity */}
      {focusedEvent.kind === "activity" && (
        <div className="mt-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`shrink-0 h-1.5 w-1.5 rounded-full ${ACTIVITY_DOT[focusedEvent.item.type]}`}
            />
            <p className="text-xs font-semibold text-white leading-snug line-clamp-2 sm:text-sm">
              {focusedEvent.item.name}
            </p>
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-zinc-400 sm:text-xs">
            T− {formatCountdown(focusedEvent.timeMs - metMs)}
          </p>
        </div>
      )}
    </div>
  );
}
