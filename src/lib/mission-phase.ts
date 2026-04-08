import { LAUNCH_TIME } from "./horizons";

/** Orion module separation — the beginning of the re-entry sequence */
export const REENTRY_START_TIME = new Date("2026-04-10T23:33:00Z");

/** Expected splashdown in the Pacific Ocean */
export const SPLASHDOWN_ACTUAL_TIME = new Date("2026-04-11T00:07:00Z");

/** Post-splashdown news conference */
export const POST_SPLASHDOWN_CONF_TIME = new Date("2026-04-11T02:30:00Z");

/**
 * Approximate splashdown coordinates (Pacific Ocean, off Baja California).
 * Used to render the re-entry arc endpoint on the 3D globe.
 */
export const SPLASHDOWN_LAT_DEG = 20.0;
export const SPLASHDOWN_LON_DEG = -117.0;

/** Window around splashdown for the "SPLASHDOWN_MOMENT" phase (±60 s) */
const SPLASHDOWN_MOMENT_WINDOW_MS = 60_000;

/** Window before splashdown when the countdown takeover is shown (30 min) */
export const COUNTDOWN_WINDOW_MS = 30 * 60 * 1_000;

/** Lunar closest approach — mission turns from outbound to return leg */
const RETURN_LEG_START = new Date("2026-04-06T23:02:00Z");

export type MissionPhase = "OUTBOUND" | "RETURN" | "REENTRY" | "SPLASHDOWN_MOMENT" | "COMPLETE";

export function getMissionPhase(now: Date): MissionPhase {
  const nowMs = now.getTime();
  const splashdownMs = SPLASHDOWN_ACTUAL_TIME.getTime();

  if (nowMs >= splashdownMs + SPLASHDOWN_MOMENT_WINDOW_MS) return "COMPLETE";
  if (nowMs >= splashdownMs - SPLASHDOWN_MOMENT_WINDOW_MS) return "SPLASHDOWN_MOMENT";
  if (nowMs >= REENTRY_START_TIME.getTime()) return "REENTRY";
  if (nowMs >= RETURN_LEG_START.getTime()) return "RETURN";
  if (nowMs >= LAUNCH_TIME.getTime()) return "OUTBOUND";
  return "OUTBOUND";
}

export function isMissionComplete(now: Date): boolean {
  const phase = getMissionPhase(now);
  return phase === "COMPLETE" || phase === "SPLASHDOWN_MOMENT";
}

/** Seconds until splashdown (negative when past) */
export function getSecondsToSplashdown(now: Date): number {
  return Math.floor((SPLASHDOWN_ACTUAL_TIME.getTime() - now.getTime()) / 1_000);
}

/** True when within the 30-min countdown window (before splashdown only) */
export function isInCountdownWindow(now: Date): boolean {
  const diffMs = SPLASHDOWN_ACTUAL_TIME.getTime() - now.getTime();
  return diffMs >= 0 && diffMs <= COUNTDOWN_WINDOW_MS;
}
