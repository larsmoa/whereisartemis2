"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import type { ActivityType, TimelineActivity, TimelineMilestone } from "@/types";
import { useTimeline } from "@/hooks/useTimeline";
import { useArtemisData } from "@/hooks/useArtemisData";
import { useInterpolatedArtemisData } from "@/hooks/useInterpolatedArtemisData";
import { getCurrentActivity, getReturnJourneyActivities } from "@/lib/timeline";

// ── Constants ────────────────────────────────────────────────────────────────

const TRANS_EARTH_START_MET_MS = 499_932_000;

const ACTIVITY_TYPE_CONFIG: Record<ActivityType, { dot: string; badge: string; label: string }> = {
  maneuver: { dot: "bg-amber-400", badge: "bg-amber-500/20 text-amber-300", label: "Maneuver" },
  science: { dot: "bg-sky-400", badge: "bg-sky-500/20 text-sky-300", label: "Science" },
  sleep: { dot: "bg-indigo-400", badge: "bg-indigo-500/20 text-indigo-300", label: "Sleep" },
  meal: { dot: "bg-emerald-400", badge: "bg-emerald-500/20 text-emerald-300", label: "Meal" },
  pao: { dot: "bg-purple-400", badge: "bg-purple-500/20 text-purple-300", label: "Comm" },
  config: { dot: "bg-zinc-400", badge: "bg-zinc-500/20 text-zinc-400", label: "Config" },
  exercise: { dot: "bg-teal-400", badge: "bg-teal-500/20 text-teal-300", label: "Exercise" },
  "off-duty": { dot: "bg-rose-400", badge: "bg-rose-500/20 text-rose-300", label: "Off duty" },
  other: { dot: "bg-zinc-500", badge: "bg-zinc-600/20 text-zinc-400", label: "Other" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(absMs: number): string {
  const totalS = Math.floor(absMs / 1000);
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;
  if (h > 0) return `${h.toString()}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m.toString()}m ${s.toString().padStart(2, "0")}s`;
  return `${s.toString()}s`;
}

function formatProgressPct(metMs: number, start: number, end: number): number {
  if (end <= start) return 100;
  return Math.min(100, Math.max(0, Math.round(((metMs - start) / (end - start)) * 100)));
}

// ── Types ────────────────────────────────────────────────────────────────────

type TimelineRow =
  | { kind: "activity"; item: TimelineActivity }
  | { kind: "milestone"; item: TimelineMilestone };

function rowSortKey(row: TimelineRow): number {
  return row.kind === "activity" ? row.item.startMetMs : row.item.metMs;
}

// ── EventCard ────────────────────────────────────────────────────────────────

type CardState = "past" | "active" | "future";

function getCardState(row: TimelineRow, metMs: number): CardState {
  if (row.kind === "milestone") {
    return row.item.metMs <= metMs ? "past" : "future";
  }
  if (metMs >= row.item.startMetMs && metMs < row.item.endMetMs) return "active";
  if (metMs >= row.item.endMetMs) return "past";
  return "future";
}

function EventCard({
  row,
  metMs,
  isFocused,
}: {
  row: TimelineRow;
  metMs: number;
  isFocused: boolean;
}): React.JSX.Element {
  const state = getCardState(row, metMs);

  const name = row.kind === "activity" ? row.item.name : row.item.name;

  // Time indicator text
  let timeLabel: string;
  let timeSub: string | null = null;
  if (row.kind === "milestone") {
    const delta = row.item.metMs - metMs;
    timeLabel = delta > 0 ? `T− ${formatDuration(delta)}` : `${formatDuration(-delta)} ago`;
  } else if (state === "active") {
    const remaining = Math.max(0, row.item.endMetMs - metMs);
    timeLabel = `${formatDuration(remaining)} remaining`;
    timeSub = null;
  } else if (state === "past") {
    const ago = metMs - row.item.endMetMs;
    timeLabel = `${formatDuration(ago)} ago`;
  } else {
    const delta = row.item.startMetMs - metMs;
    timeLabel = `T− ${formatDuration(delta)}`;
  }

  // Badge / icon
  const badge =
    row.kind === "activity" ? (
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${ACTIVITY_TYPE_CONFIG[row.item.type].badge}`}
      >
        {ACTIVITY_TYPE_CONFIG[row.item.type].label}
      </span>
    ) : (
      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-white/10 text-white/60">
        ◆ Milestone
      </span>
    );

  const dotColor =
    row.kind === "activity" ? ACTIVITY_TYPE_CONFIG[row.item.type].dot : "bg-white/40";

  const pct =
    state === "active" && row.kind === "activity"
      ? formatProgressPct(metMs, row.item.startMetMs, row.item.endMetMs)
      : null;

  return (
    <div
      className={[
        "flex h-full flex-col justify-between rounded-lg border p-3 transition-all duration-300",
        isFocused
          ? "border-white/20 bg-white/8 opacity-100 scale-100"
          : "border-white/8 bg-white/3 opacity-45 scale-95",
      ].join(" ")}
    >
      {/* Top row: badge + pulse dot for active */}
      <div className="flex items-start justify-between gap-2">
        {badge}
        {state === "active" && (
          <span className={`mt-0.5 h-2 w-2 shrink-0 animate-pulse rounded-full ${dotColor}`} />
        )}
        {state === "past" && (
          <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${dotColor} opacity-30`} />
        )}
        {state === "future" && (
          <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${dotColor} opacity-60`} />
        )}
      </div>

      {/* Name */}
      <p
        className={`mt-2 text-sm font-medium leading-snug line-clamp-2 ${
          isFocused ? "text-white" : "text-zinc-400"
        }`}
      >
        {name}
      </p>

      {/* Progress bar (active only) */}
      {pct !== null && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${dotColor} opacity-70`}
            style={{ width: `${pct.toString()}%` }}
          />
        </div>
      )}

      {/* Time label */}
      <div className="mt-2 flex items-center justify-between gap-1">
        <p
          className={`font-mono text-[10px] ${
            state === "active" ? "text-white" : state === "past" ? "text-zinc-600" : "text-zinc-400"
          }`}
        >
          {timeLabel}
        </p>
        {timeSub && <p className="font-mono text-[10px] text-zinc-600">{timeSub}</p>}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function ReturnJourney(): React.JSX.Element | null {
  const { data: timeline } = useTimeline();
  const { data: rawData } = useArtemisData();
  const data = useInterpolatedArtemisData(rawData);

  const metMs = data ? data.missionElapsedSeconds * 1000 : 0;

  const currentActivity = useMemo(
    () => (timeline ? getCurrentActivity(metMs, timeline.activities) : null),
    [timeline, metMs],
  );

  // Build the full flat sorted row list — past + present + future return-journey events
  const rows = useMemo((): TimelineRow[] => {
    if (!timeline || metMs === 0) return [];

    // All return-journey activities (past and future)
    const allReturnActivities = getReturnJourneyActivities(timeline.activities);

    // Milestones past Trans-Earth start, deduplicated against activities
    const returnActivityNames = new Set(allReturnActivities.map((a) => a.name.toLowerCase()));
    const returnMilestones = timeline.milestones.filter(
      (m) =>
        m.metMs > TRANS_EARTH_START_MET_MS &&
        !allReturnActivities.some(
          (a) =>
            m.metMs >= a.startMetMs &&
            m.metMs < a.endMetMs &&
            returnActivityNames.has(a.name.toLowerCase()) &&
            a.name.toLowerCase().includes(m.name.split(" ")[0]?.toLowerCase() ?? ""),
        ),
    );

    const combined: TimelineRow[] = [
      ...allReturnActivities.map((item): TimelineRow => ({ kind: "activity", item })),
      ...returnMilestones.map((item): TimelineRow => ({ kind: "milestone", item })),
    ];

    combined.sort((a, b) => rowSortKey(a) - rowSortKey(b));
    return combined;
  }, [timeline, metMs]);

  // anchorIndex: index of current activity, else first upcoming
  const anchorIndex = useMemo(() => {
    if (rows.length === 0) return 0;
    if (currentActivity) {
      const idx = rows.findIndex(
        (r) => r.kind === "activity" && r.item.name === currentActivity.name,
      );
      if (idx !== -1) return idx;
    }
    // First upcoming
    const upcoming = rows.findIndex((r) => {
      const key = rowSortKey(r);
      return key > metMs;
    });
    return upcoming !== -1 ? upcoming : rows.length - 1;
  }, [rows, currentActivity, metMs]);

  // viewOffset: user-controlled offset from anchorIndex
  const [viewOffset, setViewOffset] = useState(0);

  const focusedIndex = anchorIndex + viewOffset;
  const clampedFocused = Math.max(0, Math.min(rows.length - 1, focusedIndex));

  const canGoBack = clampedFocused > 0;
  const canGoForward = clampedFocused < rows.length - 1;

  const goBack = useCallback((): void => {
    setViewOffset((o) => {
      const next = anchorIndex + o - 1;
      return next >= 0 ? o - 1 : o;
    });
  }, [anchorIndex]);

  const goForward = useCallback((): void => {
    setViewOffset((o) => {
      const next = anchorIndex + o + 1;
      return next <= rows.length - 1 ? o + 1 : o;
    });
  }, [anchorIndex, rows.length]);

  // Touch swipe support
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent): void => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent): void => {
      if (touchStartX.current === null) return;
      const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
      touchStartX.current = null;
      if (dx > 40) goBack();
      else if (dx < -40) goForward();
    },
    [goBack, goForward],
  );

  if (!timeline || metMs === 0) return null;
  if (rows.length === 0) return null;

  const prevRow = clampedFocused > 0 ? rows[clampedFocused - 1] : null;
  const focusRow = rows[clampedFocused];
  const nextRow = clampedFocused < rows.length - 1 ? rows[clampedFocused + 1] : null;

  // Dot indicators for position in the timeline
  const totalDots = Math.min(rows.length, 9);
  const dotStep = Math.max(1, Math.floor(rows.length / totalDots));

  return (
    <section className="border-t border-white/10 bg-black/80 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 sm:px-6">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Return Journey
          </h2>
          <p className="mt-0.5 text-[10px] text-zinc-600">Trans-Earth through splashdown</p>
        </div>
        {/* Navigation arrows */}
        <div className="flex items-center gap-1">
          <button
            onClick={goBack}
            disabled={!canGoBack}
            aria-label="Previous event"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25 sm:h-9 sm:w-9"
          >
            ‹
          </button>
          <button
            onClick={goForward}
            disabled={!canGoForward}
            aria-label="Next event"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25 sm:h-9 sm:w-9"
          >
            ›
          </button>
        </div>
      </div>

      {/* Carousel track */}
      <div
        className="px-4 pb-3 sm:px-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex gap-2 sm:gap-3" style={{ minHeight: "8.5rem" }}>
          {/* Previous card — hidden on mobile */}
          <div className="hidden sm:block sm:w-1/3">
            {prevRow !== undefined && prevRow !== null ? (
              <EventCard row={prevRow} metMs={metMs} isFocused={false} />
            ) : (
              <div className="h-full rounded-lg border border-white/5 bg-white/2 opacity-20" />
            )}
          </div>

          {/* Focused card — full width on mobile, 1/3 on sm+ */}
          <div className="w-full sm:w-1/3">
            {focusRow !== undefined ? (
              <EventCard row={focusRow} metMs={metMs} isFocused={true} />
            ) : null}
          </div>

          {/* Next card — hidden on mobile */}
          <div className="hidden sm:block sm:w-1/3">
            {nextRow !== undefined && nextRow !== null ? (
              <EventCard row={nextRow} metMs={metMs} isFocused={false} />
            ) : (
              <div className="h-full rounded-lg border border-white/5 bg-white/2 opacity-20" />
            )}
          </div>
        </div>

        {/* Position dots */}
        <div className="mt-2 flex items-center justify-center gap-1">
          {Array.from({ length: totalDots }, (_, i) => {
            const idx = i * dotStep;
            const isActive = Math.abs(idx - clampedFocused) < dotStep / 2;
            return (
              <span
                key={idx}
                className={`h-1 rounded-full transition-all duration-300 ${
                  isActive ? "w-3 bg-white/60" : "w-1 bg-white/15"
                }`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
