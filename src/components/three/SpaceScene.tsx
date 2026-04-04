"use client";

import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EarthMesh } from "./EarthMesh";
import { MoonMesh } from "./MoonMesh";
import { ArtemisMesh } from "./ArtemisMesh";
import { TrajectoryLine } from "./TrajectoryLine";
import { toScenePosition } from "@/lib/sceneCoords";
import type { ArtemisData, ScenePoint } from "@/types";

interface SpaceSceneProps {
  data: ArtemisData | null;
  trajectory: ScenePoint[] | null;
  moonTrajectory: ScenePoint[] | null;
  plannedTrajectory?: ScenePoint[] | null | undefined;
  plannedMoonTrajectory?: ScenePoint[] | null | undefined;
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

/** Simple point-based star field — sizeAttenuation disabled for orthographic camera */
function PointStars(): React.JSX.Element {
  const positions = STAR_POSITIONS;

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={1.2}
        sizeAttenuation={false}
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </points>
  );
}

/**
 * Lights, camera (top-down), action.
 * Extracted into its own component so it only renders inside the Canvas context.
 */
function SceneContents({
  data,
  trajectory,
  moonTrajectory,
  plannedTrajectory,
  plannedMoonTrajectory,
}: {
  data: ArtemisData | null;
  trajectory: ScenePoint[] | null;
  moonTrajectory: ScenePoint[] | null;
  plannedTrajectory?: ScenePoint[] | null | undefined;
  plannedMoonTrajectory?: ScenePoint[] | null | undefined;
}): React.JSX.Element {
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
      {moonTrajectory && <TrajectoryLine points={moonTrajectory} color="#aaaaaa" opacity={0.4} />}
      {plannedMoonTrajectory && (
        <TrajectoryLine points={plannedMoonTrajectory} color="#aaaaaa" opacity={0.2} dashed />
      )}
      {trajectory && <TrajectoryLine points={trajectory} color="#4488ff" opacity={0.6} />}
      {plannedTrajectory && (
        <TrajectoryLine points={plannedTrajectory} color="#4488ff" opacity={0.3} dashed />
      )}
      {data && (
        <React.Suspense fallback={null}>
          <ArtemisMesh position={artemisPos} />
        </React.Suspense>
      )}
      {/*
       * Lock polar angle to π/2 so the camera stays exactly top-down.
       * This allows panning (drag) and zooming (scroll) but not vertical tilt.
       * enableRotate={false} would disable all rotation — instead we allow
       * azimuth rotation (spin around Y axis) while clamping polar to 90°.
       */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={false}
        mouseButtons={{ LEFT: 2, MIDDLE: 1, RIGHT: 2 }}
      />
    </>
  );
}

/**
 * Orthographic canvas looking straight down the ecliptic Z axis.
 *
 * J2000 ecliptic: X = vernal equinox, Y = 90° along ecliptic, Z = ecliptic north.
 * Artemis moves in the XY (ecliptic) plane, so placing the camera at +Z and
 * pointing it toward the origin gives a true top-down view of the orbital plane.
 * "up" is +Y so north is up on screen.
 */
export function SpaceScene({
  data,
  trajectory,
  moonTrajectory,
  plannedTrajectory,
  plannedMoonTrajectory,
  className,
}: SpaceSceneProps): React.JSX.Element {
  return (
    <Canvas
      className={className}
      orthographic
      camera={{
        position: [0, 0, 100],
        up: [0, 1, 0],
        zoom: 10,
        near: 0.1,
        far: 1000,
      }}
    >
      <SceneContents
        data={data}
        trajectory={trajectory}
        moonTrajectory={moonTrajectory}
        plannedTrajectory={plannedTrajectory}
        plannedMoonTrajectory={plannedMoonTrajectory}
      />
    </Canvas>
  );
}
