"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { TrajectoryDataPoint } from "@/types";

const STALE_TIME = 300_000;

async function fetchTrajectoryData(type: "past" | "future"): Promise<TrajectoryDataPoint[]> {
  const res = await fetch(`/api/artemis/trajectory?type=${type}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = (await res.json()) as TrajectoryDataPoint[] | { error: string };
  if (!Array.isArray(json)) {
    throw new Error(json.error);
  }
  return json;
}

export function useArtemisTrajectory(
  type: "past" | "future" = "past",
): UseQueryResult<TrajectoryDataPoint[], Error> {
  return useQuery({
    queryKey: ["artemis", "trajectory", type],
    queryFn: () => fetchTrajectoryData(type),
    staleTime: STALE_TIME,
    refetchInterval: STALE_TIME,
  });
}
