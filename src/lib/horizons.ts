import type { HorizonsBody, Vec3 } from "@/types";

const HORIZONS_API = "https://ssd.jpl.nasa.gov/api/horizons.api";

/** Earth equatorial radius in km */
export const EARTH_RADIUS_KM = 6378.137;
/** Moon radius in km */
export const MOON_RADIUS_KM = 1737.4;

/** Artemis II launch time */
export const LAUNCH_TIME = new Date("2026-04-01T06:47:00Z");

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
  const startIso = now.toISOString().replace(/\.\d+Z$/, "");
  // Add 1 minute for the stop time (minimum step required by Horizons)
  const stop = new Date(now.getTime() + 60_000);
  const stopIso = stop.toISOString().replace(/\.\d+Z$/, "");

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
