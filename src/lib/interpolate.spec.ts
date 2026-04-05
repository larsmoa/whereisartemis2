import { describe, it, expect } from "vitest";
import { interpolateArtemisData } from "./interpolate";
import type { ArtemisData } from "@/types";
import { EARTH_RADIUS_KM, MOON_RADIUS_KM, LAUNCH_TIME } from "./horizons";

describe("interpolateArtemisData", () => {
  const mockBaseData: ArtemisData = {
    spacecraft: {
      position: { x: 10000, y: 0, z: 0 },
      velocity: { x: 10, y: 0, z: 0 },
      lightTime: 0,
      rangeKm: 10000,
      rangeRate: 10,
    },
    moon: {
      position: { x: 384400, y: 0, z: 0 },
      velocity: { x: 1, y: 0, z: 0 },
      lightTime: 0,
      rangeKm: 384400,
      rangeRate: 1,
    },
    speedKms: 10,
    distanceFromEarthKm: 10000 - EARTH_RADIUS_KM,
    distanceFromMoonKm: 374400 - MOON_RADIUS_KM,
    signalDelaySeconds: 10000 / 299792,
    missionElapsedSeconds: 0,
    timestamp: new Date("2026-04-02T02:00:00Z").toISOString(),
  };

  it.each([
    [
      0, // dt in seconds
      {
        spacecraftX: 10000,
        moonX: 384400,
      },
    ],
    [
      1, // dt in seconds
      {
        spacecraftX: 10010,
        moonX: 384401,
      },
    ],
    [
      10, // dt in seconds
      {
        spacecraftX: 10100,
        moonX: 384410,
      },
    ],
    [
      -5, // dt in seconds (negative, should return base data)
      {
        spacecraftX: 10000,
        moonX: 384400,
      },
    ],
  ] as const)("interpolates correctly for dt=%s", (dt, expected) => {
    const baseTimeMs = new Date(mockBaseData.timestamp).getTime();
    const nowMs = baseTimeMs + dt * 1000;

    const result = interpolateArtemisData(mockBaseData, nowMs);

    expect(result.spacecraft.position.x).toBe(expected.spacecraftX);
    expect(result.moon.position.x).toBe(expected.moonX);

    if (dt > 0) {
      const expectedRange = expected.spacecraftX;
      expect(result.distanceFromEarthKm).toBe(expectedRange - EARTH_RADIUS_KM);
      expect(result.distanceFromMoonKm).toBe(
        Math.abs(expected.moonX - expected.spacecraftX) - MOON_RADIUS_KM,
      );
      expect(result.signalDelaySeconds).toBe(expectedRange / 299792);
      expect(result.missionElapsedSeconds).toBe(Math.floor((nowMs - LAUNCH_TIME.getTime()) / 1000));
      expect(result.timestamp).toBe(new Date(nowMs).toISOString());
    } else {
      // For dt <= 0, should return original data
      expect(result.distanceFromEarthKm).toBe(mockBaseData.distanceFromEarthKm);
      expect(result.timestamp).toBe(mockBaseData.timestamp);
    }
  });
});
