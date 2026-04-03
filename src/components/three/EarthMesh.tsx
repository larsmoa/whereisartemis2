"use client";

/**
 * Earth — blue sphere at the scene origin.
 * Radius 1.0 is the reference unit; all other bodies scale from this.
 */
export function EarthMesh(): React.JSX.Element {
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[4.0, 64, 64]} />
      <meshStandardMaterial color="#1a6cf5" roughness={0.7} metalness={0.1} />
    </mesh>
  );
}
