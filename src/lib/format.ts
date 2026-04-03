/** Format a number with thousands separators and fixed decimals */
export function formatKm(km: number, decimals = 0): string {
  return (
    km.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + " km"
  );
}

/** Format km/s with 2 decimal places */
export function formatSpeed(kms: number): string {
  return kms.toFixed(2) + " km/s";
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
