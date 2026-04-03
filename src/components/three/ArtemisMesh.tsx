"use client";

interface ArtemisMeshProps {
  position: [number, number, number];
}

/**
 * Artemis II spacecraft — white box.
 * Side length 0.14 ≈ half of Moon radius (0.273), intentionally oversized
 * relative to reality so it remains visible at all zoom levels.
 */
export function ArtemisMesh({ position }: ArtemisMeshProps): React.JSX.Element {
  return (
    <mesh position={position}>
      {/* ~half Moon radius: 1.09 / 2 ≈ 0.55 */}
      <boxGeometry args={[0.55, 0.55, 0.55]} />
      <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.6} />
    </mesh>
  );
}
