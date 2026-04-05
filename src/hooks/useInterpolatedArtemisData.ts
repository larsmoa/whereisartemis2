"use client";

import { useSyncExternalStore } from "react";
import type { ArtemisData } from "@/types";
import { interpolateArtemisData } from "@/lib/interpolate";

let currentNow = Date.now();
const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function subscribe(callback: () => void): () => void {
  listeners.add(callback);

  if (listeners.size === 1 && intervalId === null) {
    intervalId = setInterval(() => {
      currentNow = Date.now();
      listeners.forEach((l) => l());
    }, 250);
  }

  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

function getSnapshot(): number {
  return currentNow;
}

function getServerSnapshot(): number {
  return 0;
}

export function useInterpolatedArtemisData(data: ArtemisData | undefined): ArtemisData | undefined {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!data || now === 0) {
    return data;
  }

  return interpolateArtemisData(data, now);
}
