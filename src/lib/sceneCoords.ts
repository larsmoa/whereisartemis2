import type { Vec3 } from "@/types";

/**
 * Earth equatorial radius (km) — matches WGS84 / Horizons conventions.
 */
const EARTH_RADIUS_KM = 6378.137;

/**
 * Earth sphere radius in Three.js units — must stay in sync with `EarthMesh`.
 * Linear mapping: scene distance = (r_km / EARTH_RADIUS_KM) * EARTH_SCENE_RADIUS,
 * so the globe surface sits at the correct scale relative to trajectories.
 */
const EARTH_SCENE_RADIUS = 5.2;

/**
 * Map radial distance from Earth (km) to scene radius (linear, proportional to km).
 * Preserves true eccentricity of transfer orbits (unlike log compression).
 */
function mapMagnitude(r: number): number {
  return (r / EARTH_RADIUS_KM) * EARTH_SCENE_RADIUS;
}

/**
 * Convert an Earth-centred J2000 ecliptic position (km) into scene units.
 *
 * Linear scaling is applied to the vector magnitude so that direction is
 * preserved and radial ratios match physical distances (elliptical TLI arcs).
 *
 * J2000 ecliptic axes: X toward vernal equinox, Y 90° along ecliptic, Z = ecliptic north.
 * We map ecliptic axes 1:1 to scene axes. The camera sits at +Z and looks toward
 * the origin, so the XY plane (ecliptic plane) is the visible orbital plane.
 */
export function toScenePosition(pos: Vec3): [number, number, number] {
  const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
  if (r === 0) return [0, 0, 0];

  const sceneR = mapMagnitude(r);
  const scale = sceneR / r;
  return [pos.x * scale, pos.y * scale, pos.z * scale];
}
