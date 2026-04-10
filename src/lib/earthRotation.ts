/**
 * Earth rotation utilities for computing Greenwich Mean Sidereal Time (GMST)
 * from a UTC Date, based on the IAU 1982 formula.
 *
 * The scene uses J2000 ecliptic coordinates where X = vernal equinox direction,
 * so GMST gives the angle of the Greenwich meridian from the +X axis — exactly
 * the rotation.y value needed on the Earth mesh.
 */

const TWO_PI = 2 * Math.PI;

/**
 * Convert a JavaScript Date (UTC) to a Julian Date.
 *
 * Julian Date epoch: noon, 1 January 4713 BC (Julian proleptic calendar).
 * Unix epoch (1970-01-01 00:00:00 UTC) = JD 2440587.5.
 */
export function julianDate(date: Date): number {
  return 2440587.5 + date.getTime() / 86_400_000;
}

/**
 * Compute Greenwich Mean Sidereal Time (GMST) in radians for a given UTC Date.
 *
 * Uses the IAU 1982 polynomial (degrees):
 *   GMST = 280.46061837 + 360.98564736629 × (JD − 2451545.0)
 *
 * Result is normalised to the range [0, 2π).
 */
export function greenwichMeanSiderealTime(date: Date): number {
  const jd = julianDate(date);
  const du = jd - 2451545.0;
  const gmstDeg = 280.46061837 + 360.98564736629 * du;
  const gmstRad = (gmstDeg * Math.PI) / 180;
  return ((gmstRad % TWO_PI) + TWO_PI) % TWO_PI;
}
