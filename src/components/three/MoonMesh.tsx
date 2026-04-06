"use client";

import { useTexture } from "@react-three/drei";
import { EARTH_SCENE_RADIUS } from "@/lib/sceneCoords";
import type { SceneView } from "@/types";

interface MoonMeshProps {
  position: [number, number, number];
  view?: SceneView;
}

/**
 * Moon disc — still exaggerated vs the real ~0.27 Earth radii so it reads at
 * ~300 scene units, but capped below Earth: Earth diameter = 2× Moon diameter.
 */
const MOON_RADIUS_SCENE = EARTH_SCENE_RADIUS / 2;

/**
 * Moon — textured sphere.
 */
export function MoonMesh({ position, view }: MoonMeshProps): React.JSX.Element {
  const moonTexture = useTexture("/textures/moon.jpg");

  // Realistic moon radius = 1737.4 / 6378.137 * EARTH_SCENE_RADIUS
  const realisticRadius = (1737.4 / 6378.137) * EARTH_SCENE_RADIUS;
  const radius = view === "free" ? realisticRadius : MOON_RADIUS_SCENE;

  return (
    <mesh position={position} renderOrder={0}>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshStandardMaterial
        map={moonTexture}
        bumpMap={moonTexture}
        bumpScale={0.02}
        roughness={0.9}
        metalness={0.0}
        envMapIntensity={0}
        polygonOffset
        polygonOffsetFactor={-5}
        polygonOffsetUnits={-5}
      />
    </mesh>
  );
}
