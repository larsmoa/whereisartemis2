import { fetchTrajectory, SPLASHDOWN_TIME } from "@/lib/horizons";
import { toScenePosition } from "@/lib/sceneCoords";
import type { ScenePoint } from "@/types";
import { type NextRequest } from "next/server";

/** 5-minute cache — Moon moves slowly enough that this is plenty fresh */
export const revalidate = 300;

const HOURS_BACK = 72;

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");

    const now = new Date();
    let positions;
    if (type === "future") {
      positions = await fetchTrajectory("301", now, SPLASHDOWN_TIME);
    } else {
      const start = new Date(now.getTime() - HOURS_BACK * 60 * 60 * 1000);
      positions = await fetchTrajectory("301", start, now);
    }

    const points: ScenePoint[] = positions.map((p) => toScenePosition(p.position));
    return Response.json(points);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
