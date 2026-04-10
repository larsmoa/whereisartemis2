"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useTexture } from "@react-three/drei";
import { AdditiveBlending } from "three";
import type { Mesh } from "three";
import { EARTH_SCENE_RADIUS, latLonToSphereLocal } from "@/lib/sceneCoords";
import { greenwichMeanSiderealTime } from "@/lib/earthRotation";
import { SPLASHDOWN_LAT_DEG, SPLASHDOWN_LON_DEG } from "@/lib/mission-phase";

/** Sidereal rotation rate: 2π rad / 86164.1 s */
const EARTH_ANGULAR_VELOCITY = (2 * Math.PI) / 86164.1;

/** Cloud layer rotates 10x faster than the surface */
const CLOUD_ANGULAR_VELOCITY = EARTH_ANGULAR_VELOCITY * 100;

/** Earth's axial tilt relative to the J2000 ecliptic plane */
const OBLIQUITY_RAD = 23.4392911 * (Math.PI / 180);

/**
 * Group X-rotation that correctly orients the Earth sphere:
 *   - π/2 maps the sphere's Y-pole to the ecliptic Z axis (ecliptic north).
 *   - Adding OBLIQUITY_RAD tilts the pole a further 23.44° toward ecliptic
 *     longitude 270° (−Y direction), matching Earth's J2000 pole at
 *     (0, −sin ε, cos ε) in scene space.
 */
const GROUP_TILT_X = Math.PI / 2 + OBLIQUITY_RAD;

/** Marker radius — sits just above the cloud layer */
const MARKER_RADIUS = EARTH_SCENE_RADIUS + 0.15;

/** Local position of the splashdown site on the sphere surface */
const SPLASHDOWN_MARKER_POS = latLonToSphereLocal(
  SPLASHDOWN_LAT_DEG,
  SPLASHDOWN_LON_DEG,
  MARKER_RADIUS,
);

function SplashdownSiteMarker(): React.JSX.Element {
  const [hovered, setHovered] = useState(false);

  return (
    <mesh
      position={SPLASHDOWN_MARKER_POS}
      onPointerOver={(e): void => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(): void => setHovered(false)}
    >
      <sphereGeometry args={[0.06, 12, 12]} />
      <meshStandardMaterial
        color="#ff6820"
        emissive="#ff4400"
        emissiveIntensity={2.5}
        transparent
        opacity={0.9}
      />
      {hovered && (
        <Html center>
          <div
            style={{
              background: "rgba(0,0,0,0.72)",
              color: "#fff",
              padding: "3px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            Splashdown site
          </div>
        </Html>
      )}
    </mesh>
  );
}

interface EarthMeshProps {
  position?: [number, number, number];
  /** When true, renders a warm amber atmospheric glow (re-entry phase) */
  reentryGlow?: boolean;
  /**
   * Greenwich Mean Sidereal Time in radians at the current data timestamp.
   * Sets the initial rotation so the Greenwich meridian aligns with the real
   * Sun–Earth geometry. Falls back to wall-clock time if not provided.
   */
  rotationAngle?: number | undefined;
  /** When true, renders a glowing splashdown site marker on the surface */
  splashdownMarker?: boolean;
}

/**
 * Earth — realistic sphere at the scene origin with textures and clouds.
 * `EARTH_SCENE_RADIUS` is the reference for trajectory scaling and Moon size.
 */
export function EarthMesh({
  position = [0, 0, 0],
  reentryGlow = false,
  rotationAngle,
  splashdownMarker = false,
}: EarthMeshProps = {}): React.JSX.Element {
  const earthRef = useRef<Mesh>(null);
  const cloudsRef = useRef<Mesh>(null);

  const [colorMap, normalMap, specularMap, cloudsMap] = useTexture([
    "/textures/earth/earth_atmos_2048.jpg",
    "/textures/earth/earth_normal_2048.jpg",
    "/textures/earth/earth_specular_2048.jpg",
    "/textures/earth/earth_clouds_1024.png",
  ]);

  /**
   * pendingSyncRef holds the GMST value that should be applied at the start of
   * the next animation frame. It is written by a React effect (which fires after
   * render but outside the R3F loop) and consumed inside useFrame where we have
   * access to clock.elapsedTime. This avoids the need for clock in useEffect.
   */
  const pendingSyncRef = useRef<number | null>(null);

  /**
   * rotationBaseRef pins the Earth's rotation at a known clock time so
   * subsequent frames can extrapolate without floating-point drift.
   */
  const rotationBaseRef = useRef<{ angle: number; clockTime: number } | null>(null);

  /**
   * cloudBaseRef independently tracks the cloud layer's rotation anchor.
   * On re-sync it is set to the cloud's *current* computed angle rather than
   * GMST, so the accumulated extra rotation is preserved across data refreshes
   * and the cloud layer never snaps back to the Earth's position.
   */
  const cloudBaseRef = useRef<{ angle: number; clockTime: number } | null>(null);

  // Self-initialise from the wall clock on mount so the Earth is already
  // oriented correctly before the first data fetch completes. This runs
  // in a useEffect (after render) so it is safe from the purity rule.
  useEffect(() => {
    if (pendingSyncRef.current === null && rotationBaseRef.current === null) {
      pendingSyncRef.current = greenwichMeanSiderealTime(new Date());
    }
  }, []);

  useEffect(() => {
    if (rotationAngle !== undefined) {
      pendingSyncRef.current = rotationAngle;
    }
  }, [rotationAngle]);

  useFrame(({ clock }, delta) => {
    // Consume a pending GMST sync: re-anchor Earth to the new GMST angle, and
    // re-anchor the cloud to its *current* computed angle so accumulated extra
    // rotation is preserved (prevents the cloud from snapping back on re-sync).
    if (pendingSyncRef.current !== null) {
      const newClockTime = clock.elapsedTime;
      const newEarthAngle = pendingSyncRef.current;

      const currentCloudAngle =
        cloudBaseRef.current !== null
          ? cloudBaseRef.current.angle +
            (newClockTime - cloudBaseRef.current.clockTime) * CLOUD_ANGULAR_VELOCITY
          : newEarthAngle;

      rotationBaseRef.current = { angle: newEarthAngle, clockTime: newClockTime };
      cloudBaseRef.current = { angle: currentCloudAngle, clockTime: newClockTime };
      pendingSyncRef.current = null;
    }

    const base = rotationBaseRef.current;
    const cloudBase = cloudBaseRef.current;

    if (base !== null && cloudBase !== null) {
      const elapsed = clock.elapsedTime - base.clockTime;
      if (earthRef.current)
        earthRef.current.rotation.y = base.angle + elapsed * EARTH_ANGULAR_VELOCITY;
      const cloudElapsed = clock.elapsedTime - cloudBase.clockTime;
      if (cloudsRef.current)
        cloudsRef.current.rotation.y = cloudBase.angle + cloudElapsed * CLOUD_ANGULAR_VELOCITY;
    } else {
      // No data yet — animate forward at the correct sidereal rate from wherever
      // the mesh currently sits (starts at 0).
      if (earthRef.current) earthRef.current.rotation.y += delta * EARTH_ANGULAR_VELOCITY;
      if (cloudsRef.current) cloudsRef.current.rotation.y += delta * CLOUD_ANGULAR_VELOCITY;
    }
  });

  return (
    <group position={position} rotation={[GROUP_TILT_X, 0, 0]}>
      {/* Earth Sphere */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[EARTH_SCENE_RADIUS, 64, 64]} />
        <meshStandardMaterial
          map={colorMap ?? null}
          normalMap={normalMap ?? null}
          roughnessMap={specularMap ?? null}
          metalness={0.1}
          roughness={0.8}
        />
        {/* Splashdown site marker — child of earth mesh so it rotates with it */}
        {splashdownMarker && <SplashdownSiteMarker />}
      </mesh>

      {/* Cloud Layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[EARTH_SCENE_RADIUS + 0.065, 64, 64]} />
        <meshStandardMaterial
          map={cloudsMap ?? null}
          transparent
          opacity={0.8}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Atmospheric glow — intensified during re-entry */}
      <mesh>
        <sphereGeometry args={[EARTH_SCENE_RADIUS + 0.35, 48, 48]} />
        <meshStandardMaterial
          color={reentryGlow ? "#ff6020" : "#4488ff"}
          transparent
          opacity={reentryGlow ? 0.12 : 0.04}
          blending={AdditiveBlending}
          depthWrite={false}
          side={2}
        />
      </mesh>
    </group>
  );
}
