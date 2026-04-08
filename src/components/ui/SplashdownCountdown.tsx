"use client";

import { useState, useEffect } from "react";
import { getSecondsToSplashdown, isInCountdownWindow, getMissionPhase } from "@/lib/mission-phase";
import { formatElapsed } from "@/lib/format";

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "T+0";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `T−${h}h ${mm}m ${ss}s`;
  if (m > 0) return `T−${mm}m ${ss}s`;
  return `T−${ss}s`;
}

function formatElapsedSince(totalSeconds: number): string {
  return `T+${formatElapsed(Math.abs(totalSeconds))}`;
}

/**
 * Replaces the "Next Milestone" stat card during the 30-minute splashdown countdown window
 * and post-splashdown. Escalates urgency visually as T−0 approaches.
 */
export function SplashdownCountdown(): React.JSX.Element {
  const [secondsTo, setSecondsTo] = useState(() => getSecondsToSplashdown(new Date()));
  const [phase, setPhase] = useState(() => getMissionPhase(new Date()));

  useEffect(() => {
    const tick = (): void => {
      setSecondsTo(getSecondsToSplashdown(new Date()));
      setPhase(getMissionPhase(new Date()));
    };
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, []);

  const isPast = secondsTo <= 0;
  const isCritical = !isPast && secondsTo <= 300; // T−5 min
  const isMoment = phase === "SPLASHDOWN_MOMENT";
  const isComplete = phase === "COMPLETE";

  let label: string;
  let value: string;
  let sub: string;
  let ringClass: string;

  if (isMoment) {
    label = "SPLASHDOWN";
    value = "NOW";
    sub = "Pacific Ocean";
    ringClass = "ring-2 ring-emerald-400/60 animate-pulse";
  } else if (isComplete) {
    label = "Splashdown +";
    value = formatElapsedSince(secondsTo);
    sub = "mission complete";
    ringClass = "ring-1 ring-emerald-500/30";
  } else if (isCritical) {
    label = "Splashdown";
    value = formatCountdown(secondsTo);
    sub = "imminent";
    ringClass = "ring-2 ring-red-400/50 animate-pulse";
  } else {
    label = "Splashdown";
    value = formatCountdown(secondsTo);
    sub = "countdown";
    ringClass = "ring-1 ring-amber-500/30";
  }

  const textClass =
    isMoment || isComplete ? "text-emerald-300" : isCritical ? "text-red-300" : "text-amber-300";

  return (
    <div
      className={`relative overflow-hidden flex h-full flex-col gap-0.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm sm:gap-1 sm:px-5 sm:py-4 ${ringClass}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 sm:text-xs">
        {label}
      </span>
      <span className={`font-mono text-lg font-bold tabular-nums sm:text-2xl ${textClass}`}>
        {value}
      </span>
      <span className="hidden text-xs text-zinc-500 sm:block">{sub}</span>
    </div>
  );
}

/** True when the countdown card should replace the regular "Next Milestone" card */
export function useShowSplashdownCountdown(): boolean {
  const [show, setShow] = useState(() => {
    const phase = getMissionPhase(new Date());
    return isInCountdownWindow(new Date()) || phase === "SPLASHDOWN_MOMENT" || phase === "COMPLETE";
  });

  useEffect(() => {
    const tick = (): void => {
      const phase = getMissionPhase(new Date());
      setShow(
        isInCountdownWindow(new Date()) || phase === "SPLASHDOWN_MOMENT" || phase === "COMPLETE",
      );
    };
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

  return show;
}
