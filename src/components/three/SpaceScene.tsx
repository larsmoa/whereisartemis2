"use client";

import React, { type ComponentRef, useLayoutEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { TOUCH, Vector3 } from "three";
import type {
  OrthographicCamera as OrthographicCameraType,
  PerspectiveCamera as PerspectiveCameraType,
} from "three";
import { EarthMesh } from "./EarthMesh";
import { MoonMesh } from "./MoonMesh";
import { OrionSpacecraft } from "./OrionSpacecraft";
import { TrajectoryLine } from "./TrajectoryLine";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
  origin?: [number, number, number];
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
  origin = [0, 0, 0],
}: SceneBodiesProps): React.JSX.Element {
  const shiftedEarthPos = React.useMemo<[number, number, number]>(
    () => [-origin[0], -origin[1], -origin[2]],
    [origin],
  );

  const shiftedMoonPos = React.useMemo<[number, number, number]>(
    () => [moonPos[0] - origin[0], moonPos[1] - origin[1], moonPos[2] - origin[2]],
    [moonPos, origin],
  );

  const shiftedArtemisPos = React.useMemo<[number, number, number]>(
    () => [artemisPos[0] - origin[0], artemisPos[1] - origin[1], artemisPos[2] - origin[2]],
    [artemisPos, origin],
  );

  const shiftTrajectory = React.useCallback(
    (traj: ScenePoint[] | null | undefined) => {
      if (!traj) return traj;
      return traj.map(([x, y, z]) => [x - origin[0], y - origin[1], z - origin[2]] as ScenePoint);
    },
    [origin],
  );

  const shiftedMoonTrajectory = React.useMemo(
    () => shiftTrajectory(moonTrajectory),
    [moonTrajectory, shiftTrajectory],
  );
  const shiftedPlannedMoonTrajectory = React.useMemo(
    () => shiftTrajectory(plannedMoonTrajectory),
    [plannedMoonTrajectory, shiftTrajectory],
  );
  const shiftedTrajectory = React.useMemo(
    () => shiftTrajectory(trajectory),
    [trajectory, shiftTrajectory],
  );
  const shiftedPlannedTrajectory = React.useMemo(
    () => shiftTrajectory(plannedTrajectory),
    [plannedTrajectory, shiftTrajectory],
  );

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[100, 50, 80]} intensity={1.8} />
      <Environment files="/textures/starmap_2020_4k.exr" background={view === "free"} />
      {view !== "free" && <PointStars perspective={false} />}
      <EarthMesh position={shiftedEarthPos} />
      <MoonMesh position={shiftedMoonPos} view={view} />
      {shiftedMoonTrajectory && (
        <TrajectoryLine points={shiftedMoonTrajectory} color="#aaaaaa" opacity={0.4} />
      )}
      {shiftedPlannedMoonTrajectory && (
        <TrajectoryLine
          points={shiftedPlannedMoonTrajectory}
          color="#aaaaaa"
          opacity={0.2}
          dashed
        />
      )}
      {shiftedTrajectory && (
        <TrajectoryLine points={shiftedTrajectory} color="#4488ff" opacity={0.6} />
      )}
      {shiftedPlannedTrajectory && (
        <TrajectoryLine points={shiftedPlannedTrajectory} color="#4488ff" opacity={0.3} dashed />
      )}
      {data && (
        <React.Suspense fallback={null}>
          <OrionSpacecraft
            position={shiftedArtemisPos}
            velocity={data.spacecraft.velocity}
            view={view}
          />
        </React.Suspense>
      )}
    </>
  );
}

const ORTHO_TOUCHES = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN } as const;

/**
 * Orthographic map views: top (+Z) or side (-X). Pan and zoom only; no orbit rotation.
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
}: {
  data: ArtemisData | null;
  trajectory: ScenePoint[] | null;
  moonTrajectory: ScenePoint[] | null;
  plannedTrajectory?: ScenePoint[] | null | undefined;
  plannedMoonTrajectory?: ScenePoint[] | null | undefined;
  moonPos: [number, number, number];
  artemisPos: [number, number, number];
}): React.JSX.Element {
  const { camera } = useThree();
  const orbitRef = useRef<OrbitControlsHandle>(null);
  const prevCraftSceneRef = useRef<[number, number, number] | null>(null);

  // Floating origin state to prevent vertex shader precision loss (jitter)
  const [origin, setOrigin] = React.useState<[number, number, number]>(artemisPos);

  // Update origin if spacecraft moves too far from it
  React.useEffect(() => {
    const dx = artemisPos[0] - origin[0];
    const dy = artemisPos[1] - origin[1];
    const dz = artemisPos[2] - origin[2];
    const distSq = dx * dx + dy * dy + dz * dz;

    // 10 units squared = 100
    if (distSq > 100) {
      setOrigin(artemisPos);
    }
  }, [artemisPos, origin]);

  const shiftedArtemisPos = React.useMemo<[number, number, number]>(
    () => [artemisPos[0] - origin[0], artemisPos[1] - origin[1], artemisPos[2] - origin[2]],
    [artemisPos, origin],
  );

  /* Three.js camera is mutable scene state; R3F does not wrap it in React state. */
  /* eslint-disable react-hooks/immutability -- follow capsule; keep user orbit offset */
  useLayoutEffect(() => {
    const ctrl = orbitRef.current;
    if (!ctrl) return;
    const cam = camera as PerspectiveCameraType;

    // Calculate and set the camera's up vector to match the capsule's local up
    if (data?.spacecraft.velocity) {
      const vel = data.spacecraft.velocity;
      const velocityVector = new Vector3(vel.x, vel.y, vel.z).normalize();
      if (velocityVector.lengthSq() > 0) {
        const globalUp = new Vector3(0, 0, 1);
        // The capsule's local right vector
        const right = new Vector3().crossVectors(globalUp, velocityVector).normalize();
        // The capsule's local up vector
        const localUp = new Vector3().crossVectors(velocityVector, right).normalize();
        cam.up.copy(localUp);
      } else {
        cam.up.set(0, 0, 1);
      }
    } else {
      cam.up.set(0, 0, 1);
    }

    const [ax, ay, az] = shiftedArtemisPos;

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
  }, [shiftedArtemisPos, camera, data?.spacecraft.velocity]);
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
        origin={origin}
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
 * Top view: camera on +Z, up +X (map rotated 90° CCW vs north-up). Side view: camera on -X, up +Z (edge-on ecliptic).
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
      <ErrorBoundary>
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
            up: [0, 0, 1],
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
          />
        </Canvas>
      </ErrorBoundary>
    );
  }

  const mapView = view === "side" ? "side" : "top";
  const eye = getOrthographicEyeForView(mapView);

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
