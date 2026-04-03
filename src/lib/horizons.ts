import type { HorizonsBody, Vec3 } from "@/types";

/** ISO string without fractional seconds, as Horizons requires */
function toHorizonsIso(date: Date): string {
  return date.toISOString().replace(/\.\d+Z$/, "");
}

const HORIZONS_API = "https://ssd.jpl.nasa.gov/api/horizons.api";

/** Earth equatorial radius in km */
export const EARTH_RADIUS_KM = 6378.137;
/** Moon radius in km */
export const MOON_RADIUS_KM = 1737.4;

/** Earliest available Artemis II ephemeris in JPL Horizons */
export const LAUNCH_TIME = new Date("2026-04-02T02:00:00Z");

function buildHorizonsUrl(command: string, startTime: string, stopTime: string): string {
  const params = new URLSearchParams({
    format: "json",
    COMMAND: command,
    EPHEM_TYPE: "VECTORS",
    CENTER: "500@399",
    START_TIME: startTime,
    STOP_TIME: stopTime,
    STEP_SIZE: "1",
    OBJ_DATA: "NO",
  });
  return `${HORIZONS_API}?${params.toString()}`;
}

/** Parse a single SOE data block from a Horizons API text response */
export function parseSoeBlock(result: string): HorizonsBody {
  const soeMatch = result.match(/\$\$SOE([\s\S]*?)\$\$EOE/);
  if (!soeMatch) {
    throw new Error("No SOE block found in Horizons response");
  }

  const rawBlock = soeMatch[1];
  if (!rawBlock) throw new Error("Empty SOE block in Horizons response");

  const block = rawBlock.trim();
  const lines = block.split("\n").map((l) => l.trim());

  const posLine = lines.find((l) => l.startsWith("X"));
  const velLine = lines.find((l) => l.startsWith("VX"));
  const ltLine = lines.find((l) => l.startsWith("LT"));

  if (!posLine || !velLine || !ltLine) {
    throw new Error("Could not find position/velocity/range lines in SOE block");
  }

  const extractScalar = (line: string, key: string): number => {
    // Horizons format: "KEY =value" or "KEY= value" — allow optional spaces around =
    const match = line.match(new RegExp(`${key}\\s*=\\s*([+-]?[\\d.E+-]+)`));
    const captured = match?.[1];
    if (!captured) throw new Error(`Could not parse ${key} from: ${line}`);
    return parseFloat(captured);
  };

  const parseVec = (line: string, xk: string, yk: string, zk: string): Vec3 => ({
    x: extractScalar(line, xk),
    y: extractScalar(line, yk),
    z: extractScalar(line, zk),
  });

  const position = parseVec(posLine, "X", "Y", "Z");
  const velocity = parseVec(velLine, "VX", "VY", "VZ");

  return {
    position,
    velocity,
    lightTime: extractScalar(ltLine, "LT"),
    rangeKm: extractScalar(ltLine, "RG"),
    rangeRate: extractScalar(ltLine, "RR"),
  };
}

async function fetchBody(command: string, now: Date): Promise<HorizonsBody> {
  const startIso = toHorizonsIso(now);
  // Add 1 minute for the stop time (minimum step required by Horizons)
  const stop = new Date(now.getTime() + 60_000);
  const stopIso = toHorizonsIso(stop);

  const url = buildHorizonsUrl(command, startIso, stopIso);
  const res = await fetch(url, { next: { revalidate: 60 } });

  if (!res.ok) {
    throw new Error(`Horizons API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { result: string };
  return parseSoeBlock(json.result);
}

export async function fetchArtemisAndMoon(): Promise<{
  spacecraft: HorizonsBody;
  moon: HorizonsBody;
}> {
  const now = new Date();

  const [spacecraft, moon] = await Promise.all([fetchBody("-1024", now), fetchBody("301", now)]);

  return { spacecraft, moon };
}

/**
 * Parse all epochs from a multi-step Horizons SOE block.
 *
 * Each epoch is a group of 4 lines inside $$SOE...$$EOE:
 *   <Julian date line>
 *   X = ...  Y = ...  Z = ...
 *   VX = ... VY = ... VZ = ...
 *   LT = ... RG = ... RR = ...
 *
 * Returns only the position Vec3 for each epoch (velocity omitted for brevity).
 */
export function parseSoeBlocks(result: string): Vec3[] {
  const soeMatch = result.match(/\$\$SOE([\s\S]*?)\$\$EOE/);
  if (!soeMatch) throw new Error("No SOE block found in Horizons response");

  const rawBlock = soeMatch[1];
  if (!rawBlock) throw new Error("Empty SOE block in Horizons response");

  const lines = rawBlock
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const extractScalar = (line: string, key: string): number => {
    const match = line.match(new RegExp(`${key}\\s*=\\s*([+-]?[\\d.E+-]+)`));
    const captured = match?.[1];
    if (!captured) throw new Error(`Could not parse ${key} from: ${line}`);
    return parseFloat(captured);
  };

  const positions: Vec3[] = [];
  // Lines cycle in groups of 4: [julian-date, X/Y/Z, VX/VY/VZ, LT/RG/RR]
  for (let i = 0; i < lines.length; i += 4) {
    const posLine = lines[i + 1];
    if (!posLine?.startsWith("X")) continue;
    positions.push({
      x: extractScalar(posLine, "X"),
      y: extractScalar(posLine, "Y"),
      z: extractScalar(posLine, "Z"),
    });
  }

  return positions;
}

/**
 * Fetch position samples for a Horizons body over a time window.
 *
 * @param command  - Horizons body ID (e.g. "-1024" for Artemis, "301" for Moon)
 * @param start    - Start of the window (defaults to LAUNCH_TIME)
 * @param stop     - End of the window (defaults to now)
 * @param stepSize - Horizons step size string, e.g. "10m", "1h" (default "1h")
 *
 * Returns an array of Earth-centered J2000 ecliptic positions in km.
 */
export async function fetchTrajectory(
  command: string,
  start: Date = LAUNCH_TIME,
  stop: Date = new Date(),
  stepSize: string = "1h",
): Promise<Vec3[]> {
  const startIso = toHorizonsIso(start);
  const stopIso = toHorizonsIso(stop);

  const params = new URLSearchParams({
    format: "json",
    COMMAND: command,
    EPHEM_TYPE: "VECTORS",
    CENTER: "500@399",
    START_TIME: startIso,
    STOP_TIME: stopIso,
    STEP_SIZE: stepSize,
    OBJ_DATA: "NO",
  });
  const url = `${HORIZONS_API}?${params.toString()}`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    throw new Error(`Horizons API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { result: string };
  return parseSoeBlocks(json.result);
}
