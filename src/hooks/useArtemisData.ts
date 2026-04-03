"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { ArtemisData } from "@/types";

export const ARTEMIS_QUERY_KEY = ["artemis"] as const;

async function fetchArtemisData(): Promise<ArtemisData> {
  const res = await fetch("/api/artemis");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = (await res.json()) as ArtemisData & { error?: string };
  if (json.error) {
    throw new Error(json.error);
  }
  return json;
}

export function useArtemisData(): UseQueryResult<ArtemisData, Error> {
  return useQuery({
    queryKey: ARTEMIS_QUERY_KEY,
    queryFn: fetchArtemisData,
  });
}
