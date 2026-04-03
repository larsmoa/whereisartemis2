import type { TrajectoryPoint } from "@/types";
import { LAUNCH_TIME } from "./horizons";

export interface Milestone {
  name: string;
  date: Date;
}

function magnitude(v: { x: number; y: number; z: number }): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function distance(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

export function calculateMilestones(
  artemisTrajectory: TrajectoryPoint[],
  moonTrajectory: TrajectoryPoint[],
): Milestone[] {
  const milestones: Milestone[] = [];

  // 1. Launch
  milestones.push({ name: "Launch", date: LAUNCH_TIME });

  // 2. Trans-Lunar Injection (TLI)
  // Look for the maximum velocity in the first 48 hours
  let maxVel = 0;
  let tliDate: Date | null = null;

  for (const pt of artemisTrajectory) {
    if (pt.date.getTime() > LAUNCH_TIME.getTime() + 48 * 3600 * 1000) break;
    const vel = magnitude(pt.velocity);
    if (vel > maxVel) {
      maxVel = vel;
      tliDate = pt.date;
    }
  }
  if (tliDate) {
    milestones.push({ name: "Trans-Lunar Injection", date: tliDate });
  }

  // 3. Lunar Flyby
  // Minimum distance between Artemis and Moon
  let minMoonDist = Infinity;
  let flybyDate: Date | null = null;

  // Match by closest time
  const moonMap = new Map<number, TrajectoryPoint>();
  for (const pt of moonTrajectory) {
    moonMap.set(pt.date.getTime(), pt);
  }

  for (const pt of artemisTrajectory) {
    const moonPt = moonMap.get(pt.date.getTime());
    if (!moonPt) continue;

    const dist = distance(pt.position, moonPt.position);
    if (dist < minMoonDist) {
      minMoonDist = dist;
      flybyDate = pt.date;
    }
  }

  if (flybyDate) {
    milestones.push({ name: "Lunar Flyby", date: flybyDate });
  }

  // 4. Splashdown
  // The last point in the trajectory
  if (artemisTrajectory.length > 0) {
    const lastPt = artemisTrajectory[artemisTrajectory.length - 1];
    if (lastPt) {
      milestones.push({ name: "Splashdown", date: lastPt.date });
    }
  }

  // Sort by date just in case
  return milestones.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function getNextMilestone(milestones: Milestone[], now: Date): Milestone | null {
  return milestones.find((m) => m.date.getTime() > now.getTime()) ?? null;
}
