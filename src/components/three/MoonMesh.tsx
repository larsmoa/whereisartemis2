"use client";

import { useTexture } from "@react-three/drei";
import { EARTH_SCENE_RADIUS } from "@/lib/sceneCoords";

interface MoonMeshProps {
  position: [number, number, number];
}

/**
 * Moon disc — still exaggerated vs the real ~0.27 Earth radii so it reads at
 * ~300 scene units, but capped below Earth: Earth diameter = 2× Moon diameter.
 */
const MOON_RADIUS_SCENE = EARTH_SCENE_RADIUS / 2;

/**
 * Moon — textured sphere.
 */
export function MoonMesh({ position }: MoonMeshProps): React.JSX.Element {
  const moonTexture = useTexture("/textures/moon.jpg");

  const radius = MOON_RADIUS_SCENE;

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
