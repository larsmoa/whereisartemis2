import type { HorizonsBody, Vec3, TrajectoryPoint } from "@/types";

/** ISO string without fractional seconds, as Horizons requires */
function toHorizonsIso(date: Date): string {
  return date.toISOString().replace(/\.\d+Z$/, "");
}

const HORIZONS_API = "https://ssd.jpl.nasa.gov/api/horizons.api";

class Semaphore {
  private queue: Array<() => void> = [];
  private activeCount = 0;

  constructor(private maxConcurrent: number) {}

  async acquire(): Promise<void> {
    if (this.activeCount < this.maxConcurrent) {
      this.activeCount++;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const resolve = this.queue.shift();
      if (resolve) resolve();
    } else {
      this.activeCount--;
    }
  }
}

const horizonsSemaphore = new Semaphore(2);

export async function fetchHorizonsWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3,
): Promise<Response> {
  await horizonsSemaphore.acquire();
  try {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        const res = await fetch(url, options);
        if (res.ok) {
          return res;
        }
        if (res.status === 503 || res.status === 429) {
          if (attempt === retries) {
            throw new Error(`Horizons API error: ${res.status} ${res.statusText}`);
          }
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          attempt++;
          continue;
        }
        // Don't retry other HTTP errors
        throw new Error(`Horizons API error: ${res.status} ${res.statusText}`);
      } catch (error) {
        // If it's an HTTP error we explicitly threw, don't retry it (unless it was 503/429 which we handled above)
        if (
          error instanceof Error &&
          error.message.startsWith("Horizons API error: ") &&
          !error.message.includes("503") &&
          !error.message.includes("429")
        ) {
          throw error;
        }
        if (attempt === retries) {
          throw error;
        }
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
      }
    }
    throw new Error("Max retries exceeded");
  } finally {
    horizonsSemaphore.release();
  }
}

/** Earth equatorial radius in km */
export const EARTH_RADIUS_KM = 6378.137;
/** Moon radius in km */
export const MOON_RADIUS_KM = 1737.4;

/** Actual Artemis II launch time — used as MET=0 reference */
export const LAUNCH_TIME = new Date("2026-04-01T22:24:00Z");

/**
 * Earliest available Artemis II ephemeris in JPL Horizons.
 * The Horizons trajectory only has data from this point, ~3h 36m after actual launch.
 * Use this as the start time for trajectory fetch calls, not for MET calculations.
 */
export const HORIZONS_START_TIME = new Date("2026-04-02T02:00:00Z");

/** Latest available Artemis II ephemeris in JPL Horizons */
export const SPLASHDOWN_TIME = new Date("2026-04-10T23:55:00Z");

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
  const res = await fetchHorizonsWithRetry(url, { next: { revalidate: 30 } });

  const json = (await res.json()) as { result: string };
  return parseSoeBlock(json.result);
}

export async function fetchArtemisAndMoon(): Promise<{
  spacecraft: HorizonsBody;
  moon: HorizonsBody;
}> {
  // Round to nearest 30 seconds to ensure cache hits (revalidate is 30s)
  const now = new Date();
  now.setSeconds(Math.floor(now.getSeconds() / 30) * 30, 0);

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
export function parseSoeBlocks(result: string): TrajectoryPoint[] {
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

  const positions: TrajectoryPoint[] = [];
  // Lines cycle in groups of 4: [julian-date, X/Y/Z, VX/VY/VZ, LT/RG/RR]
  for (let i = 0; i < lines.length; i += 4) {
    const jdLine = lines[i];
    const posLine = lines[i + 1];
    const velLine = lines[i + 2];
    if (!jdLine || !posLine?.startsWith("X") || !velLine) continue;

    const jdMatch = jdLine.match(/^([\d.]+)\s*=/);
    if (!jdMatch?.[1]) continue;

    const jd = parseFloat(jdMatch[1]);
    const date = new Date((jd - 2440587.5) * 86400000);

    positions.push({
      position: {
        x: extractScalar(posLine, "X"),
        y: extractScalar(posLine, "Y"),
        z: extractScalar(posLine, "Z"),
      },
      velocity: {
        x: extractScalar(velLine, "VX"),
        y: extractScalar(velLine, "VY"),
        z: extractScalar(velLine, "VZ"),
      },
      date,
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
  stop?: Date,
  stepSize: string = "1h",
): Promise<TrajectoryPoint[]> {
  const effectiveStop = stop ? new Date(stop) : new Date();

  // Horizons ephemeris data for Artemis II (-1024) ends at 2026-04-10T23:54:30.3936Z.
  // Cap the requested stop time to avoid 500 errors from the API.
  if (command === "-1024") {
    const HORIZONS_END_TIME = new Date("2026-04-10T23:54:00Z");
    if (effectiveStop > HORIZONS_END_TIME) {
      effectiveStop.setTime(HORIZONS_END_TIME.getTime());
    }
  }

  // Round dates to nearest 5 minutes to ensure cache hits (revalidate is 300s)
  effectiveStop.setMinutes(Math.floor(effectiveStop.getMinutes() / 5) * 5, 0, 0);

  const effectiveStart = new Date(start);
  effectiveStart.setMinutes(Math.floor(effectiveStart.getMinutes() / 5) * 5, 0, 0);

  const startIso = toHorizonsIso(effectiveStart);
  const stopIso = toHorizonsIso(effectiveStop);

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

  const res = await fetchHorizonsWithRetry(url, { next: { revalidate: 300 } });

  const json = (await res.json()) as { result: string };
  return parseSoeBlocks(json.result);
}
