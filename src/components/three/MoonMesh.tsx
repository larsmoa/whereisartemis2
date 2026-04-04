"use client";

import { useTexture } from "@react-three/drei";

interface MoonMeshProps {
  position: [number, number, number];
}

/** WGS84 Earth radius (km) — matches `@/lib/horizons` / `sceneCoords`. */
const EARTH_RADIUS_KM = 6378.137;
/** Moon mean radius (km) — matches `@/lib/horizons`. */
const MOON_RADIUS_KM = 1737.4;

/** Real Moon/Earth radius ratio in scene units — keep in sync with `EarthMesh` radius 5.2. */
const MOON_RADIUS_SCENE = 5.2 * (MOON_RADIUS_KM / EARTH_RADIUS_KM);

/**
 * With linear ephemeris scaling, the Moon sits ~300+ units away; a physically
 * correct radius (~1.4) is sub-pixel. Exaggerate for visibility (orbit lines
 * stay accurate — only the mesh grows).
 */
const MOON_VISUAL_EXAGGERATION = 5;

/**
 * Moon — textured sphere.
 */
export function MoonMesh({ position }: MoonMeshProps): React.JSX.Element {
  const moonTexture = useTexture("/textures/moon.jpg");

  const radius = MOON_RADIUS_SCENE * MOON_VISUAL_EXAGGERATION;

  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshStandardMaterial
        map={moonTexture}
        bumpMap={moonTexture}
        bumpScale={0.02}
        roughness={0.9}
        metalness={0.0}
      />
    </mesh>
  );
}
