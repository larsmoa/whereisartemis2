import { describe, it, expect, vi, afterEach } from "vitest";
import type {
  ArtemisTimeline,
  TimelineActivity,
  TimelineAttitude,
  TimelineMilestone,
  TimelinePhase,
} from "@/types";
import {
  fetchArtemisTimeline,
  getCurrentActivity,
  getCurrentAttitudeMode,
  getCurrentTimelinePhase,
  getUpcomingActivities,
  getUpcomingMilestones,
  getReturnJourneyActivities,
} from "./timeline";

afterEach(() => vi.unstubAllGlobals());

const makeActivity = (
  name: string,
  type: TimelineActivity["type"],
  startMetMs: number,
  endMetMs: number,
): TimelineActivity => ({ name, type, startMetMs, endMetMs });

const makeAttitude = (mode: string, startMetMs: number, endMetMs: number): TimelineAttitude => ({
  mode,
  startMetMs,
  endMetMs,
});

const makePhase = (phase: string, startMetMs: number, endMetMs: number): TimelinePhase => ({
  phase,
  startMetMs,
  endMetMs,
});

const makeMilestone = (name: string, description: string, metMs: number): TimelineMilestone => ({
  name,
  description,
  metMs,
});

const ACTIVITIES: TimelineActivity[] = [
  makeActivity("Sleep", "sleep", 0, 1000),
  makeActivity("Burn", "maneuver", 1000, 2000),
  makeActivity("Science", "science", 2000, 3000),
];

const ATTITUDES: TimelineAttitude[] = [
  makeAttitude("Bias -XSI", 0, 1000),
  makeAttitude("RTC Burn", 1000, 2000),
  makeAttitude("Observation", 2000, 3000),
];

const PHASES: TimelinePhase[] = [
  makePhase("LEO", 0, 1000),
  makePhase("Trans-Lunar", 1000, 2000),
  makePhase("Trans-Earth", 2000, 3000),
];

const MILESTONES: TimelineMilestone[] = [
  makeMilestone("Launch", "Liftoff", 0),
  makeMilestone("TLI", "Trans-lunar injection", 1000),
  makeMilestone("Splashdown", "Pacific Ocean", 3000),
];

// --- fetchArtemisTimeline ---

describe("fetchArtemisTimeline", () => {
  const EMPTY_TIMELINE: ArtemisTimeline = {
    milestones: [],
    phases: [],
    activities: [],
    attitudes: [],
  };

  it("returns parsed timeline data on a successful response", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: (): Promise<ArtemisTimeline> => Promise.resolve(EMPTY_TIMELINE),
      }),
    );

    // Act
    const result = await fetchArtemisTimeline();

    // Assert
    expect(result).toEqual(EMPTY_TIMELINE);
  });

  it("throws an error when the response is not ok", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }),
    );

    // Act / Assert
    await expect(fetchArtemisTimeline()).rejects.toThrow("503");
  });
});

// --- getCurrentActivity ---

describe("getCurrentActivity", () => {
  it.each([
    [0, "Sleep"],
    [500, "Sleep"],
    [999, "Sleep"],
    [1000, "Burn"],
    [1500, "Burn"],
    [1999, "Burn"],
    [2000, "Science"],
  ] as const)("metMs=%s → %s", (metMs, expectedName) => {
    // Arrange / Act
    const result = getCurrentActivity(metMs, ACTIVITIES);

    // Assert
    expect(result?.name).toBe(expectedName);
  });

  it("returns null when metMs is after all activities end", () => {
    expect(getCurrentActivity(3000, ACTIVITIES)).toBeNull();
  });

  it("returns null for empty activities array", () => {
    expect(getCurrentActivity(500, [])).toBeNull();
  });
});

// --- getUpcomingActivities ---

describe("getUpcomingActivities", () => {
  it("returns activities whose startMetMs is after metMs", () => {
    const result = getUpcomingActivities(0, ACTIVITIES, 10);
    expect(result.map((a) => a.name)).toEqual(["Burn", "Science"]);
  });

  it("respects the count limit", () => {
    const result = getUpcomingActivities(0, ACTIVITIES, 1);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Burn");
  });

  it("returns empty array when all activities are in the past", () => {
    expect(getUpcomingActivities(9999, ACTIVITIES, 5)).toEqual([]);
  });

  it("does not include the currently active activity (start = metMs boundary)", () => {
    // At metMs=1000 the Burn activity starts — it is NOT 'upcoming', it's current
    const result = getUpcomingActivities(1000, ACTIVITIES, 10);
    expect(result.map((a) => a.name)).not.toContain("Burn");
  });
});

// --- getCurrentAttitudeMode ---

describe("getCurrentAttitudeMode", () => {
  it.each([
    [0, "Bias -XSI"],
    [500, "Bias -XSI"],
    [1000, "RTC Burn"],
    [1999, "RTC Burn"],
    [2000, "Observation"],
  ] as const)("metMs=%s → %s", (metMs, expected) => {
    // Arrange / Act / Assert
    expect(getCurrentAttitudeMode(metMs, ATTITUDES)).toBe(expected);
  });

  it("returns null when past all attitude entries", () => {
    expect(getCurrentAttitudeMode(3000, ATTITUDES)).toBeNull();
  });

  it("returns null for empty attitudes array", () => {
    expect(getCurrentAttitudeMode(500, [])).toBeNull();
  });
});

// --- getCurrentTimelinePhase ---

describe("getCurrentTimelinePhase", () => {
  it.each([
    [0, "LEO"],
    [999, "LEO"],
    [1000, "Trans-Lunar"],
    [2000, "Trans-Earth"],
  ] as const)("metMs=%s → %s", (metMs, expectedPhase) => {
    const result = getCurrentTimelinePhase(metMs, PHASES);
    expect(result?.phase).toBe(expectedPhase);
  });

  it("returns null when past all phases", () => {
    expect(getCurrentTimelinePhase(3000, PHASES)).toBeNull();
  });

  it("returns null for empty phases array", () => {
    expect(getCurrentTimelinePhase(500, [])).toBeNull();
  });
});

// --- getUpcomingMilestones ---

describe("getUpcomingMilestones", () => {
  it("returns milestones in the future", () => {
    const result = getUpcomingMilestones(500, MILESTONES, 10);
    expect(result.map((m) => m.name)).toEqual(["TLI", "Splashdown"]);
  });

  it("respects the count limit", () => {
    const result = getUpcomingMilestones(500, MILESTONES, 1);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("TLI");
  });

  it("excludes milestones at or before current MET", () => {
    // metMs=1000 means TLI milestone (metMs=1000) is not in the future
    const result = getUpcomingMilestones(1000, MILESTONES, 10);
    expect(result.map((m) => m.name)).toEqual(["Splashdown"]);
  });

  it("returns empty array when all milestones are past", () => {
    expect(getUpcomingMilestones(9999, MILESTONES, 5)).toEqual([]);
  });
});

// --- getReturnJourneyActivities ---

describe("getReturnJourneyActivities", () => {
  const TRANS_EARTH_MS = 499_932_000;

  const mixed: TimelineActivity[] = [
    makeActivity("Pre-TLI sleep", "sleep", 0, 50_000_000),
    makeActivity("TLI burn", "maneuver", 90_000_000, 91_000_000),
    makeActivity("Straddles boundary", "config", 490_000_000, 510_000_000),
    makeActivity("Full return", "science", 520_000_000, 600_000_000),
    makeActivity("EDL", "maneuver", 779_000_000, 783_000_000),
  ];

  it("excludes activities that end before Trans-Earth start", () => {
    const result = getReturnJourneyActivities(mixed);
    expect(result.map((a) => a.name)).not.toContain("Pre-TLI sleep");
    expect(result.map((a) => a.name)).not.toContain("TLI burn");
  });

  it("includes activities that straddle the Trans-Earth boundary", () => {
    const result = getReturnJourneyActivities(mixed);
    expect(result.map((a) => a.name)).toContain("Straddles boundary");
  });

  it("includes activities fully within Trans-Earth and EDL", () => {
    const result = getReturnJourneyActivities(mixed);
    expect(result.map((a) => a.name)).toContain("Full return");
    expect(result.map((a) => a.name)).toContain("EDL");
  });

  it("returns empty array for empty input", () => {
    expect(getReturnJourneyActivities([])).toEqual([]);
  });

  it("uses the correct Trans-Earth boundary (~" + TRANS_EARTH_MS.toString() + " ms)", () => {
    const justBefore = makeActivity("Just before", "config", TRANS_EARTH_MS - 1000, TRANS_EARTH_MS);
    const justAfter = makeActivity("Just after", "config", TRANS_EARTH_MS, TRANS_EARTH_MS + 1000);
    expect(getReturnJourneyActivities([justBefore])).toEqual([]);
    expect(getReturnJourneyActivities([justAfter])).toHaveLength(1);
  });
});
