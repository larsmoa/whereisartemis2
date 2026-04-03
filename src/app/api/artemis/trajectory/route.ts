import { fetchTrajectory } from "@/lib/horizons";
import { toScenePosition } from "@/lib/sceneCoords";
import type { ScenePoint } from "@/types";

export const revalidate = 300;

export async function GET(): Promise<Response> {
  try {
    const positions = await fetchTrajectory("-1024", undefined, undefined, "10m");
    const points: ScenePoint[] = positions.map((p) => toScenePosition(p.position));
    return Response.json(points);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
