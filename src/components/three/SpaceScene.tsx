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
import { toScenePosition, EARTH_SCENE_RADIUS, latLonToSceneWorld } from "@/lib/sceneCoords";
import { greenwichMeanSiderealTime } from "@/lib/earthRotation";
import {
  SPLASHDOWN_LAT_DEG,
  SPLASHDOWN_LON_DEG,
  SPLASHDOWN_ACTUAL_TIME,
} from "@/lib/mission-phase";
import type { MissionPhase } from "@/lib/mission-phase";
import type { ArtemisData, ScenePoint, SceneView } from "@/types";

/** GMST at the planned splashdown moment — stable constant, computed once */
const SPLASHDOWN_GMST = greenwichMeanSiderealTime(SPLASHDOWN_ACTUAL_TIME);

/**
 * Scene world position of the splashdown site at the moment of splashdown,
 * accounting for the Earth's orientation (GMST + GROUP_TILT_X).
 * Earth is at scene origin, so this is the arc's surface endpoint.
 */
const SPLASHDOWN_SCENE_POS: [number, number, number] = latLonToSceneWorld(
  SPLASHDOWN_LAT_DEG,
  SPLASHDOWN_LON_DEG,
  EARTH_SCENE_RADIUS,
  SPLASHDOWN_GMST,
);

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
 * Draws the re-entry descent arc using a Hermite cubic spline.
 *
 * Start tangent  — the real incoming approach direction (prevPoint → lastPoint),
 *                  so the arc continues as a smooth extension of the trajectory.
 * End tangent    — radially inward at the splashdown site, simulating the near-
 *                  vertical parachute descent at the end of re-entry.
 * The curve is sampled into 20 points and passed to TrajectoryLine.
 *
 * Coordinate note: lastPoint is in the floating-origin frame; splashdownPos is in
 * scene world space and is shifted into the same frame here. Vectors from the
 * Earth centre equal the corresponding unshifted world-space coordinates because
 * the floating-origin shift cancels (lastPoint = origPt − origin, so
 * lastPoint + origin = origPt = vector from Earth centre at [0,0,0]).
 */
function ReentryArc({
  prevPoint,
  lastPoint,
  splashdownPos,
  origin = [0, 0, 0],
}: {
  prevPoint?: ScenePoint | null;
  lastPoint: ScenePoint;
  splashdownPos: [number, number, number];
  origin?: [number, number, number];
}): React.JSX.Element | null {
  const arcPoints = React.useMemo<ScenePoint[]>(() => {
    const [lx, ly, lz] = lastPoint;
    const [ox, oy, oz] = origin;
    const [spx, spy, spz] = splashdownPos;

    // Guard: entry point must be above the surface
    const sX = lx + ox;
    const sY = ly + oy;
    const sZ = lz + oz;
    if (Math.sqrt(sX * sX + sY * sY + sZ * sZ) < EARTH_SCENE_RADIUS) return [];

    // --- Hermite control points in floating-origin frame ---
    const p0x = lx,
      p0y = ly,
      p0z = lz;
    const p1x = spx - ox,
      p1y = spy - oy,
      p1z = spz - oz;

    // Chord length — used to scale both tangents for a well-proportioned curve
    const cx = p1x - p0x,
      cy = p1y - p0y,
      cz = p1z - p0z;
    const chord = Math.sqrt(cx * cx + cy * cy + cz * cz);
    if (chord === 0) return [];

    // Start tangent: incoming approach direction × 2 × chord.
    // The ×2 scale makes the arc travel noticeably in the approach direction
    // before beginning its turn, giving a smooth visual continuation.
    let t0x: number, t0y: number, t0z: number;
    if (prevPoint) {
      const [pvx, pvy, pvz] = prevPoint;
      const dvx = lx - pvx,
        dvy = ly - pvy,
        dvz = lz - pvz;
      const dvLen = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);
      if (dvLen > 0) {
        t0x = (dvx / dvLen) * chord * 2;
        t0y = (dvy / dvLen) * chord * 2;
        t0z = (dvz / dvLen) * chord * 2;
      } else {
        // prevPoint coincides with lastPoint — fall through to radial fallback
        t0x = (-sX / Math.sqrt(sX * sX + sY * sY + sZ * sZ)) * chord * 2;
        t0y = (-sY / Math.sqrt(sX * sX + sY * sY + sZ * sZ)) * chord * 2;
        t0z = (-sZ / Math.sqrt(sX * sX + sY * sY + sZ * sZ)) * chord * 2;
      }
    } else {
      // No prevPoint: fall back to radially inward (approaching from deep space)
      const sLen = Math.sqrt(sX * sX + sY * sY + sZ * sZ);
      t0x = (-sX / sLen) * chord * 2;
      t0y = (-sY / sLen) * chord * 2;
      t0z = (-sZ / sLen) * chord * 2;
    }

    // End tangent: radially inward at splashdown (vertical parachute descent).
    // splashdownPos is already in world space = vector from Earth centre.
    const spLen = Math.sqrt(spx * spx + spy * spy + spz * spz);
    const t1x = (-spx / spLen) * chord * 0.6;
    const t1y = (-spy / spLen) * chord * 0.6;
    const t1z = (-spz / spLen) * chord * 0.6;

    // Sample 20 points along the Hermite cubic
    const N = 20;
    const pts: ScenePoint[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const t2 = t * t;
      const t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;
      pts.push([
        h00 * p0x + h10 * t0x + h01 * p1x + h11 * t1x,
        h00 * p0y + h10 * t0y + h01 * p1y + h11 * t1y,
        h00 * p0z + h10 * t0z + h01 * p1z + h11 * t1z,
      ]);
    }
    return pts;
  }, [prevPoint, lastPoint, splashdownPos, origin]);

  if (arcPoints.length < 2) return null;

  return (
    <TrajectoryLine
      points={arcPoints}
      color="#a03800"
      opacity={0.5}
      lineWidth={2}
      dashed
      dashSize={0.125}
      gapSize={0.125}
    />
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

  // Show the re-entry arc as a landing preview during the return leg and all later phases
  const showReentryArc =
    missionPhase === "RETURN" ||
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

  const prevPlannedPoint = React.useMemo<ScenePoint | null>(() => {
    const src = shiftedPlannedTrajectory ?? shiftedTrajectory;
    if (!src || src.length < 2) return null;
    return src[src.length - 2] ?? null;
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
        splashdownMarker
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
        <TrajectoryLine points={shiftedTrajectory} color="#4488ff" opacity={0.1} />
      )}
      {shiftedPlannedTrajectory && (
        <TrajectoryLine points={shiftedPlannedTrajectory} color="#4488ff" opacity={0.55} />
      )}
      {showReentryArc && lastPlannedPoint && (
        <ReentryArc
          prevPoint={prevPlannedPoint}
          lastPoint={lastPlannedPoint}
          splashdownPos={SPLASHDOWN_SCENE_POS}
          origin={origin}
        />
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
      cam.position.set(ex + 2.93, ey + 19.2, ez + 10.5);
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
