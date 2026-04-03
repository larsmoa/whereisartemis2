"use client";

import { useMemo, useRef } from "react";
import { CatmullRomCurve3, Vector3 } from "three";
import type { BufferGeometry } from "three";
import type { ScenePoint } from "@/types";

/** Samples per input point — higher = smoother curve */
const SAMPLES_PER_POINT = 8;

interface TrajectoryLineProps {
  points: ScenePoint[];
  color?: string;
  opacity?: number;
}

export function TrajectoryLine({
  points,
  color = "#4488ff",
  opacity = 0.6,
}: TrajectoryLineProps): React.JSX.Element | null {
  const geomRef = useRef<BufferGeometry>(null);

  const flatArray = useMemo(() => {
    const vectors = points.map(([x, y, z]) => new Vector3(x, y, z));

    // CatmullRomCurve3 with centripetal parameterisation prevents cusps and
    // self-intersections that can appear with the default uniform parameterisation
    // when adjacent control points are unevenly spaced (e.g. early high-velocity phase).
    const curve = new CatmullRomCurve3(vectors, false, "centripetal");
    const sampleCount = points.length * SAMPLES_PER_POINT;
    const sampled = curve.getPoints(sampleCount);

    const arr = new Float32Array(sampled.length * 3);
    sampled.forEach((v, i) => {
      arr[i * 3] = v.x;
      arr[i * 3 + 1] = v.y;
      arr[i * 3 + 2] = v.z;
    });
    return arr;
  }, [points]);

  if (points.length < 2) return null;

  const vertexCount = points.length * SAMPLES_PER_POINT + 1;

  return (
    <line>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[flatArray, 3]}
          count={vertexCount}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} opacity={opacity} transparent />
    </line>
  );
}
