"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { Group, Panel, Separator } from "react-resizable-panels";
import { useArtemisData } from "@/hooks/useArtemisData";
import { useInterpolatedArtemisData } from "@/hooks/useInterpolatedArtemisData";
import { useArtemisTrajectory } from "@/hooks/useArtemisTrajectory";
import { useMoonTrajectory } from "@/hooks/useMoonTrajectory";
import { useUnitSystem } from "@/hooks/useUnitSystem";
import { StatCard } from "@/components/ui/StatCard";
import { LiveBadge } from "@/components/ui/LiveBadge";
import {
  SceneViewToggle,
  UnitToggle,
  SpeedChart,
  UpcomingEvents,
  ImageReel,
} from "@/components/ui";
import { YouTubeEmbed } from "@/components/ui/YouTubeEmbed";
import { MissionFeed } from "@/components/ui/MissionFeed";
import { AboutFAQ } from "@/components/ui/AboutFAQ";
import {
  SplashdownCountdown,
  useShowSplashdownCountdown,
} from "@/components/ui/SplashdownCountdown";
import { MissionSummary } from "@/components/ui/MissionSummary";
import { NextEventCard } from "@/components/ui/NextEventCard";
import type { SceneView, ScenePoint } from "@/types";
import {
  formatDistance,
  formatSpeed,
  formatSpeedPerHour,
  formatElapsed,
  formatDelay,
} from "@/lib/format";
import type { UnitSystem } from "@/lib/format";
import { getMissionPhase, type MissionPhase } from "@/lib/mission-phase";

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
  missionPhase,
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
  missionPhase?: MissionPhase | undefined;
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
      <Suspense fallback={<div className="h-full w-full bg-black" />}>
        <SpaceScene
          view={sceneView}
          data={data ?? null}
          trajectory={trajectory ?? null}
          moonTrajectory={moonTrajectory ?? null}
          plannedTrajectory={plannedTrajectory ?? null}
          plannedMoonTrajectory={plannedMoonTrajectory ?? null}
          className="h-full w-full"
          missionPhase={missionPhase}
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
  unitSystem,
  showSplashdownCountdown,
}: {
  data: ReturnType<typeof useArtemisData>["data"];
  trajectoryData: ReturnType<typeof useArtemisTrajectory>["data"];
  unitSystem: UnitSystem;
  showSplashdownCountdown: boolean;
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
        {showSplashdownCountdown ? <SplashdownCountdown /> : <NextEventCard />}
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

export function TrackerApp(): React.JSX.Element {
  const { data: rawData, isPending, error, dataUpdatedAt } = useArtemisData();
  const data = useInterpolatedArtemisData(rawData);
  const { data: trajectoryData } = useArtemisTrajectory("past");
  const { data: plannedTrajectoryData } = useArtemisTrajectory("future");
  const { data: moonTrajectory } = useMoonTrajectory("past");
  const { data: plannedMoonTrajectory } = useMoonTrajectory("future");
  const { unitSystem, setUnitSystem } = useUnitSystem();
  const showSplashdownCountdown = useShowSplashdownCountdown();
  const [mounted, setMounted] = useState(false);
  const [missionPhase, setMissionPhase] = useState<MissionPhase>(() => getMissionPhase(new Date()));

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

  useEffect(() => {
    const tick = (): void => setMissionPhase(getMissionPhase(new Date()));
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

  const lastUpdated = mounted && dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const [sceneView, setSceneView] = useState<SceneView>("free");

  const isProminentPhase =
    mounted &&
    (missionPhase === "REENTRY" ||
      missionPhase === "SPLASHDOWN_MOMENT" ||
      missionPhase === "COMPLETE");

  const isMissionComplete = mounted && missionPhase === "COMPLETE";

  const scenePanelProps = {
    sceneView,
    setSceneView,
    unitSystem,
    setUnitSystem,
    data: mounted ? data : undefined,
    trajectory: mounted ? trajectory : null,
    moonTrajectory: mounted ? moonTrajectory : undefined,
    plannedTrajectory: mounted ? plannedTrajectory : null,
    plannedMoonTrajectory: mounted ? plannedMoonTrajectory : undefined,
    isPending: mounted ? isPending : true,
    error: mounted ? error : null,
    missionPhase: mounted ? missionPhase : undefined,
  };

  const statsProps = {
    data: mounted ? data : undefined,
    trajectoryData: mounted ? trajectoryData : undefined,
    unitSystem,
    showSplashdownCountdown: mounted ? showSplashdownCountdown : false,
  };

  return (
    <>
      {/* Mobile: scrollable layout with a fixed-height 3D scene */}
      <div className="flex min-h-svh flex-col bg-black text-white sm:hidden">
        <PageHeader lastUpdated={lastUpdated} />
        <div className="h-[45svh] shrink-0">
          <ScenePanel {...scenePanelProps} isMobile={true} />
        </div>
        {isMissionComplete ? (
          <MissionSummary unitSystem={unitSystem} />
        ) : (
          <StatsSection {...statsProps} />
        )}
        {/* YouTube embed: full-width 16:9 below stats */}
        <div className="border-t border-white/10">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <YouTubeEmbed className="absolute inset-0 border-l-0" />
          </div>
        </div>
        <UpcomingEvents />
        <ImageReel />
        <MissionFeed />
        <AboutFAQ />
        <PageFooter />
      </div>

      {/* Desktop: tracker section fills viewport, feed scrolls below */}
      <div className="hidden bg-black text-white sm:block">
        {/* Top tracker section: fixed to viewport height */}
        <div className="grid" style={{ gridTemplateRows: "auto 1fr auto", height: "100dvh" }}>
          <PageHeader lastUpdated={lastUpdated} />
          {/* Scene row: resizable split normally; full-width YouTube during critical phases */}
          <div className="flex min-h-0 relative">
            {isProminentPhase ? (
              <div className="flex h-full w-full flex-col">
                <div className="h-[35%] shrink-0 border-b border-white/10">
                  <ScenePanel {...scenePanelProps} isMobile={false} />
                </div>
                <div className="min-h-0 flex-1">
                  <YouTubeEmbed className="h-full" borderless />
                </div>
              </div>
            ) : (
              <Group orientation="horizontal">
                <Panel defaultSize={67} minSize={20}>
                  <div className="h-full w-full">
                    <ScenePanel {...scenePanelProps} isMobile={false} />
                  </div>
                </Panel>
                <Separator className="w-1 cursor-col-resize bg-white/10 hover:bg-white/30 active:bg-white/50 transition-colors z-30" />
                <Panel defaultSize={33} minSize={20}>
                  <div className="h-full w-full relative">
                    <YouTubeEmbed className="h-full" />
                  </div>
                </Panel>
              </Group>
            )}
          </div>
          {isMissionComplete ? (
            <MissionSummary unitSystem={unitSystem} />
          ) : (
            <StatsSection {...statsProps} />
          )}
        </div>
        {/* Mission feed: scrolls below the tracker */}
        <UpcomingEvents />
        <ImageReel />
        <MissionFeed />
        <AboutFAQ />
        <PageFooter />
      </div>
    </>
  );
}
