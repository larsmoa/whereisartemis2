/**
 * Orthographic camera eye position and up vector for map-style views.
 * Distance matches the historical SpaceScene default (camera at ±100).
 */
const ORTHO_CAMERA_DISTANCE = 100;

export type OrthographicMapView = "top" | "side";

export interface OrthographicEyePreset {
  position: [number, number, number];
  up: [number, number, number];
}

/**
 * Top: +Z eye; up is −X so the map is rotated 90° CCW vs ecliptic north (+Y) up.
 * Side: +X eye, ecliptic north (+Z) up — Earth–Moon line edge-on.
 */
export function getOrthographicEyeForView(view: OrthographicMapView): OrthographicEyePreset {
  if (view === "top") {
    return {
      position: [0, 0, ORTHO_CAMERA_DISTANCE],
      up: [-1, 0, 0],
    };
  }
  return {
    position: [ORTHO_CAMERA_DISTANCE, 0, 0],
    up: [0, 0, 1],
  };
}

/** Initial offset from capsule (scene units) for the first frame of free orbit mode */
export const FREE_ORBIT_INITIAL_OFFSET: [number, number, number] = [25, 20, 25];
