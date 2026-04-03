import type { Vec3 } from "@/types";

/**
 * Earth radius in km — used as the log-scale normalizer.
 * All scene radii are expressed relative to this value (Earth = 1.0 scene unit).
 */
const EARTH_RADIUS_KM = 6378.137;

/**
 * Controls how spread out the scene is.
 * log10(1 + 384400/6378) * SCALE ≈ 1.78 * SCALE → Moon at ~36 scene units when SCALE=20.
 */
const SCALE = 20;

/**
 * Map a real-world radial distance (km from Earth) to a scene distance using a
 * logarithmic scale: log10(1 + r/R) * SCALE.
 *
 * Applied to the *magnitude* of the position vector, not per-axis, so the
 * direction (orbital geometry) is preserved exactly.
 */
function logMapMagnitude(r: number): number {
  return Math.log10(1 + r / EARTH_RADIUS_KM) * SCALE;
}

/**
 * Convert an Earth-centred J2000 ecliptic position (km) into scene units.
 *
 * The log scale is applied to the vector magnitude so that direction is
 * preserved — i.e. the angular position of each body around Earth is correct.
 * Only the radial distance is compressed.
 *
 * J2000 ecliptic axes: X toward vernal equinox, Y 90° along ecliptic, Z = ecliptic north.
 * We map ecliptic axes 1:1 to scene axes. The camera sits at +Z and looks toward
 * the origin, so the XY plane (ecliptic plane) is the visible orbital plane.
 */
export function toScenePosition(pos: Vec3): [number, number, number] {
  const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
  if (r === 0) return [0, 0, 0];

  const sceneR = logMapMagnitude(r);
  const scale = sceneR / r;
  return [pos.x * scale, pos.y * scale, pos.z * scale];
}
