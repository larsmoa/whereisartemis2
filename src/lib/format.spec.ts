import { describe, it, expect } from "vitest";
import { formatKm, formatSpeed, formatElapsed, formatDelay } from "./format";

describe("formatKm", () => {
  it.each([
    [0, 0, "0 km"],
    [384400, 0, "384,400 km"],
    [7675.5, 1, "7,675.5 km"],
    [1.5, 2, "1.50 km"],
  ] as const)("formatKm(%s, %s) → %s", (km, decimals, expected) => {
    expect(formatKm(km, decimals)).toBe(expected);
  });
});

describe("formatSpeed", () => {
  it.each([
    [2.54, "2.54 km/s"],
    [10, "10.00 km/s"],
    [9.9999, "10.00 km/s"],
  ] as const)("formatSpeed(%s) → %s", (kms, expected) => {
    expect(formatSpeed(kms)).toBe(expected);
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
