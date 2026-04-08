"use client";

import { useMemo, useState, useEffect } from "react";
import { useArtemisTrajectory } from "@/hooks/useArtemisTrajectory";
import { computeMissionStats } from "@/lib/mission-stats";
import { formatDistance, formatSpeed, formatSpeedPerHour, formatElapsed } from "@/lib/format";
import type { UnitSystem } from "@/lib/format";
import { LAUNCH_TIME, SPLASHDOWN_TIME } from "@/lib/horizons";
import { getSecondsToSplashdown } from "@/lib/mission-phase";

interface SummaryCardProps {
  label: string;
  value: string;
  sub?: string | undefined;
}

function SummaryCard({ label, value, sub }: SummaryCardProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 sm:gap-1 sm:px-5 sm:py-4">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 sm:text-xs">
        {label}
      </span>
      <span className="font-mono text-lg font-bold tabular-nums text-emerald-300 sm:text-2xl">
        {value}
      </span>
      {sub && <span className="hidden text-xs text-zinc-500 sm:block">{sub}</span>}
    </div>
  );
}

interface MissionSummaryProps {
  unitSystem: UnitSystem;
}

export function MissionSummary({ unitSystem }: MissionSummaryProps): React.JSX.Element {
  const { data: pastData } = useArtemisTrajectory("past");
  const { data: futureData } = useArtemisTrajectory("future");

  const stats = useMemo(() => {
    const all = [...(pastData ?? []), ...(futureData ?? [])];
    return computeMissionStats(all);
  }, [pastData, futureData]);

  const missionDurationSeconds = Math.floor(
    (SPLASHDOWN_TIME.getTime() - LAUNCH_TIME.getTime()) / 1_000,
  );

  const [elapsedSinceSplashdown, setElapsedSinceSplashdown] = useState(0);

  useEffect(() => {
    const tick = (): void => {
      const seconds = -getSecondsToSplashdown(new Date());
      setElapsedSinceSplashdown(Math.max(0, seconds));
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, []);

  const hasStats = stats.totalDistanceKm > 0;

  return (
    <section className="border-t border-emerald-500/20 bg-black/80 backdrop-blur-sm">
      <div className="border-b border-emerald-500/20 px-4 py-2 sm:px-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
          Mission Complete — Artemis II
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 sm:gap-3 sm:p-4 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard
          label="Mission Duration"
          value={formatElapsed(missionDurationSeconds)}
          sub="launch to splashdown"
        />
        <SummaryCard
          label="Total Distance"
          value={hasStats ? formatDistance(Math.round(stats.totalDistanceKm), unitSystem) : "—"}
          sub="path length traveled"
        />
        <SummaryCard
          label="Peak Speed"
          value={hasStats ? formatSpeed(stats.maxSpeedKms, unitSystem) : "—"}
          sub={hasStats ? formatSpeedPerHour(stats.maxSpeedKms, unitSystem) : undefined}
        />
        <SummaryCard
          label="Farthest from Earth"
          value={
            hasStats ? formatDistance(Math.round(stats.maxDistanceFromEarthKm), unitSystem) : "—"
          }
          sub="surface to surface"
        />
        <SummaryCard
          label="Time Since Splashdown"
          value={`T+${formatElapsed(elapsedSinceSplashdown)}`}
          sub="crew is home"
        />
      </div>
    </section>
  );
}
