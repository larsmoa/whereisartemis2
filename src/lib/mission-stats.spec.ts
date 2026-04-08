import { describe, it, expect } from "vitest";
import { computeMissionStats } from "./mission-stats";
import type { TrajectoryDataPoint } from "@/types";

describe("computeMissionStats", () => {
  it("returns zeroed stats for empty array", () => {
    // Arrange & Act
    const result = computeMissionStats([]);

    // Assert
    expect(result.totalDistanceKm).toBe(0);
    expect(result.maxSpeedKms).toBe(0);
    expect(result.maxDistanceFromEarthKm).toBe(0);
    expect(result.maxDistanceDate).toBe("");
  });

  it("returns zeroed travel distance for single point", () => {
    // Arrange
    const point: TrajectoryDataPoint = {
      position: [10, 0, 0],
      speedKms: 3.5,
      date: "2026-04-02T02:00:00Z",
    };

    // Act
    const result = computeMissionStats([point]);

    // Assert
    expect(result.totalDistanceKm).toBe(0);
    expect(result.maxSpeedKms).toBe(3.5);
  });

  it("computes total distance across multiple segments", () => {
    // Arrange — two points along the X axis in scene units
    // scene unit to km: EARTH_SCENE_RADIUS=5.2, EARTH_RADIUS_KM=6378.137
    // km per scene unit = 6378.137 / 5.2 ≈ 1226.56
    const points: TrajectoryDataPoint[] = [
      { position: [0, 0, 0], speedKms: 1, date: "2026-04-02T02:00:00Z" },
      { position: [1, 0, 0], speedKms: 2, date: "2026-04-02T02:10:00Z" },
      { position: [2, 0, 0], speedKms: 1.5, date: "2026-04-02T02:20:00Z" },
    ];

    // Act
    const result = computeMissionStats(points);

    // Assert — two segments each 1 scene unit ≈ 1226.56 km → total ≈ 2453.13 km
    const expectedKmPerUnit = 6378.137 / 5.2;
    expect(result.totalDistanceKm).toBeCloseTo(expectedKmPerUnit * 2, 0);
  });

  it("picks the maximum speed across all points", () => {
    // Arrange
    const points: TrajectoryDataPoint[] = [
      { position: [5, 0, 0], speedKms: 2.0, date: "2026-04-02T02:00:00Z" },
      { position: [5, 5, 0], speedKms: 9.8, date: "2026-04-02T03:00:00Z" },
      { position: [5, 10, 0], speedKms: 1.2, date: "2026-04-02T04:00:00Z" },
    ];

    // Act
    const result = computeMissionStats(points);

    // Assert
    expect(result.maxSpeedKms).toBe(9.8);
  });

  it("picks the maximum distance from Earth surface and records its date", () => {
    // Arrange — second point is farther from origin
    const points: TrajectoryDataPoint[] = [
      { position: [10, 0, 0], speedKms: 1, date: "2026-04-04T00:00:00Z" },
      { position: [50, 0, 0], speedKms: 2, date: "2026-04-06T23:05:00Z" },
      { position: [15, 0, 0], speedKms: 1, date: "2026-04-09T00:00:00Z" },
    ];

    // Act
    const result = computeMissionStats(points);

    // Assert
    expect(result.maxDistanceDate).toBe("2026-04-06T23:05:00Z");
    // 50 scene units * (6378.137/5.2) - 6378.137 = 61326.something km from surface
    const expectedSurfaceKm = 50 * (6378.137 / 5.2) - 6378.137;
    expect(result.maxDistanceFromEarthKm).toBeCloseTo(expectedSurfaceKm, 0);
  });

  it("clamps distance to 0 when position is at origin (inside Earth)", () => {
    // Arrange
    const points: TrajectoryDataPoint[] = [
      { position: [0, 0, 0], speedKms: 0, date: "2026-04-10T23:54:00Z" },
    ];

    // Act
    const result = computeMissionStats(points);

    // Assert
    expect(result.maxDistanceFromEarthKm).toBe(0);
  });
});
