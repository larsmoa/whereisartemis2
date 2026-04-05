import { describe, it, expect } from "vitest";
import {
  formatDistance,
  formatSpeed,
  formatSpeedPerHour,
  formatElapsed,
  formatDelay,
} from "./format";
import type { UnitSystem } from "./format";

describe("formatDistance", () => {
  it.each([
    [0, "metric", 0, "0 km"],
    [384400, "metric", 0, "384,400 km"],
    [7675.5, "metric", 1, "7,675.5 km"],
    [1.5, "metric", 2, "1.50 km"],
    [0, "us", 0, "0 mi"],
    [384400, "us", 0, "238,855 mi"],
    [7675.5, "us", 1, "4,769.3 mi"],
    [1.5, "us", 2, "0.93 mi"],
  ] as const)("formatDistance(%s, %s, %s) → %s", (km, system, decimals, expected) => {
    expect(formatDistance(km, system as UnitSystem, decimals)).toBe(expected);
  });
});

describe("formatSpeed", () => {
  it.each([
    [2.54, "metric", "2.54 km/s"],
    [10, "metric", "10.00 km/s"],
    [9.9999, "metric", "10.00 km/s"],
    [2.54, "us", "1.58 mi/s"],
    [10, "us", "6.21 mi/s"],
    [9.9999, "us", "6.21 mi/s"],
  ] as const)("formatSpeed(%s, %s) → %s", (kms, system, expected) => {
    expect(formatSpeed(kms, system as UnitSystem)).toBe(expected);
  });
});

describe("formatSpeedPerHour", () => {
  it.each([
    [2.54, "metric", "9,144 km/h"],
    [10, "metric", "36,000 km/h"],
    [2.54, "us", "5,682 mph"],
    [10, "us", "22,369 mph"],
  ] as const)("formatSpeedPerHour(%s, %s) → %s", (kms, system, expected) => {
    expect(formatSpeedPerHour(kms, system as UnitSystem)).toBe(expected);
  });
});

describe("formatElapsed", () => {
  it.each([
    [0, "0s"],
    [45, "45s"],
    [90, "1m 30s"],
    [3600, "1h 0m 0s"],
    [7200, "2h 0m 0s"],
    [3661, "1h 1m 1s"],
    [2 * 86400 + 3 * 3600 + 4 * 60 + 5, "2d 3h 4m 5s"],
  ] as const)("formatElapsed(%s) → %s", (seconds, expected) => {
    expect(formatElapsed(seconds)).toBe(expected);
  });
});

describe("formatDelay", () => {
  it.each([
    [0.025, "25 ms"],
    [0.5, "500 ms"],
    [1, "1.00 s"],
    [1.278, "1.28 s"],
  ] as const)("formatDelay(%s) → %s", (seconds, expected) => {
    expect(formatDelay(seconds)).toBe(expected);
  });
});
