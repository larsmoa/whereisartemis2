import type { TrajectoryDataPoint } from "@/types";
import { EARTH_SCENE_RADIUS } from "./sceneCoords";

/** Earth equatorial radius used for km ↔ scene-unit conversion */
const EARTH_RADIUS_KM = 6378.137;

/** Convert a scene-space magnitude back to kilometres */
function sceneMagnitudeToKm(sceneMag: number): number {
  return sceneMag * (EARTH_RADIUS_KM / EARTH_SCENE_RADIUS);
}

export interface MissionStats {
  /** Total path length in km (sum of all segment lengths) */
  totalDistanceKm: number;
  /** Peak speed over the mission in km/s */
  maxSpeedKms: number;
  /** Maximum distance from Earth surface in km */
  maxDistanceFromEarthKm: number;
  /** ISO timestamp when max distance was reached */
  maxDistanceDate: string;
}

/**
 * Compute mission summary statistics from the combined past + future trajectory.
 * Pass the concatenated array sorted by time; duplicates at the join are fine.
 */
export function computeMissionStats(points: TrajectoryDataPoint[]): MissionStats {
  if (points.length === 0) {
    return { totalDistanceKm: 0, maxSpeedKms: 0, maxDistanceFromEarthKm: 0, maxDistanceDate: "" };
  }

  let totalDistanceKm = 0;
  let maxSpeedKms = 0;
  let maxDistanceFromEarthKm = 0;
  let maxDistanceDate = points[0]?.date ?? "";

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (!pt) continue;

    // Speed
    if (pt.speedKms > maxSpeedKms) maxSpeedKms = pt.speedKms;

    // Distance from Earth (scene magnitude → km, subtract Earth radius)
    const [x, y, z] = pt.position;
    const sceneMag = Math.sqrt(x * x + y * y + z * z);
    const rangeKm = sceneMagnitudeToKm(sceneMag);
    const surfaceKm = Math.max(0, rangeKm - EARTH_RADIUS_KM);
    if (surfaceKm > maxDistanceFromEarthKm) {
      maxDistanceFromEarthKm = surfaceKm;
      maxDistanceDate = pt.date;
    }

    // Segment length
    if (i > 0) {
      const prev = points[i - 1];
      if (prev) {
        const [px, py, pz] = prev.position;
        const dx = x - px;
        const dy = y - py;
        const dz = z - pz;
        totalDistanceKm += sceneMagnitudeToKm(Math.sqrt(dx * dx + dy * dy + dz * dz));
      }
    }
  }

  return { totalDistanceKm, maxSpeedKms, maxDistanceFromEarthKm, maxDistanceDate };
}
