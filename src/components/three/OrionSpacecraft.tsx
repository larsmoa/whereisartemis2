"use client";

import * as THREE from "three";
import React, { useMemo } from "react";
import { useGLTF, Environment } from "@react-three/drei";
import type { GLTF } from "three-stdlib";
import type { SceneView } from "@/types";
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
  view?: SceneView;
};

export function OrionSpacecraft({
  position,
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

  return (
    <group position={position} scale={finalScale} {...props} dispose={null}>
      <Environment preset="city" />
      <mesh geometry={nodes.model_0Mesh_group1.geometry} material={materials.blinn1SG} />
      <mesh geometry={nodes.group1_model_1Mesh.geometry} material={materials.blinn2SG} />
    </group>
  );
}

useGLTF.preload("/models/orion/Orion_Spacecraft.glb");
