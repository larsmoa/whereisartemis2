"use client";

import * as THREE from "three";
import React, { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending } from "three";
import type { GLTF } from "three-stdlib";
import type { SceneView, Vec3 } from "@/types";
import { EARTH_SCENE_RADIUS } from "@/lib/sceneCoords";

type GLTFResult = GLTF & {
  nodes: {
    model_0Mesh_group1: THREE.Mesh;
    group1_model_1Mesh: THREE.Mesh;
  };
  materials: {
    blinn1SG: THREE.MeshStandardMaterial;
    blinn2SG: THREE.MeshStandardMaterial;
  };
};

type OrionSpacecraftProps = React.JSX.IntrinsicElements["group"] & {
  position: [number, number, number];
  velocity?: Vec3;
  view?: SceneView;
  /** When false, the service module mesh is hidden (post CM/SM separation) */
  showServiceModule?: boolean;
  /** When true, renders a pulsing plasma glow around the capsule (re-entry) */
  reentryGlow?: boolean;
};

export function OrionSpacecraft({
  position,
  velocity,
  view,
  showServiceModule = true,
  reentryGlow = false,
  ...props
}: OrionSpacecraftProps): React.JSX.Element {
  const { nodes, materials } = useGLTF(
    "/models/orion/Orion_Spacecraft.glb",
  ) as unknown as GLTFResult;

  // Calculate normalization factor based on the capsule mesh
  // The old artemis.stl had a width of ~16 units.
  const capsuleBox = useMemo(
    () => new THREE.Box3().setFromObject(nodes.model_0Mesh_group1),
    [nodes.model_0Mesh_group1],
  );
  const capsuleWidth = capsuleBox.max.x - capsuleBox.min.x;
  const normalizationFactor = 16 / capsuleWidth;

  const fixedScale = view === "free" ? EARTH_SCENE_RADIUS * 0.0125 : 0.226 * 0.5;
  const finalScale = fixedScale * normalizationFactor;

  // Clone GLTF materials so we can override envMapIntensity without mutating the shared asset
  const mat1 = useMemo(() => {
    const m = materials.blinn1SG.clone();
    m.envMapIntensity = 0;
    return m;
  }, [materials.blinn1SG]);

  const mat2 = useMemo(() => {
    const m = materials.blinn2SG.clone();
    m.envMapIntensity = 0;
    return m;
  }, [materials.blinn2SG]);

  useEffect(() => {
    return (): void => {
      mat1.dispose();
      mat2.dispose();
    };
  }, [mat1, mat2]);

  /** Sphere radius (GLTF local space) that fully encloses the capsule */
  const glowRadius = useMemo(() => {
    const size = new THREE.Vector3();
    capsuleBox.getSize(size);
    return Math.max(size.x, size.y, size.z) * 0.65;
  }, [capsuleBox]);

  const innerGlowRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!reentryGlow) return;
    const t = clock.elapsedTime;
    if (innerGlowRef.current) {
      const mat = innerGlowRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.07 + 0.03 * Math.sin(t * 11.3) * Math.sin(t * 7.1);
    }
    if (outerGlowRef.current) {
      const mat = outerGlowRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.03 + 0.01 * Math.sin(t * 3.7);
    }
  });

  // Calculate rotation based on velocity
  const rotation = useMemo(() => {
    if (!velocity || (velocity.x === 0 && velocity.y === 0 && velocity.z === 0)) {
      return new THREE.Euler();
    }

    const target = new THREE.Vector3(velocity.x, velocity.y, velocity.z).normalize();
    const up = new THREE.Vector3(0, 0, 1); // Ecliptic north

    const dummy = new THREE.Object3D();
    dummy.up.copy(up);
    dummy.lookAt(target);

    // Align the model's nose axis (+X) with the velocity vector.
    // During re-entry the capsule flies heat-shield-first (aft into the wind),
    // so add an extra 180° flip so the blunt end faces the direction of travel.
    dummy.rotateY(reentryGlow ? Math.PI / 2 : -Math.PI / 2);

    return dummy.rotation;
  }, [velocity, reentryGlow]);

  return (
    <group position={position} rotation={rotation} scale={finalScale} {...props} dispose={null}>
      <mesh geometry={nodes.model_0Mesh_group1.geometry} material={mat1} />
      {showServiceModule && <mesh geometry={nodes.group1_model_1Mesh.geometry} material={mat2} />}
      {reentryGlow && (
        <>
          {/* Inner plasma layer — orange, fast flicker */}
          <mesh ref={innerGlowRef}>
            <sphereGeometry args={[glowRadius, 32, 32]} />
            <meshStandardMaterial
              color="#ff5500"
              emissive="#ff2200"
              emissiveIntensity={0.2}
              transparent
              opacity={0.07}
              blending={AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Outer sheath — wider, dim, slower pulse */}
          <mesh ref={outerGlowRef}>
            <sphereGeometry args={[glowRadius * 1.6, 32, 32]} />
            <meshStandardMaterial
              color="#ff2200"
              transparent
              opacity={0.03}
              blending={AdditiveBlending}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

useGLTF.preload("/models/orion/Orion_Spacecraft.glb");
