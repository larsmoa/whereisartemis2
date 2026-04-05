"use client";

import React, { type ComponentRef, useLayoutEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { TOUCH } from "three";
import type {
  OrthographicCamera as OrthographicCameraType,
  PerspectiveCamera as PerspectiveCameraType,
} from "three";
import { EarthMesh } from "./EarthMesh";
import { MoonMesh } from "./MoonMesh";
import { ArtemisMesh } from "./ArtemisMesh";
import { TrajectoryLine } from "./TrajectoryLine";
import { FREE_ORBIT_INITIAL_OFFSET, getOrthographicEyeForView } from "@/lib/sceneCameraPresets";
import { toScenePosition } from "@/lib/sceneCoords";
import type { ArtemisData, ScenePoint, SceneView } from "@/types";

type OrbitControlsHandle = ComponentRef<typeof OrbitControls>;

interface SpaceSceneProps {
  view: SceneView;
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
    /* Beyond Earth–Moon span (~313 scene units) so stars sit in the background */
    const r = 520 + Math.random() * 280;
    arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    arr[i * 3 + 2] = r * Math.cos(phi);
  }
  return arr;
}

const STAR_POSITIONS = generateStarPositions(4000);

function PointStars({ perspective }: { perspective: boolean }): React.JSX.Element {
  const positions = STAR_POSITIONS;

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={perspective ? 2.5 : 1.2}
        sizeAttenuation={perspective}
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </points>
  );
}

interface SceneBodiesProps {
  view: SceneView;
  data: ArtemisData | null;
  trajectory: ScenePoint[] | null;
  moonTrajectory: ScenePoint[] | null;
  plannedTrajectory?: ScenePoint[] | null | undefined;
  plannedMoonTrajectory?: ScenePoint[] | null | undefined;
  moonPos: [number, number, number];
  artemisPos: [number, number, number];
  starsPerspective: boolean;
}

function SceneBodies({
  view,
  data,
  trajectory,
  moonTrajectory,
  plannedTrajectory,
  plannedMoonTrajectory,
  moonPos,
  artemisPos,
  starsPerspective,
}: SceneBodiesProps): React.JSX.Element {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[100, 50, 80]} intensity={1.8} />
      <PointStars perspective={starsPerspective} />
      <EarthMesh />
      <MoonMesh position={moonPos} view={view} />
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
          <ArtemisMesh position={artemisPos} view={view} />
        </React.Suspense>
      )}
    </>
  );
}

const ORTHO_TOUCHES = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN } as const;

/**
 * Orthographic map views: top (+Z) or side (+X). Pan and zoom only; no orbit rotation.
 */
function SceneContentsOrtho({
  mapView,
  data,
  trajectory,
  moonTrajectory,
  plannedTrajectory,
  plannedMoonTrajectory,
  moonPos,
  artemisPos,
  moonX,
  moonY,
  moonZ,
}: {
  mapView: "top" | "side";
  data: ArtemisData | null;
  trajectory: ScenePoint[] | null;
  moonTrajectory: ScenePoint[] | null;
  plannedTrajectory?: ScenePoint[] | null | undefined;
  plannedMoonTrajectory?: ScenePoint[] | null | undefined;
  moonPos: [number, number, number];
  artemisPos: [number, number, number];
  moonX: number;
  moonY: number;
  moonZ: number;
}): React.JSX.Element {
  const { camera } = useThree();
  const orbitRef = useRef<OrbitControlsHandle>(null);

  /* Three.js camera is mutable scene state; R3F does not wrap it in React state. */
  useLayoutEffect(() => {
    const ctrl = orbitRef.current;
    if (!ctrl) return;
    const cam = camera as OrthographicCameraType;
    const { position, up } = getOrthographicEyeForView(mapView);

    // Initial target centered between Earth and Moon
    const [mx, my, mz] = toScenePosition({ x: moonX, y: moonY, z: moonZ });

    cam.position.set(position[0], position[1], position[2]);
    cam.up.set(up[0], up[1], up[2]);
    cam.zoom = 1.15;
    cam.updateProjectionMatrix();

    ctrl.target.set(mx / 2, my / 2, mz / 2);
    ctrl.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset on view change
  }, [mapView, camera]);

  return (
    <>
      <SceneBodies
        view={mapView}
        data={data}
        trajectory={trajectory}
        moonTrajectory={moonTrajectory}
        plannedTrajectory={plannedTrajectory}
        plannedMoonTrajectory={plannedMoonTrajectory}
        moonPos={moonPos}
        artemisPos={artemisPos}
        starsPerspective={false}
      />
      <OrbitControls
        ref={orbitRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={false}
        mouseButtons={{ LEFT: 2, MIDDLE: 1, RIGHT: 2 }}
        touches={ORTHO_TOUCHES}
      />
    </>
  );
}

/**
 * Perspective orbit around the capsule; target follows live position (camera moves by same delta).
 */
function SceneContentsFree({
  data,
  trajectory,
  moonTrajectory,
  plannedTrajectory,
  plannedMoonTrajectory,
  moonPos,
  artemisPos,
  craftX,
  craftY,
  craftZ,
}: {
  data: ArtemisData | null;
  trajectory: ScenePoint[] | null;
  moonTrajectory: ScenePoint[] | null;
  plannedTrajectory?: ScenePoint[] | null | undefined;
  plannedMoonTrajectory?: ScenePoint[] | null | undefined;
  moonPos: [number, number, number];
  artemisPos: [number, number, number];
  craftX: number;
  craftY: number;
  craftZ: number;
}): React.JSX.Element {
  const { camera } = useThree();
  const orbitRef = useRef<OrbitControlsHandle>(null);
  const prevCraftSceneRef = useRef<[number, number, number] | null>(null);

  /* Three.js camera is mutable scene state; R3F does not wrap it in React state. */
  /* eslint-disable react-hooks/immutability -- follow capsule; keep user orbit offset */
  useLayoutEffect(() => {
    const ctrl = orbitRef.current;
    if (!ctrl) return;
    const cam = camera as PerspectiveCameraType;
    const [ax, ay, az] = toScenePosition({ x: craftX, y: craftY, z: craftZ });

    if (prevCraftSceneRef.current === null) {
      ctrl.target.set(ax, ay, az);
      cam.position.set(
        ax + FREE_ORBIT_INITIAL_OFFSET[0],
        ay + FREE_ORBIT_INITIAL_OFFSET[1],
        az + FREE_ORBIT_INITIAL_OFFSET[2],
      );
    } else {
      const [px, py, pz] = prevCraftSceneRef.current;
      const dx = ax - px;
      const dy = ay - py;
      const dz = az - pz;
      cam.position.x += dx;
      cam.position.y += dy;
      cam.position.z += dz;
      ctrl.target.set(ax, ay, az);
    }
    prevCraftSceneRef.current = [ax, ay, az];
    ctrl.update();
  }, [craftX, craftY, craftZ, camera]);
  /* eslint-enable react-hooks/immutability */

  return (
    <>
      <SceneBodies
        view="free"
        data={data}
        trajectory={trajectory}
        moonTrajectory={moonTrajectory}
        plannedTrajectory={plannedTrajectory}
        plannedMoonTrajectory={plannedMoonTrajectory}
        moonPos={moonPos}
        artemisPos={artemisPos}
        starsPerspective={true}
      />
      <OrbitControls
        ref={orbitRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        enableDamping={true}
        dampingFactor={0.08}
        minPolarAngle={0.08}
        maxPolarAngle={Math.PI - 0.08}
        mouseButtons={{ LEFT: 0, MIDDLE: 1, RIGHT: 2 }}
      />
    </>
  );
}

/**
 * J2000 ecliptic: X = vernal equinox, Y = 90° along ecliptic, Z = ecliptic north.
 * Top view: camera on +Z, up +X (map rotated 90° CCW vs north-up). Side view: camera on +X, up +Z (edge-on ecliptic).
 * Free view: perspective camera orbiting the capsule.
 */
export function SpaceScene({
  view,
  data,
  trajectory,
  moonTrajectory,
  plannedTrajectory,
  plannedMoonTrajectory,
  className,
}: SpaceSceneProps): React.JSX.Element {
  const moonX = data?.moon.position.x ?? 384_400;
  const moonY = data?.moon.position.y ?? 0;
  const moonZ = data?.moon.position.z ?? 0;
  const craftX = data?.spacecraft.position.x ?? 96_000;
  const craftY = data?.spacecraft.position.y ?? 0;
  const craftZ = data?.spacecraft.position.z ?? 0;

  const moonPos = toScenePosition({ x: moonX, y: moonY, z: moonZ });
  const artemisPos = toScenePosition({ x: craftX, y: craftY, z: craftZ });

  const canvasClassName = className ? `${className} touch-none` : "touch-none";

  if (view === "free") {
    return (
      <Canvas
        key="perspective"
        className={canvasClassName}
        camera={{
          fov: 52,
          position: [
            artemisPos[0] + FREE_ORBIT_INITIAL_OFFSET[0],
            artemisPos[1] + FREE_ORBIT_INITIAL_OFFSET[1],
            artemisPos[2] + FREE_ORBIT_INITIAL_OFFSET[2],
          ],
          up: [0, 1, 0],
          near: 0.0000001,
          far: 4000,
        }}
      >
        <SceneContentsFree
          data={data}
          trajectory={trajectory}
          moonTrajectory={moonTrajectory}
          plannedTrajectory={plannedTrajectory}
          plannedMoonTrajectory={plannedMoonTrajectory}
          moonPos={moonPos}
          artemisPos={artemisPos}
          craftX={craftX}
          craftY={craftY}
          craftZ={craftZ}
        />
      </Canvas>
    );
  }

  const mapView = view === "side" ? "side" : "top";
  const eye = getOrthographicEyeForView(mapView);

  return (
    <Canvas
      key="orthographic"
      className={canvasClassName}
      orthographic
      camera={{
        position: [...eye.position] as [number, number, number],
        up: [...eye.up] as [number, number, number],
        zoom: 1.15,
        near: 0.1,
        far: 2000,
      }}
    >
      <SceneContentsOrtho
        mapView={mapView}
        data={data}
        trajectory={trajectory}
        moonTrajectory={moonTrajectory}
        plannedTrajectory={plannedTrajectory}
        plannedMoonTrajectory={plannedMoonTrajectory}
        moonPos={moonPos}
        artemisPos={artemisPos}
        moonX={moonX}
        moonY={moonY}
        moonZ={moonZ}
      />
    </Canvas>
  );
}
