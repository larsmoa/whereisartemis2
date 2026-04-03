"use client";

interface MoonMeshProps {
  position: [number, number, number];
}

/**
 * Moon — gray sphere.
 * Radius 0.273 matches the real Moon/Earth radius ratio (1737 km / 6378 km ≈ 0.273).
 */
export function MoonMesh({ position }: MoonMeshProps): React.JSX.Element {
  return (
    <mesh position={position}>
      {/* Radius 1.09 keeps the real Moon/Earth ratio: 4.0 * 0.273 ≈ 1.09 */}
      <sphereGeometry args={[1.09, 32, 32]} />
      <meshStandardMaterial color="#888888" roughness={0.9} metalness={0.0} />
    </mesh>
  );
}
