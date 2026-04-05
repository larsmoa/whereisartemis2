"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import type { Mesh } from "three";
import { EARTH_SCENE_RADIUS } from "@/lib/sceneCoords";

/**
 * Earth — realistic sphere at the scene origin with textures and clouds.
 * `EARTH_SCENE_RADIUS` is the reference for trajectory scaling and Moon size.
 */
export function EarthMesh({
  position = [0, 0, 0],
}: { position?: [number, number, number] } = {}): React.JSX.Element {
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
    <group position={position}>
      {/* Earth Sphere */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[EARTH_SCENE_RADIUS, 64, 64]} />
        <meshStandardMaterial
          map={colorMap ?? null}
          normalMap={normalMap ?? null}
          roughnessMap={specularMap ?? null}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Cloud Layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[EARTH_SCENE_RADIUS + 0.065, 64, 64]} />
        <meshStandardMaterial
          map={cloudsMap ?? null}
          transparent={true}
          opacity={0.8}
          blending={2} // Additive blending for clouds
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
