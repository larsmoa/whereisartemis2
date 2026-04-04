"use client";

import { useTexture } from "@react-three/drei";

interface MoonMeshProps {
  position: [number, number, number];
}

/**
 * Moon — textured sphere.
 * Radius 0.273 matches the real Moon/Earth radius ratio (1737 km / 6378 km ≈ 0.273).
 */
export function MoonMesh({ position }: MoonMeshProps): React.JSX.Element {
  const moonTexture = useTexture("/textures/moon.jpg");

  return (
    <mesh position={position}>
      {/* Radius 1.42 keeps the real Moon/Earth ratio: 5.2 * 0.273 ≈ 1.42 */}
      <sphereGeometry args={[1.42, 64, 64]} />
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
