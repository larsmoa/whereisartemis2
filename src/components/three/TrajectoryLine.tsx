"use client";

import { useMemo } from "react";
import { CatmullRomCurve3, Vector3 } from "three";
import { Line } from "@react-three/drei";
import type { ScenePoint } from "@/types";

/** Samples per input point — higher = smoother curve */
const SAMPLES_PER_POINT = 8;

interface TrajectoryLineProps {
  points: ScenePoint[];
  color?: string;
  opacity?: number;
  dashed?: boolean;
  lineWidth?: number;
}

export function TrajectoryLine({
  points,
  color = "#4488ff",
  opacity = 0.6,
  dashed = false,
  lineWidth = 2.5,
}: TrajectoryLineProps): React.JSX.Element | null {
  const curvePoints = useMemo(() => {
    if (points.length < 2) return [];

    const vectors = points.map(([x, y, z]) => new Vector3(x, y, z));

    // CatmullRomCurve3 with centripetal parameterisation prevents cusps and
    // self-intersections that can appear with the default uniform parameterisation
    // when adjacent control points are unevenly spaced (e.g. early high-velocity phase).
    const curve = new CatmullRomCurve3(vectors, false, "centripetal");
    const sampleCount = points.length * SAMPLES_PER_POINT;
    return curve.getPoints(sampleCount);
  }, [points]);

  if (curvePoints.length < 2) return null;

  return (
    <Line
      points={curvePoints}
      color={color}
      transparent
      opacity={opacity}
      depthWrite={false}
      renderOrder={1}
      dashed={dashed}
      dashSize={0.5}
      gapSize={0.5}
      lineWidth={lineWidth}
    />
  );
}
