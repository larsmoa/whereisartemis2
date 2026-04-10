"use client";

import React, { type ComponentRef, useLayoutEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, useKTX2 } from "@react-three/drei";
import { TOUCH, Vector3, EquirectangularReflectionMapping } from "three";
import type {
  OrthographicCamera as OrthographicCameraType,
  PerspectiveCamera as PerspectiveCameraType,
} from "three";
import { EarthMesh } from "./EarthMesh";
import { MoonMesh } from "./MoonMesh";
import { OrionSpacecraft } from "./OrionSpacecraft";
import { TrajectoryLine } from "./TrajectoryLine";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { computeFreeOrbitInitialOffset, getOrthographicEyeForView } from "@/lib/sceneCameraPresets";
import { toScenePosition, EARTH_SCENE_RADIUS } from "@/lib/sceneCoords";
import { greenwichMeanSiderealTime } from "@/lib/earthRotation";
import type { MissionPhase } from "@/lib/mission-phase";
import type { ArtemisData, ScenePoint, SceneView } from "@/types";

const ORTHO_ZOOM_MOBILE = 1.15;
const ORTHO_ZOOM_DESKTOP = ORTHO_ZOOM_MOBILE * 2.7;

type OrbitControlsHandle = ComponentRef<typeof OrbitControls>;

interface SpaceSceneProps {
  view: SceneView;
  data: ArtemisData | null;
  trajectory: ScenePoint[] | null;
  moonTrajectory: ScenePoint[] | null;
  plannedTrajectory?: ScenePoint[] | null | undefined;
  plannedMoonTrajectory?: ScenePoint[] | null | undefined;
  className?: string;
  missionPhase?: MissionPhase | undefined;
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

/**
 * Draws the re-entry descent arc from the last planned trajectory point down to
 * Earth's surface in the same radial direction.
 */
function ReentryArc({
  lastPoint,
  origin = [0, 0, 0],
}: {
  lastPoint: ScenePoint;
  origin?: [number, number, number];
}): React.JSX.Element | null {
  const arcPoints = React.useMemo<ScenePoint[]>(() => {
    const [lx, ly, lz] = lastPoint;
    const [ox, oy, oz] = origin;

    // Shift into scene-local coordinates
    const px = lx - ox;
    const py = ly - oy;
    const pz = lz - oz;

    const dist = Math.sqrt(px * px + py * py + pz * pz);
    if (dist < EARTH_SCENE_RADIUS) return [];

    // Unit vector pointing from Earth centre toward the last known position
    const ux = px / dist;
    const uy = py / dist;
    const uz = pz / dist;

    // Earth surface endpoint in the same radial direction
    const surfX = ux * EARTH_SCENE_RADIUS;
    const surfY = uy * EARTH_SCENE_RADIUS;
    const surfZ = uz * EARTH_SCENE_RADIUS;

    // Midpoint — pulled slightly inward and offset perpendicular for a curved arc
    const midR = (dist + EARTH_SCENE_RADIUS) * 0.5 * 0.95;
    const midX = ux * midR;
    const midY = uy * midR;
    const midZ = uz * midR;

    return [
      [px, py, pz],
      [midX, midY, midZ],
      [surfX, surfY, surfZ],
    ];
  }, [lastPoint, origin]);

  if (arcPoints.length < 2) return null;

  return <TrajectoryLine points={arcPoints} color="#ff8040" opacity={0.7} lineWidth={2} />;
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
  /** Normalised Sun direction in scene space, scaled to a far-field distance */
  sunLightPos: [number, number, number];
  /** GMST in radians — sets the real-world rotational orientation of the Earth */
  earthRotationAngle: number | undefined;
  origin?: [number, number, number];
  missionPhase?: MissionPhase | undefined;
}

function StarmapEnvironment({ view }: { view: SceneView }): React.JSX.Element | null {
  const starmap = useKTX2("/textures/starmap_2020_4k_uastc.ktx2");

  /* eslint-disable react-hooks/immutability -- Three.js textures are mutable */
  useLayoutEffect(() => {
    if (starmap && !Array.isArray(starmap)) {
      starmap.mapping = EquirectangularReflectionMapping;
    }
  }, [starmap]);
  /* eslint-enable react-hooks/immutability */

  if (!starmap || Array.isArray(starmap)) return null;
  return <Environment map={starmap} background={view === "free"} />;
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
  sunLightPos,
  earthRotationAngle,
  origin = [0, 0, 0],
  missionPhase,
}: SceneBodiesProps): React.JSX.Element {
  const isReentry =
    missionPhase === "REENTRY" ||
    missionPhase === "SPLASHDOWN_MOMENT" ||
    missionPhase === "COMPLETE";
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

  const lastPlannedPoint = React.useMemo<ScenePoint | null>(() => {
    const src = shiftedPlannedTrajectory ?? shiftedTrajectory;
    if (!src || src.length === 0) return null;
    return src[src.length - 1] ?? null;
  }, [shiftedPlannedTrajectory, shiftedTrajectory]);

  return (
    <>
      <ambientLight intensity={0.12} />
      <directionalLight position={sunLightPos} intensity={2.2} />
      <React.Suspense fallback={null}>
        <StarmapEnvironment view={view} />
      </React.Suspense>
      {view !== "free" && <PointStars perspective={false} />}
      <EarthMesh
        position={shiftedEarthPos}
        reentryGlow={isReentry}
        rotationAngle={earthRotationAngle}
      />
      <MoonMesh position={shiftedMoonPos} view={view} />
      {shiftedMoonTrajectory && (
        <TrajectoryLine points={shiftedMoonTrajectory} color="#aaaaaa" opacity={0.1} />
      )}
      {shiftedPlannedMoonTrajectory && (
        <TrajectoryLine
          points={shiftedPlannedMoonTrajectory}
          color="#aaaaaa"
          opacity={0.25}
          dashed
        />
      )}
      {shiftedTrajectory && (
        <TrajectoryLine points={shiftedTrajectory} color="#4488ff" opacity={0.4} />
      )}
      {shiftedPlannedTrajectory && (
        <TrajectoryLine points={shiftedPlannedTrajectory} color="#4488ff" opacity={0.55} />
      )}
      {isReentry && lastPlannedPoint && <ReentryArc lastPoint={lastPlannedPoint} />}
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
  sunLightPos,
  earthRotationAngle,
  initialZoom,
  missionPhase,
}: {
  mapView: "top" | "side";
  data: ArtemisData | null;
  trajectory: ScenePoint[] | null;
  moonTrajectory: ScenePoint[] | null;
  plannedTrajectory?: ScenePoint[] | null | undefined;
  plannedMoonTrajectory?: ScenePoint[] | null | undefined;
  moonPos: [number, number, number];
  artemisPos: [number, number, number];
  sunLightPos: [number, number, number];
  earthRotationAngle: number | undefined;
  initialZoom: number;
  missionPhase?: MissionPhase | undefined;
}): React.JSX.Element {
  const { camera } = useThree();
  const orbitRef = useRef<OrbitControlsHandle>(null);

  /* Three.js camera is mutable scene state; R3F does not wrap it in React state. */
  useLayoutEffect(() => {
    const ctrl = orbitRef.current;
    if (!ctrl) return;
    const cam = camera as OrthographicCameraType;
    const { position, up } = getOrthographicEyeForView(mapView);

    cam.position.set(position[0], position[1], position[2]);
    cam.up.set(up[0], up[1], up[2]);
    cam.zoom = initialZoom;
    cam.updateProjectionMatrix();

    ctrl.target.set(artemisPos[0], artemisPos[1], artemisPos[2]);
    ctrl.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset on view/zoom change
  }, [mapView, camera, initialZoom]);

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
        sunLightPos={sunLightPos}
        earthRotationAngle={earthRotationAngle}
        missionPhase={missionPhase}
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
 * Perspective orbit around Earth; camera opens at a fixed wide-angle position.
 */
function SceneContentsFree({
  data,
  trajectory,
  moonTrajectory,
  plannedTrajectory,
  plannedMoonTrajectory,
  moonPos,
  artemisPos,
  sunLightPos,
  earthRotationAngle,
  initialCameraOffset: _initialCameraOffset,
  missionPhase,
}: {
  data: ArtemisData | null;
  trajectory: ScenePoint[] | null;
  moonTrajectory: ScenePoint[] | null;
  plannedTrajectory?: ScenePoint[] | null | undefined;
  plannedMoonTrajectory?: ScenePoint[] | null | undefined;
  moonPos: [number, number, number];
  artemisPos: [number, number, number];
  sunLightPos: [number, number, number];
  earthRotationAngle: number | undefined;
  initialCameraOffset: [number, number, number];
  missionPhase?: MissionPhase | undefined;
}): React.JSX.Element {
  const { camera } = useThree();
  const orbitRef = useRef<OrbitControlsHandle>(null);
  const prevCraftSceneRef = useRef<[number, number, number] | null>(null);
  const prevOriginRef = useRef<[number, number, number] | null>(null);

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
  /* eslint-disable react-hooks/immutability -- camera and ctrl are mutable Three.js objects */
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

    // Earth in the floating-origin coordinate frame
    const ex = -origin[0];
    const ey = -origin[1];
    const ez = -origin[2];

    if (prevCraftSceneRef.current === null) {
      // First frame: orbit target = Earth, camera at fixed wide-angle position
      ctrl.target.set(ex, ey, ez);
      cam.position.set(ex + 30.31, ey + 17.5, ez + 20);
    } else if (prevOriginRef.current !== null) {
      // Floating-origin shift: compensate camera and target so the view stays stable
      const [pox, poy, poz] = prevOriginRef.current;
      const dox = origin[0] - pox;
      const doy = origin[1] - poy;
      const doz = origin[2] - poz;
      if (dox !== 0 || doy !== 0 || doz !== 0) {
        cam.position.x -= dox;
        cam.position.y -= doy;
        cam.position.z -= doz;
        ctrl.target.x -= dox;
        ctrl.target.y -= doy;
        ctrl.target.z -= doz;
      }
    }
    prevCraftSceneRef.current = [ax, ay, az];
    prevOriginRef.current = [origin[0], origin[1], origin[2]];
    // Do NOT call ctrl.update() here — OrbitControls calls update() internally on every
    // animation frame. A manual call here double-applies damping, growing the
    // camera-to-target distance on every data poll (zoom-out bug).
  }, [shiftedArtemisPos, origin, camera, data?.spacecraft.velocity]);
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
        sunLightPos={sunLightPos}
        earthRotationAngle={earthRotationAngle}
        origin={origin}
        missionPhase={missionPhase}
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
  missionPhase,
}: SpaceSceneProps): React.JSX.Element {
  const isDesktop = useIsDesktop();
  const orthoZoom = isDesktop ? ORTHO_ZOOM_DESKTOP : ORTHO_ZOOM_MOBILE;

  const moonX = data?.moon.position.x ?? 384_400;
  const moonY = data?.moon.position.y ?? 0;
  const moonZ = data?.moon.position.z ?? 0;
  const craftX = data?.spacecraft.position.x ?? 96_000;
  const craftY = data?.spacecraft.position.y ?? 0;
  const craftZ = data?.spacecraft.position.z ?? 0;

  const moonPos = toScenePosition({ x: moonX, y: moonY, z: moonZ });
  const artemisPos = toScenePosition({ x: craftX, y: craftY, z: craftZ });

  // Sun direction in J2000 ecliptic (km). Fallback: Sun is roughly at (-1 AU, 0, 0)
  // at early April (just past vernal equinox) relative to Earth — good enough when offline.
  const sunX = data?.sun.position.x ?? -149_597_870;
  const sunY = data?.sun.position.y ?? 0;
  const sunZ = data?.sun.position.z ?? 0;
  const sunMag = Math.sqrt(sunX * sunX + sunY * sunY + sunZ * sunZ);
  // Place the directional light far beyond the scene (~500 units) in the Sun direction
  const SUN_LIGHT_DIST = 500;
  const sunLightPos: [number, number, number] =
    sunMag > 0
      ? [
          (sunX / sunMag) * SUN_LIGHT_DIST,
          (sunY / sunMag) * SUN_LIGHT_DIST,
          (sunZ / sunMag) * SUN_LIGHT_DIST,
        ]
      : [-SUN_LIGHT_DIST, 0, 0];

  // Ensure the past trajectory line terminates exactly at the current capsule position,
  // and the planned trajectory line starts exactly at it.
  // The trajectory APIs return 10-min-sampled Horizons data cached for 5 min, so both
  // endpoints can lag the live capsule by hundreds of km — which at the extreme zoom of
  // free-fly mode (camera 0.0003 scene units from the craft) appears as a large gap.
  // Replace the last cached point of the past trajectory and the first cached point of
  // the planned trajectory with the live capsule position. The cached API points can be
  // up to 10 minutes stale; simply appending/prepending a new point creates a hairpin
  // in the Catmull-Rom spline (the new point reverses direction back through the stale
  // cached point). Replacing the stale endpoint instead gives a clean smooth terminus.
  const trajectoryWithCurrent = React.useMemo<ScenePoint[] | null>(() => {
    if (!trajectory || trajectory.length === 0) return trajectory;
    return [...trajectory.slice(0, -1), artemisPos];
  }, [trajectory, artemisPos]);

  const plannedTrajectoryWithCurrent = React.useMemo<ScenePoint[] | null | undefined>(() => {
    if (!plannedTrajectory || plannedTrajectory.length === 0) return plannedTrajectory;
    return [artemisPos, ...plannedTrajectory.slice(1)];
  }, [plannedTrajectory, artemisPos]);

  const canvasClassName = className ? `${className} touch-none` : "touch-none";

  // Use the data timestamp so the Earth's orientation matches the real Sun–Earth
  // geometry for that moment. When data is absent, EarthMesh self-initialises
  // from the current wall-clock time in a mount-time effect.
  const earthRotationAngle = React.useMemo(
    () => (data ? greenwichMeanSiderealTime(new Date(data.timestamp)) : undefined),
    [data],
  );

  if (view === "free") {
    const freeOrbitOffset = computeFreeOrbitInitialOffset(artemisPos, moonPos);
    return (
      <ErrorBoundary>
        <Canvas
          key="perspective"
          className={canvasClassName}
          camera={{
            fov: 52,
            position: [
              artemisPos[0] + freeOrbitOffset[0],
              artemisPos[1] + freeOrbitOffset[1],
              artemisPos[2] + freeOrbitOffset[2],
            ],
            up: [0, 0, 1],
            near: 0.1,
            far: 4000,
          }}
        >
          <SceneContentsFree
            data={data}
            trajectory={trajectoryWithCurrent}
            moonTrajectory={moonTrajectory}
            plannedTrajectory={plannedTrajectoryWithCurrent}
            plannedMoonTrajectory={plannedMoonTrajectory}
            moonPos={moonPos}
            artemisPos={artemisPos}
            sunLightPos={sunLightPos}
            earthRotationAngle={earthRotationAngle}
            initialCameraOffset={freeOrbitOffset}
            missionPhase={missionPhase}
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
          zoom: orthoZoom,
          near: 0.1,
          far: 2000,
        }}
      >
        <SceneContentsOrtho
          mapView={mapView}
          data={data}
          trajectory={trajectoryWithCurrent}
          moonTrajectory={moonTrajectory}
          plannedTrajectory={plannedTrajectoryWithCurrent}
          plannedMoonTrajectory={plannedMoonTrajectory}
          moonPos={moonPos}
          artemisPos={artemisPos}
          sunLightPos={sunLightPos}
          earthRotationAngle={earthRotationAngle}
          initialZoom={orthoZoom}
          missionPhase={missionPhase}
        />
      </Canvas>
    </ErrorBoundary>
  );
}
