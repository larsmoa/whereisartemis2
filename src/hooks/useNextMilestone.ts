"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getNextMilestone, type Milestone } from "@/lib/milestones";

export interface NextMilestoneState {
  milestone: Milestone | null;
  secondsRemaining: number;
}

async function fetchMilestones(): Promise<Milestone[]> {
  const res = await fetch("/api/milestones");
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = (await res.json()) as { name: string; date: string }[];
  return json.map((m) => ({
    name: m.name,
    date: new Date(m.date),
  }));
}

export function useNextMilestone(): NextMilestoneState {
  const { data: milestones = [] } = useQuery({
    queryKey: ["milestones"],
    queryFn: fetchMilestones,
    staleTime: 3600_000, // 1 hour
  });

  const [state, setState] = useState<NextMilestoneState>(() => {
    const now = new Date();
    const milestone = getNextMilestone(milestones, now);
    const secondsRemaining = milestone
      ? Math.max(0, Math.floor((milestone.date.getTime() - now.getTime()) / 1000))
      : 0;
    return { milestone, secondsRemaining };
  });

  useEffect(() => {
    if (milestones.length === 0) return;

    const updateState = (): void => {
      const tickNow = new Date();
      const milestone = getNextMilestone(milestones, tickNow);
      const secondsRemaining = milestone
        ? Math.max(0, Math.floor((milestone.date.getTime() - tickNow.getTime()) / 1000))
        : 0;
      setState({ milestone, secondsRemaining });
    };

    // Run immediately once (async to avoid synchronous setState warning)
    const timeout = setTimeout(updateState, 0);
    const interval = setInterval(updateState, 1000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [milestones]);

  return state;
}
