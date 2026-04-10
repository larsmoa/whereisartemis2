import { fetchTrajectory, HORIZONS_START_TIME, SPLASHDOWN_TIME } from "@/lib/horizons";
import { calculateMilestones } from "@/lib/milestones";

export const revalidate = 3600; // Cache for 1 hour since predictive trajectory rarely changes

export async function GET(): Promise<Response> {
  try {
    // Fetch full 10-day trajectory at 10-minute intervals
    const [artemisTrajectory, moonTrajectory] = await Promise.all([
      fetchTrajectory("-1024", HORIZONS_START_TIME, SPLASHDOWN_TIME, "10m"),
      fetchTrajectory("301", HORIZONS_START_TIME, SPLASHDOWN_TIME, "10m"),
    ]);

    const milestones = calculateMilestones(artemisTrajectory, moonTrajectory);
    return Response.json(milestones);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
