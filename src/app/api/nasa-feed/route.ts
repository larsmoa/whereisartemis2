import { fetchNasaFeed } from "@/lib/nasa-feed";
import type { NasaFeed } from "@/lib/nasa-feed";

export const revalidate = 600;

export async function GET(): Promise<Response> {
  try {
    const feed: NasaFeed = await fetchNasaFeed();
    return Response.json(feed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
