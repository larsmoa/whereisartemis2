"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { NasaFeed } from "@/lib/nasa-feed";

export const NASA_FEED_QUERY_KEY = ["nasa-feed"] as const;

async function fetchNasaFeedData(): Promise<NasaFeed> {
  const res = await fetch("/api/nasa-feed");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = (await res.json()) as NasaFeed & { error?: string };
  if (json.error) {
    throw new Error(json.error);
  }
  return json;
}

export function useNasaFeed(): UseQueryResult<NasaFeed, Error> {
  return useQuery({
    queryKey: NASA_FEED_QUERY_KEY,
    queryFn: fetchNasaFeedData,
    staleTime: 3600 * 1000,
    refetchInterval: false,
  });
}
