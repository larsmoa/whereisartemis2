"use client";

import React, { useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";
import type { SceneView } from "@/types";
import { EARTH_SCENE_RADIUS } from "@/lib/sceneCoords";

interface ArtemisMeshProps {
  position: [number, number, number];
  view?: SceneView;
}

/**
 * Artemis II spacecraft — loaded from an STL model.
 */
export function ArtemisMesh({ position, view }: ArtemisMeshProps): React.JSX.Element {
  const geometry = useLoader(STLLoader, "/artemis.stl");

  // Center the geometry and apply fake textures via vertex colors
  useMemo(() => {
    geometry.computeBoundingBox();
    geometry.center();
    geometry.computeBoundingBox(); // Recompute after centering

    const posAttr = geometry.attributes.position;
    if (posAttr && geometry.boundingBox) {
      const colors = new Float32Array(posAttr.count * 3);
      const colorObj = new THREE.Color();

      const minY = geometry.boundingBox.min.y;
      const height = geometry.boundingBox.max.y - minY;

      for (let i = 0; i < posAttr.count; i++) {
        const y = posAttr.getY(i);
        const normalizedY = (y - minY) / height;

        // The Orion capsule has a dark heat shield at the bottom.
        // We color the bottom 20% dark gray, and the rest metallic silver.
        if (normalizedY < 0.2) {
          colorObj.setHex(0x222222); // Dark heat shield
        } else {
          colorObj.setHex(0xdddddd); // Silver/white crew module
        }

        colors[i * 3] = colorObj.r;
        colors[i * 3 + 1] = colorObj.g;
        colors[i * 3 + 2] = colorObj.b;
      }

      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    }
  }, [geometry]);

  // The STL bounding box is roughly 16x10x16 units. Base scale ≈0.226 for ~3.7
  // scene units near Earth; multiply so the craft stays visible at lunar distance.
  // The Orion capsule is about 5 meters (0.005 km) in diameter.
  // In scene units: (0.005 / 6378.137) * EARTH_SCENE_RADIUS = 0.00000407
  const realisticScale = (0.005 / 6378.137) * EARTH_SCENE_RADIUS;
  const fixedScale = view === "free" ? realisticScale : 0.226 * 4;

  return (
    <group position={position}>
      {/* 
        Add an environment map specifically for the spacecraft.
        This provides a reflection map so the metalness actually looks metallic
        instead of just dark/flat.
      */}
      <Environment preset="city" />
      <mesh geometry={geometry} scale={fixedScale}>
        <meshStandardMaterial vertexColors={true} roughness={0.15} metalness={1.0} />
      </mesh>
    </group>
  );
}

useLoader.preload(STLLoader, "/artemis.stl");
