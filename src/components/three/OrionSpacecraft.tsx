"use client";

import * as THREE from "three";
import React, { useMemo } from "react";
import { useGLTF, Environment } from "@react-three/drei";
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
};

export function OrionSpacecraft({
  position,
  velocity,
  view,
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

  // Apply the same scaling logic as the old ArtemisMesh
  const realisticScale = (0.005 / 6378.137) * EARTH_SCENE_RADIUS;
  const fixedScale = view === "free" ? realisticScale : 0.226 * 4;
  const finalScale = fixedScale * normalizationFactor;

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

    // The GLTF model's forward axis is likely offset by 90 degrees (e.g. +X instead of +Z).
    // Apply a 90-degree rotation around the local Y-axis to align the nose with the velocity vector.
    dummy.rotateY(-Math.PI / 2);

    return dummy.rotation;
  }, [velocity]);

  return (
    <group position={position} rotation={rotation} scale={finalScale} {...props} dispose={null}>
      <Environment preset="city" />
      <mesh geometry={nodes.model_0Mesh_group1.geometry} material={materials.blinn1SG} />
      <mesh geometry={nodes.group1_model_1Mesh.geometry} material={materials.blinn2SG} />
    </group>
  );
}

useGLTF.preload("/models/orion/Orion_Spacecraft.glb");
