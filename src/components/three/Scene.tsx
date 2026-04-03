"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { ReactNode } from "react";

interface SceneProps {
  children?: ReactNode;
  className?: string;
}

/**
 * Base R3F canvas wrapper. Always used as a Client Component because
 * React Three Fiber requires browser APIs (WebGL, requestAnimationFrame).
 *
 * Place all 3D content as children of this component.
 */
export function Scene({ children, className }: SceneProps): React.JSX.Element {
  return (
    <Canvas className={className}>
      <OrbitControls />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      {children}
    </Canvas>
  );
}
