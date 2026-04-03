"use client";

import { useMemo, useRef } from "react";
import type { BufferGeometry } from "three";
import type { ScenePoint } from "@/types";

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
    const arr = new Float32Array(points.length * 3);
    points.forEach(([x, y, z], i) => {
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    });
    return arr;
  }, [points]);

  if (points.length < 2) return null;

  return (
    <line>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[flatArray, 3]}
          count={points.length}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} opacity={opacity} transparent />
    </line>
  );
}
