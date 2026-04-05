"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useArtemisData } from "@/hooks/useArtemisData";
import { useInterpolatedArtemisData } from "@/hooks/useInterpolatedArtemisData";
import { useArtemisTrajectory } from "@/hooks/useArtemisTrajectory";
import { useMoonTrajectory } from "@/hooks/useMoonTrajectory";
import { useNextMilestone } from "@/hooks/useNextMilestone";
import { useUnitSystem } from "@/hooks/useUnitSystem";
import { StatCard } from "@/components/ui/StatCard";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { SceneViewToggle, UnitToggle, SpeedChart, UpcomingEvents } from "@/components/ui";
import { YouTubeEmbed } from "@/components/ui/YouTubeEmbed";
import { MissionFeed } from "@/components/ui/MissionFeed";
import type { SceneView, ScenePoint } from "@/types";
import {
  formatDistance,
  formatSpeed,
  formatSpeedPerHour,
  formatElapsed,
  formatDelay,
} from "@/lib/format";
import type { UnitSystem } from "@/lib/format";

// SpaceScene uses WebGL — load client-side only, no SSR
const SpaceScene = dynamic(
  () => import("@/components/three/SpaceScene").then((m) => m.SpaceScene),
  { ssr: false },
);

function ScenePanel({
  sceneView,
  setSceneView,
  unitSystem,
  setUnitSystem,
  data,
  trajectory,
  moonTrajectory,
  plannedTrajectory,
  plannedMoonTrajectory,
  isPending,
  error,
  isMobile,
}: {
  sceneView: SceneView;
  setSceneView: (v: SceneView) => void;
  unitSystem: UnitSystem;
  setUnitSystem: (v: UnitSystem) => void;
  data: ReturnType<typeof useArtemisData>["data"];
  trajectory: ScenePoint[] | null;
  moonTrajectory: ReturnType<typeof useMoonTrajectory>["data"];
  plannedTrajectory: ScenePoint[] | null;
  plannedMoonTrajectory: ReturnType<typeof useMoonTrajectory>["data"];
  isPending: boolean;
  error: ReturnType<typeof useArtemisData>["error"];
  isMobile: boolean;
}): React.JSX.Element {
  return (
    <div className="relative overflow-hidden h-full w-full">
      <div className="pointer-events-auto absolute bottom-4 left-4 z-20 flex flex-col gap-2">
        <SceneViewToggle value={sceneView} onChange={setSceneView} />
        <UnitToggle value={unitSystem} onChange={setUnitSystem} />
      </div>
      {isPending && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-zinc-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
            <span className="text-sm">Fetching live position data…</span>
          </div>
        </div>
      )}
      {error && !data && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-6 py-4 text-center text-sm text-red-400">
            <p className="font-semibold">Failed to load tracking data</p>
            <p className="mt-1 text-xs text-red-500">{error.message}</p>
          </div>
        </div>
      )}
      <Suspense>
        <SpaceScene
          view={sceneView}
          data={data ?? null}
          trajectory={trajectory ?? null}
          moonTrajectory={moonTrajectory ?? null}
          plannedTrajectory={plannedTrajectory ?? null}
          plannedMoonTrajectory={plannedMoonTrajectory ?? null}
          className="h-full w-full"
        />
      </Suspense>
      <div className="pointer-events-none absolute bottom-4 left-1/2 max-w-[min(100%,24rem)] -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-4 py-1.5 text-center text-xs text-zinc-500 backdrop-blur-sm">
        {isMobile
          ? sceneView === "free"
            ? "Drag to orbit · Pinch to zoom"
            : "Drag to pan · Pinch to zoom"
          : sceneView === "free"
            ? "Drag to orbit · Scroll to zoom"
            : "Drag to pan · Scroll to zoom"}
      </div>
    </div>
  );
}

function StatsSection({
  data,
  trajectoryData,
  milestone,
  secondsRemaining,
  unitSystem,
}: {
  data: ReturnType<typeof useArtemisData>["data"];
  trajectoryData: ReturnType<typeof useArtemisTrajectory>["data"];
  milestone: ReturnType<typeof useNextMilestone>["milestone"];
  secondsRemaining: ReturnType<typeof useNextMilestone>["secondsRemaining"];
  unitSystem: UnitSystem;
}): React.JSX.Element {
  return (
    <section className="border-t border-white/10 bg-black/80 backdrop-blur-sm">
      <div className="grid grid-cols-2 gap-2 p-3 sm:gap-3 sm:p-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Distance from Earth"
          value={data ? formatDistance(data.distanceFromEarthKm, unitSystem) : "—"}
          sub="from Earth surface"
        />
        <StatCard
          label="Distance from Moon"
          value={data ? formatDistance(data.distanceFromMoonKm, unitSystem) : "—"}
          sub="from Moon surface"
        />
        <StatCard
          label="Speed"
          value={data ? formatSpeed(data.speedKms, unitSystem) : "—"}
          {...(data ? { sub: formatSpeedPerHour(data.speedKms, unitSystem) } : {})}
        >
          {trajectoryData && trajectoryData.length > 1 && (
            <SpeedChart data={trajectoryData} unitSystem={unitSystem} />
          )}
        </StatCard>
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
        <StatCard
          label={milestone ? `Next: ${milestone.name}` : "Next Milestone"}
          value={milestone ? formatElapsed(secondsRemaining) : "—"}
          sub={milestone ? "countdown" : "mission complete"}
        />
      </div>
    </section>
  );
}

function PageHeader({ lastUpdated }: { lastUpdated: Date | null }): React.JSX.Element {
  return (
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
  );
}

function PageFooter(): React.JSX.Element {
  return (
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
      (body -1024). Updated every 30 seconds.
    </footer>
  );
}

export default function Home(): React.JSX.Element {
  const { data: rawData, isPending, error, dataUpdatedAt } = useArtemisData();
  const data = useInterpolatedArtemisData(rawData);
  const { data: trajectoryData } = useArtemisTrajectory("past");
  const { data: plannedTrajectoryData } = useArtemisTrajectory("future");
  const { data: moonTrajectory } = useMoonTrajectory("past");
  const { data: plannedMoonTrajectory } = useMoonTrajectory("future");
  const { milestone, secondsRemaining } = useNextMilestone();
  const { unitSystem, setUnitSystem } = useUnitSystem();
  const [mounted, setMounted] = useState(false);

  const trajectory = useMemo(
    () => trajectoryData?.map((p) => p.position) ?? null,
    [trajectoryData],
  );
  const plannedTrajectory = useMemo(
    () => plannedTrajectoryData?.map((p) => p.position) ?? null,
    [plannedTrajectoryData],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const lastUpdated = mounted && dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const [sceneView, setSceneView] = useState<SceneView>("top");

  const scenePanelProps = {
    sceneView,
    setSceneView,
    unitSystem,
    setUnitSystem,
    data: mounted ? data : undefined,
    trajectory,
    moonTrajectory,
    plannedTrajectory,
    plannedMoonTrajectory,
    isPending,
    error,
  };

  const statsProps = {
    data: mounted ? data : undefined,
    trajectoryData: mounted ? trajectoryData : undefined,
    milestone: mounted ? milestone : null,
    secondsRemaining: mounted ? secondsRemaining : 0,
    unitSystem,
  };

  return (
    <>
      {/* Mobile: scrollable layout with a fixed-height 3D scene */}
      <div className="flex min-h-svh flex-col bg-black text-white sm:hidden">
        <PageHeader lastUpdated={lastUpdated} />
        <div className="h-[45svh] shrink-0">
          <ScenePanel {...scenePanelProps} isMobile={true} />
        </div>
        <StatsSection {...statsProps} />
        {/* YouTube embed: full-width 16:9 below stats */}
        <div className="border-t border-white/10">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <YouTubeEmbed className="absolute inset-0 border-l-0" />
          </div>
        </div>
        <UpcomingEvents />
        <MissionFeed />
        <PageFooter />
      </div>

      {/* Desktop: tracker section fills viewport, feed scrolls below */}
      <div className="hidden bg-black text-white sm:block">
        {/* Top tracker section: fixed to viewport height */}
        <div className="grid" style={{ gridTemplateRows: "auto 1fr auto", height: "100dvh" }}>
          <PageHeader lastUpdated={lastUpdated} />
          {/* Scene row: 2:1 split between 3D scene and YouTube */}
          <div className="grid min-h-0" style={{ gridTemplateColumns: "2fr 1fr" }}>
            <ScenePanel {...scenePanelProps} isMobile={false} />
            <YouTubeEmbed />
          </div>
          <StatsSection {...statsProps} />
        </div>
        {/* Mission feed: scrolls below the tracker */}
        <UpcomingEvents />
        <MissionFeed />
        <PageFooter />
      </div>
    </>
  );
}
