import { describe, it, expect } from "vitest";
import {
  getMissionPhase,
  isMissionComplete,
  getSecondsToSplashdown,
  isInCountdownWindow,
  REENTRY_START_TIME,
  SPLASHDOWN_ACTUAL_TIME,
  COUNTDOWN_WINDOW_MS,
} from "./mission-phase";
import { LAUNCH_TIME } from "./horizons";

/** Offset a date by milliseconds */
function offset(base: Date, ms: number): Date {
  return new Date(base.getTime() + ms);
}

const CLOSEST_APPROACH = new Date("2026-04-06T23:02:00Z");

describe("getMissionPhase", () => {
  it.each([
    [offset(LAUNCH_TIME, 0), "OUTBOUND"],
    [offset(LAUNCH_TIME, 1000), "OUTBOUND"],
    [offset(CLOSEST_APPROACH, -1000), "OUTBOUND"],
    [CLOSEST_APPROACH, "RETURN"],
    [offset(CLOSEST_APPROACH, 1000), "RETURN"],
    [offset(REENTRY_START_TIME, -1000), "RETURN"],
    [REENTRY_START_TIME, "REENTRY"],
    [offset(REENTRY_START_TIME, 60_000), "REENTRY"],
    [offset(SPLASHDOWN_ACTUAL_TIME, -61_000), "REENTRY"],
    [offset(SPLASHDOWN_ACTUAL_TIME, -60_000), "SPLASHDOWN_MOMENT"],
    [SPLASHDOWN_ACTUAL_TIME, "SPLASHDOWN_MOMENT"],
    [offset(SPLASHDOWN_ACTUAL_TIME, 59_000), "SPLASHDOWN_MOMENT"],
    [offset(SPLASHDOWN_ACTUAL_TIME, 60_000), "COMPLETE"],
    [offset(SPLASHDOWN_ACTUAL_TIME, 3_600_000), "COMPLETE"],
  ] as const)("returns %s for %s", (date, expected) => {
    expect(getMissionPhase(date)).toBe(expected);
  });
});

describe("isMissionComplete", () => {
  it("returns false before splashdown window", () => {
    expect(isMissionComplete(offset(SPLASHDOWN_ACTUAL_TIME, -120_000))).toBe(false);
  });

  it("returns true during SPLASHDOWN_MOMENT phase", () => {
    expect(isMissionComplete(SPLASHDOWN_ACTUAL_TIME)).toBe(true);
  });

  it("returns true after COMPLETE phase starts", () => {
    expect(isMissionComplete(offset(SPLASHDOWN_ACTUAL_TIME, 120_000))).toBe(true);
  });
});

describe("getSecondsToSplashdown", () => {
  it("returns positive value before splashdown", () => {
    const result = getSecondsToSplashdown(offset(SPLASHDOWN_ACTUAL_TIME, -5_000));
    expect(result).toBe(5);
  });

  it("returns 0 at splashdown", () => {
    expect(getSecondsToSplashdown(SPLASHDOWN_ACTUAL_TIME)).toBe(0);
  });

  it("returns negative value after splashdown", () => {
    const result = getSecondsToSplashdown(offset(SPLASHDOWN_ACTUAL_TIME, 10_000));
    expect(result).toBe(-10);
  });
});

describe("isInCountdownWindow", () => {
  it("returns false well before countdown window", () => {
    expect(isInCountdownWindow(offset(SPLASHDOWN_ACTUAL_TIME, -(COUNTDOWN_WINDOW_MS + 1000)))).toBe(
      false,
    );
  });

  it("returns true at exactly COUNTDOWN_WINDOW_MS before splashdown", () => {
    expect(isInCountdownWindow(offset(SPLASHDOWN_ACTUAL_TIME, -COUNTDOWN_WINDOW_MS))).toBe(true);
  });

  it("returns true just before splashdown", () => {
    expect(isInCountdownWindow(offset(SPLASHDOWN_ACTUAL_TIME, -1000))).toBe(true);
  });

  it("returns true at exactly splashdown (diffMs = 0)", () => {
    expect(isInCountdownWindow(SPLASHDOWN_ACTUAL_TIME)).toBe(true);
  });

  it("returns false after splashdown", () => {
    expect(isInCountdownWindow(offset(SPLASHDOWN_ACTUAL_TIME, 1000))).toBe(false);
  });
});
