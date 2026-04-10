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
 * Top: +Z eye; up is +X so the map is rotated 90° CCW vs ecliptic north (+Y) up.
 * Side: -X eye, ecliptic north (+Z) up — Earth–Moon line edge-on, rotated 180° so capsule flies left to right.
 */
export function getOrthographicEyeForView(view: OrthographicMapView): OrthographicEyePreset {
  if (view === "top") {
    return {
      position: [0, 0, ORTHO_CAMERA_DISTANCE],
      up: [1, 0, 0],
    };
  }
  return {
    position: [-ORTHO_CAMERA_DISTANCE, 0, 0],
    up: [0, 0, 1],
  };
}

/** Initial offset from capsule (scene units) for the first frame of free orbit mode */
export const FREE_ORBIT_INITIAL_OFFSET: [number, number, number] = [0.00008, 0.00008, 0.00008];

/**
 * Compute the initial camera offset for free orbit mode so Earth appears
 * prominently in front of the capsule from the camera's perspective.
 *
 * Places the camera on the moon side of the capsule (between capsule and moon)
 * with a lateral offset in the ecliptic plane. The camera looks at the capsule
 * via OrbitControls, with Earth visible as the large body beyond it. Using the
 * ecliptic-plane "right" direction (cross(eclipticNorth, moonDir)) keeps the
 * camera at the same ecliptic latitude as the capsule, giving clear visual
 * separation between the capsule and Earth.
 *
 * Falls back to FREE_ORBIT_INITIAL_OFFSET when moon and capsule are coincident.
 */
export function computeFreeOrbitInitialOffset(
  artemisScenePos: [number, number, number],
  moonScenePos: [number, number, number],
): [number, number, number] {
  const BACK_DISTANCE = 0.0003;
  const LATERAL_DEG = 15;
  const LATERAL_BIAS = BACK_DISTANCE * Math.tan((LATERAL_DEG * Math.PI) / 180);

  const dx = moonScenePos[0] - artemisScenePos[0];
  const dy = moonScenePos[1] - artemisScenePos[1];
  const dz = moonScenePos[2] - artemisScenePos[2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (dist === 0) return FREE_ORBIT_INITIAL_OFFSET;

  const mdx = dx / dist;
  const mdy = dy / dist;
  const mdz = dz / dist;

  // right = cross(eclipticNorth=(0,0,1), moonDir) — lateral direction in the ecliptic plane
  let rx = -mdy;
  let ry = mdx;
  let rz = 0;
  const rLen = Math.sqrt(rx * rx + ry * ry + rz * rz);
  if (rLen < 0.001) {
    // moon nearly along ecliptic north — use +Y as fallback
    rx = 0;
    ry = 1;
    rz = 0;
  } else {
    rx /= rLen;
    ry /= rLen;
    rz /= rLen;
  }

  // Offset camera toward the moon and laterally to one side so Earth appears
  // prominently beyond the capsule when looking at it from the moon side.
  return [
    mdx * BACK_DISTANCE - rx * LATERAL_BIAS,
    mdy * BACK_DISTANCE - ry * LATERAL_BIAS,
    mdz * BACK_DISTANCE - rz * LATERAL_BIAS,
  ];
}
