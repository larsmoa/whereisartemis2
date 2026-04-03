"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { ScenePoint } from "@/types";

const STALE_TIME = 300_000;

async function fetchMoonTrajectoryData(type: "past" | "future"): Promise<ScenePoint[]> {
  const res = await fetch(`/api/artemis/moon-trajectory?type=${type}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = (await res.json()) as ScenePoint[] | { error: string };
  if (!Array.isArray(json)) {
    throw new Error(json.error);
  }
  return json;
}

export function useMoonTrajectory(
  type: "past" | "future" = "past",
): UseQueryResult<ScenePoint[], Error> {
  return useQuery({
    queryKey: ["artemis", "moon-trajectory", type],
    queryFn: () => fetchMoonTrajectoryData(type),
    staleTime: STALE_TIME,
    refetchInterval: STALE_TIME,
  });
}
