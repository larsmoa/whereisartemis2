"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ArtemisTimeline } from "@/types";

async function fetchTimeline(): Promise<ArtemisTimeline> {
  const res = await fetch("/api/timeline");
  if (!res.ok) {
    throw new Error(`Timeline API error: HTTP ${res.status.toString()}`);
  }
  return res.json() as Promise<ArtemisTimeline>;
}

export function useTimeline(): UseQueryResult<ArtemisTimeline, Error> {
  return useQuery({
    queryKey: ["timeline"],
    queryFn: fetchTimeline,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
  });
}
