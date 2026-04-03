"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EarthMesh } from "./EarthMesh";
import { MoonMesh } from "./MoonMesh";
import { ArtemisMesh } from "./ArtemisMesh";
import { toScenePosition } from "@/lib/sceneCoords";
import type { ArtemisData } from "@/types";

interface SpaceSceneProps {
  data: ArtemisData | null;
  className?: string;
}

/** Generated once at module load — stable across re-renders, avoids purity rule */
function generateStarPositions(count: number): Float32Array {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 300 + Math.random() * 100;
    arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    arr[i * 3 + 2] = r * Math.cos(phi);
  }
  return arr;
}

const STAR_POSITIONS = generateStarPositions(4000);

/** Simple point-based star field — no useFrame, compatible with R3F alpha */
function PointStars(): React.JSX.Element {
  const positions = STAR_POSITIONS;

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.4}
        sizeAttenuation
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </points>
  );
}

/**
 * Lights, camera (top-down), action.
 * Extracted into its own component so it only renders inside the Canvas context.
 */
function SceneContents({ data }: { data: ArtemisData | null }): React.JSX.Element {
  const moonPos = data
    ? toScenePosition(data.moon.position)
    : ([30, 0, 0] as [number, number, number]);

  const artemisPos = data
    ? toScenePosition(data.spacecraft.position)
    : ([5, 0, 0] as [number, number, number]);

  return (
    <>
      {/* Ambient fill so dark side of spheres isn't pitch black */}
      <ambientLight intensity={0.25} />
      {/* Sun-like directional light from a distance */}
      <directionalLight position={[100, 50, 80]} intensity={1.8} />
      <PointStars />
      <EarthMesh />
      <MoonMesh position={moonPos} />
      {data && <ArtemisMesh position={artemisPos} />}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={150}
      />
    </>
  );
}

/**
 * Full 3D scene canvas.
 * Camera starts top-down (looking along -Y) so the orbital plane is
 * immediately visible. OrbitControls lets the user tilt/zoom freely.
 */
export function SpaceScene({ data, className }: SpaceSceneProps): React.JSX.Element {
  return (
    <Canvas
      className={className}
      camera={{
        position: [0, 55, 0],
        up: [0, 0, -1],
        fov: 60,
        near: 0.1,
        far: 600,
      }}
    >
      <SceneContents data={data} />
    </Canvas>
  );
}
