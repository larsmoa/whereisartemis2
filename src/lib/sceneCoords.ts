import type { Vec3 } from "@/types";

/**
 * Earth radius in km — used as the log-scale normalizer.
 * All scene radii are expressed relative to this value (Earth = 1.0).
 */
const EARTH_RADIUS_KM = 6378.137;

/**
 * Controls how spread out the scene is.
 * At SCALE = 30 the Moon sits ~30 scene units from Earth, which is
 * comfortable with a camera positioned at ~60 units.
 */
const SCALE = 30;

/**
 * Map a real-world km distance to a scene unit using a log scale.
 * log10(1 + d/R) * SCALE
 *
 * This compresses huge distances (Earth→Moon ~384 000 km) into a
 * viewable range while preserving the correct relative ordering.
 */
function logMap(km: number): number {
  return Math.log10(1 + Math.abs(km) / EARTH_RADIUS_KM) * SCALE;
}

/**
 * Convert an Earth-centred J2000 ecliptic position (km) into scene units.
 * The J2000 ecliptic X axis points toward the vernal equinox; Z is ecliptic north.
 * We map X→scene X and Z→scene Z so that the top-down (Y-up) camera sees
 * the orbital plane correctly.  The J2000 Y component is small for Moon-
 * vicinity objects and is mapped to scene Y (visible only when tilting).
 */
export function toScenePosition(pos: Vec3): [number, number, number] {
  const sx = Math.sign(pos.x) * logMap(pos.x);
  const sy = Math.sign(pos.y) * logMap(pos.y);
  const sz = Math.sign(pos.z) * logMap(pos.z);
  return [sx, sy, sz];
}
