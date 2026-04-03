"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import type { Mesh } from "three";

/**
 * Earth — realistic sphere at the scene origin with textures and clouds.
 * Radius 1.0 is the reference unit; all other bodies scale from this.
 */
export function EarthMesh(): React.JSX.Element {
  const earthRef = useRef<Mesh>(null);
  const cloudsRef = useRef<Mesh>(null);

  const [colorMap, normalMap, specularMap, cloudsMap] = useTexture([
    "/textures/earth/earth_atmos_2048.jpg",
    "/textures/earth/earth_normal_2048.jpg",
    "/textures/earth/earth_specular_2048.jpg",
    "/textures/earth/earth_clouds_1024.png",
  ]);

  useFrame((_, delta) => {
    if (earthRef.current) earthRef.current.rotation.y += delta * 0.05;
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.07;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Earth Sphere */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[4.0, 64, 64]} />
        <meshStandardMaterial
          map={colorMap}
          normalMap={normalMap}
          roughnessMap={specularMap}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Cloud Layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[4.05, 64, 64]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent={true}
          opacity={0.8}
          blending={2} // Additive blending for clouds
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
