import { fetchTrajectory, SPLASHDOWN_TIME } from "@/lib/horizons";
import { toScenePosition } from "@/lib/sceneCoords";
import type { ScenePoint } from "@/types";
import { type NextRequest } from "next/server";

export const revalidate = 300;

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");

    let positions;
    if (type === "future") {
      positions = await fetchTrajectory("-1024", new Date(), SPLASHDOWN_TIME, "10m");
    } else {
      positions = await fetchTrajectory("-1024", undefined, undefined, "10m");
    }

    const points: ScenePoint[] = positions.map((p) => toScenePosition(p.position));
    return Response.json(points);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
