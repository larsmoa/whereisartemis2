import type { ArtemisData, Vec3 } from "@/types";
import { EARTH_RADIUS_KM, MOON_RADIUS_KM, LAUNCH_TIME } from "./horizons";

function interpolatePosition(pos: Vec3, vel: Vec3, dt: number): Vec3 {
  return {
    x: pos.x + vel.x * dt,
    y: pos.y + vel.y * dt,
    z: pos.z + vel.z * dt,
  };
}

export function interpolateArtemisData(data: ArtemisData, nowMs: number): ArtemisData {
  const dataTimeMs = new Date(data.timestamp).getTime();
  const dt = (nowMs - dataTimeMs) / 1000;

  // If the data is from the future or we're exactly at the data time, return as is
  if (dt <= 0) {
    return data;
  }

  const newSpacecraftPos = interpolatePosition(
    data.spacecraft.position,
    data.spacecraft.velocity,
    dt,
  );
  const newMoonPos = interpolatePosition(data.moon.position, data.moon.velocity, dt);

  const rangeKm = Math.sqrt(
    newSpacecraftPos.x ** 2 + newSpacecraftPos.y ** 2 + newSpacecraftPos.z ** 2,
  );

  const moonToArtemis = Math.sqrt(
    (newSpacecraftPos.x - newMoonPos.x) ** 2 +
      (newSpacecraftPos.y - newMoonPos.y) ** 2 +
      (newSpacecraftPos.z - newMoonPos.z) ** 2,
  );

  const distanceFromEarthKm = rangeKm - EARTH_RADIUS_KM;
  const distanceFromMoonKm = moonToArtemis - MOON_RADIUS_KM;
  const signalDelaySeconds = rangeKm / 299792;
  const missionElapsedSeconds = Math.floor((nowMs - LAUNCH_TIME.getTime()) / 1000);

  return {
    ...data,
    spacecraft: {
      ...data.spacecraft,
      position: newSpacecraftPos,
      rangeKm,
    },
    moon: {
      ...data.moon,
      position: newMoonPos,
    },
    distanceFromEarthKm,
    distanceFromMoonKm,
    signalDelaySeconds,
    missionElapsedSeconds,
    timestamp: new Date(nowMs).toISOString(),
  };
}
