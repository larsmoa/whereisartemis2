"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { ScenePoint } from "@/types";

const STALE_TIME = 300_000;

async function fetchTrajectoryData(): Promise<ScenePoint[]> {
  const res = await fetch("/api/artemis/trajectory");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = (await res.json()) as ScenePoint[] | { error: string };
  if (!Array.isArray(json)) {
    throw new Error(json.error);
  }
  return json;
}

export function useArtemisTrajectory(): UseQueryResult<ScenePoint[], Error> {
  return useQuery({
    queryKey: ["artemis", "trajectory"],
    queryFn: fetchTrajectoryData,
    staleTime: STALE_TIME,
    refetchInterval: STALE_TIME,
  });
}
