export type UnitSystem = "metric" | "us";

/** Format a number with thousands separators and fixed decimals */
export function formatDistance(km: number, system: UnitSystem = "metric", decimals = 0): string {
  const value = system === "us" ? km * 0.621371 : km;
  const unit = system === "us" ? "mi" : "km";
  return (
    value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + ` ${unit}`
  );
}

/** Format km/s with 2 decimal places */
export function formatSpeed(kms: number, system: UnitSystem = "metric"): string {
  const value = system === "us" ? kms * 0.621371 : kms;
  const unit = system === "us" ? "mi/s" : "km/s";
  return (
    value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ` ${unit}`
  );
}

/** Format speed in per hour units (km/h or mph) */
export function formatSpeedPerHour(kms: number, system: UnitSystem = "metric"): string {
  const value = system === "us" ? kms * 2236.9356 : kms * 3600;
  const unit = system === "us" ? "mph" : "km/h";
  return (
    value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ` ${unit}`
  );
}

/** Format seconds as Xd Xh Xm Xs */
export function formatElapsed(totalSeconds: number): string {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

/** Format signal delay in seconds with 2 decimal places */
export function formatDelay(seconds: number): string {
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)} ms`;
  return seconds.toFixed(2) + " s";
}
