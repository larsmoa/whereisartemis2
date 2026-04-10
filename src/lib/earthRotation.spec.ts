import { describe, it, expect } from "vitest";
import { julianDate, greenwichMeanSiderealTime } from "./earthRotation";

describe("julianDate", () => {
  it.each([
    // Unix epoch = JD 2440587.5
    [new Date("1970-01-01T00:00:00.000Z"), 2440587.5],
    // J2000 epoch: 2000-01-01 12:00:00 UTC = JD 2451545.0
    [new Date("2000-01-01T12:00:00.000Z"), 2451545.0],
    // One Julian day after J2000
    [new Date("2000-01-02T12:00:00.000Z"), 2451546.0],
  ] as const)("julianDate(%s) ≈ %f", (date, expected) => {
    expect(julianDate(date)).toBeCloseTo(expected, 5);
  });
});

describe("greenwichMeanSiderealTime", () => {
  it("returns a value in [0, 2π) for any input", () => {
    const gmst = greenwichMeanSiderealTime(new Date("2000-01-01T12:00:00.000Z"));
    expect(gmst).toBeGreaterThanOrEqual(0);
    expect(gmst).toBeLessThan(2 * Math.PI);
  });

  it.each([
    // J2000 epoch: GMST ≈ 280.46061837° → ~4.8949 rad
    ["2000-01-01T12:00:00.000Z", 280.46061837],
    // One sidereal day later: GMST advances by 360.98564736629° ≡ ~0.986° net increase (mod 360)
    // 280.46061837 + 360.98564736629 mod 360 ≈ 281.44626574°
    ["2000-01-02T12:00:00.000Z", 281.44626574],
    // Two sidereal days later
    // 280.46061837 + 2 * 360.98564736629 mod 360 ≈ 282.43191310°
    ["2000-01-03T12:00:00.000Z", 282.4319131],
  ] as const)("GMST at %s ≈ %f°", (isoString, expectedDeg) => {
    const date = new Date(isoString);
    const gmstRad = greenwichMeanSiderealTime(date);
    const gmstDeg = (gmstRad * 180) / Math.PI;
    expect(gmstDeg).toBeCloseTo(expectedDeg, 3);
  });

  it("advances by the correct sidereal angular velocity between two times", () => {
    const t1 = new Date("2024-11-16T06:00:00.000Z");
    const t2 = new Date(t1.getTime() + 3600_000); // 1 hour later

    const gmst1 = greenwichMeanSiderealTime(t1);
    const gmst2 = greenwichMeanSiderealTime(t2);

    // Earth angular velocity: 2π / 86164.1 rad/s * 3600 s ≈ 0.26252 rad/h
    const expectedDelta = (2 * Math.PI * 3600) / 86164.1;
    const actualDelta = (gmst2 - gmst1 + 2 * Math.PI) % (2 * Math.PI);
    expect(actualDelta).toBeCloseTo(expectedDelta, 4);
  });
});
