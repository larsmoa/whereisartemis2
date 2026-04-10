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
export const EARTH_SCENE_RADIUS = 5.2;

/**
 * Map radial distance from Earth (km) to scene radius (linear, proportional to km).
 * Preserves true eccentricity of transfer orbits (unlike log compression).
 */
function mapMagnitude(r: number): number {
  return (r / EARTH_RADIUS_KM) * EARTH_SCENE_RADIUS;
}

/**
 * Convert geographic coordinates (degrees) to a local 3D position on a
 * Three.js SphereGeometry of the given radius.
 *
 * Three.js SphereGeometry maps lat/lon such that:
 *   x = R · cos(lon) · cos(lat)
 *   y = R · sin(lat)            (north pole = +Y in local sphere frame)
 *   z = −R · sin(lon) · cos(lat)
 *
 * The returned position is in the mesh's local frame, so it can be used
 * directly as the position of a child mesh (e.g. a surface marker) that
 * must rotate with the Earth.
 */
export function latLonToSphereLocal(
  latDeg: number,
  lonDeg: number,
  radius: number,
): [number, number, number] {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return [
    radius * Math.cos(lon) * Math.cos(lat),
    radius * Math.sin(lat),
    -radius * Math.sin(lon) * Math.cos(lat),
  ];
}

/** Earth's axial tilt relative to the J2000 ecliptic plane (radians) */
const EARTH_OBLIQUITY_RAD = 23.4392911 * (Math.PI / 180);

/**
 * X-rotation applied to the Earth group in the scene:
 * π/2 maps the sphere's Y-pole to ecliptic Z, then OBLIQUITY tilts it to match
 * Earth's J2000 pole direction. Must stay in sync with EarthMesh GROUP_TILT_X.
 */
export const EARTH_GROUP_TILT_X = Math.PI / 2 + EARTH_OBLIQUITY_RAD;

/**
 * Convert geographic coordinates (degrees) and GMST (radians) into scene world
 * space, applying the same two rotations used by EarthMesh:
 *   1. Earth Y-rotation (GMST) — sets the Greenwich meridian orientation.
 *   2. GROUP_TILT_X — tilts the pole to the J2000 ecliptic frame.
 *
 * Earth is assumed to be at scene origin [0, 0, 0]. Returns a point on the
 * sphere of the given radius in the same coordinate space as trajectory points.
 */
export function latLonToSceneWorld(
  latDeg: number,
  lonDeg: number,
  radius: number,
  gmst: number,
): [number, number, number] {
  const [lx, ly, lz] = latLonToSphereLocal(latDeg, lonDeg, radius);

  // Apply Earth Y rotation (GMST) — right-hand rule around +Y
  const rx = lx * Math.cos(gmst) + lz * Math.sin(gmst);
  const ry = ly;
  const rz = -lx * Math.sin(gmst) + lz * Math.cos(gmst);

  // Apply GROUP_TILT_X — right-hand rule around +X
  const tilt = EARTH_GROUP_TILT_X;
  const wx = rx;
  const wy = ry * Math.cos(tilt) - rz * Math.sin(tilt);
  const wz = ry * Math.sin(tilt) + rz * Math.cos(tilt);

  return [wx, wy, wz];
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
