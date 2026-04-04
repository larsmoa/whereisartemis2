import { describe, expect, it } from "vitest";
import type { TrajectoryPoint } from "@/types";
import { LAUNCH_TIME } from "./horizons";
import { calculateMilestones, getNextMilestone } from "./milestones";

function point(
  offsetMs: number,
  position: { x: number; y: number; z: number },
  velocity: { x: number; y: number; z: number },
): TrajectoryPoint {
  return {
    position,
    velocity,
    date: new Date(LAUNCH_TIME.getTime() + offsetMs),
  };
}

describe("getNextMilestone", () => {
  it("returns the first milestone strictly after now", () => {
    const milestones = [
      { name: "Past", date: new Date("2020-01-01T00:00:00Z") },
      { name: "Future", date: new Date("2040-01-01T00:00:00Z") },
    ];
    const next = getNextMilestone(milestones, new Date("2030-01-01T00:00:00Z"));
    expect(next).toEqual({ name: "Future", date: new Date("2040-01-01T00:00:00Z") });
  });

  it("returns null when every milestone is in the past", () => {
    const milestones = [{ name: "Past", date: new Date("2020-01-01T00:00:00Z") }];
    expect(getNextMilestone(milestones, new Date("2030-01-01T00:00:00Z"))).toBeNull();
  });
});

describe("calculateMilestones", () => {
  it("includes launch and splashdown when trajectories allow", () => {
    const artemis: TrajectoryPoint[] = [
      point(0, { x: 6_500_000, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }),
      point(3_600_000, { x: 6_500_000, y: 0, z: 0 }, { x: 15, y: 0, z: 0 }),
      point(7_200_000, { x: 6_600_000, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }),
    ];
    const moon: TrajectoryPoint[] = [
      point(3_600_000, { x: 384_000_000, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }),
      point(7_200_000, { x: 6_600_000, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }),
    ];

    const result = calculateMilestones(artemis, moon);

    expect(result[0]?.name).toBe("Launch");
    expect(result.some((m) => m.name === "Trans-Lunar Injection")).toBe(true);
    expect(result.some((m) => m.name === "Lunar Flyby")).toBe(true);
    expect(result.some((m) => m.name === "Splashdown")).toBe(true);
    expect(result).toEqual([...result].sort((a, b) => a.date.getTime() - b.date.getTime()));
  });

  it("omits TLI when no point in the first 48h beats velocity", () => {
    const artemis: TrajectoryPoint[] = [
      point(49 * 3_600_000, { x: 1, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }),
    ];
    const result = calculateMilestones(artemis, []);
    expect(result.some((m) => m.name === "Trans-Lunar Injection")).toBe(false);
  });

  it("omits splashdown when artemis trajectory is empty", () => {
    const result = calculateMilestones([], []);
    expect(result.some((m) => m.name === "Splashdown")).toBe(false);
  });
});
