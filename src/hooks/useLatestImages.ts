"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

export interface ScrapedImage {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  publishedAt: string;
}

export interface LatestImagesResponse {
  images: ScrapedImage[];
  error?: string;
}

export const LATEST_IMAGES_QUERY_KEY = ["latest-images"] as const;

async function fetchLatestImages(): Promise<ScrapedImage[]> {
  const res = await fetch("/api/latest-images");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = (await res.json()) as LatestImagesResponse;
  if (json.error) {
    throw new Error(json.error);
  }
  return json.images;
}

export function useLatestImages(): UseQueryResult<ScrapedImage[], Error> {
  return useQuery({
    queryKey: LATEST_IMAGES_QUERY_KEY,
    queryFn: fetchLatestImages,
    staleTime: 300 * 1000, // 5 minutes
    refetchInterval: 300 * 1000, // Auto-refetch every 5 minutes
  });
}
