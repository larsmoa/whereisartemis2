import { fetchArtemisAndMoon, EARTH_RADIUS_KM, MOON_RADIUS_KM, LAUNCH_TIME } from "@/lib/horizons";
import type { ArtemisData } from "@/types";

export const revalidate = 30;

export async function GET(): Promise<Response> {
  try {
    const { spacecraft, moon } = await fetchArtemisAndMoon();

    const speedKms = Math.sqrt(
      spacecraft.velocity.x ** 2 + spacecraft.velocity.y ** 2 + spacecraft.velocity.z ** 2,
    );

    const distanceFromEarthKm = spacecraft.rangeKm - EARTH_RADIUS_KM;

    const moonToArtemis = Math.sqrt(
      (spacecraft.position.x - moon.position.x) ** 2 +
        (spacecraft.position.y - moon.position.y) ** 2 +
        (spacecraft.position.z - moon.position.z) ** 2,
    );
    const distanceFromMoonKm = moonToArtemis - MOON_RADIUS_KM;

    const signalDelaySeconds = spacecraft.rangeKm / 299792;

    const now = new Date();
    const missionElapsedSeconds = Math.floor((now.getTime() - LAUNCH_TIME.getTime()) / 1000);

    const data: ArtemisData = {
      spacecraft,
      moon,
      speedKms,
      distanceFromEarthKm,
      distanceFromMoonKm,
      signalDelaySeconds,
      missionElapsedSeconds,
      timestamp: now.toISOString(),
    };

    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
