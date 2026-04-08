import { fetchArtemisTimeline } from "@/lib/timeline";

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  try {
    const timeline = await fetchArtemisTimeline();
    return Response.json(timeline);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
