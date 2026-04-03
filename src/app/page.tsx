"use client";

import dynamic from "next/dynamic";
import { useArtemisData } from "@/hooks/useArtemisData";
import { StatCard } from "@/components/ui/StatCard";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { formatKm, formatSpeed, formatElapsed, formatDelay } from "@/lib/format";

// SpaceScene uses WebGL — load client-side only, no SSR
const SpaceScene = dynamic(
  () => import("@/components/three/SpaceScene").then((m) => m.SpaceScene),
  { ssr: false },
);

export default function Home(): React.JSX.Element {
  const { data, isPending, error, dataUpdatedAt } = useArtemisData();
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  return (
    <div
      className="grid bg-black text-white"
      style={{ gridTemplateRows: "auto 1fr auto auto", height: "100dvh" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Where is Artemis?</h1>
          <p className="text-xs text-zinc-500">Artemis II · Real-time tracking</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <LiveBadge />
          {lastUpdated && (
            <span className="text-[10px] text-zinc-600">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      {/* 3D Scene — grid row "1fr" means it takes all remaining height */}
      <div className="relative overflow-hidden">
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3 text-zinc-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
              <span className="text-sm">Fetching live position data…</span>
            </div>
          </div>
        )}
        {error && !data && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-6 py-4 text-center text-sm text-red-400">
              <p className="font-semibold">Failed to load tracking data</p>
              <p className="mt-1 text-xs text-red-500">{error.message}</p>
            </div>
          </div>
        )}
        <SpaceScene data={data ?? null} className="h-full w-full" />
        {/* Drag hint overlay */}
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-4 py-1.5 text-xs text-zinc-500 backdrop-blur-sm">
          Drag to pan · Scroll to zoom
        </div>
      </div>

      {/* Stats bar */}
      <section className="border-t border-white/10 bg-black/80 backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-5">
          <StatCard
            label="Distance from Earth"
            value={data ? formatKm(data.distanceFromEarthKm) : "—"}
            sub="from Earth surface"
          />
          <StatCard
            label="Distance from Moon"
            value={data ? formatKm(data.distanceFromMoonKm) : "—"}
            sub="from Moon surface"
          />
          <StatCard label="Speed" value={data ? formatSpeed(data.speedKms) : "—"} />
          <StatCard
            label="Signal delay"
            value={data ? formatDelay(data.signalDelaySeconds) : "—"}
            sub="one-way"
          />
          <StatCard
            label="Mission elapsed"
            value={data ? formatElapsed(data.missionElapsedSeconds) : "—"}
            sub="since launch"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-3 text-center text-[10px] text-zinc-700">
        Position data via{" "}
        <a
          href="https://ssd.jpl.nasa.gov/horizons/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-zinc-500"
        >
          NASA/JPL Horizons
        </a>{" "}
        (body -1024). Updated every 60 seconds.
      </footer>
    </div>
  );
}
