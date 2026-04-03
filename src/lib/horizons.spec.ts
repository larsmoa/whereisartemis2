import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseSoeBlock,
  fetchArtemisAndMoon,
  EARTH_RADIUS_KM,
  MOON_RADIUS_KM,
  LAUNCH_TIME,
} from "./horizons";

// ---------------------------------------------------------------------------
// Fixtures — realistic Horizons API SOE block format
// ---------------------------------------------------------------------------

const VALID_SOE_RESULT = `
*******************************************************************************
$$SOE
2461133.500000000 = A.D. 2026-Apr-03 00:00:00.0000 TDB 
 X =-4.167610090861469E+03 Y = 6.427774643992089E+03 Z = 4.774057898683686E+02
 VX=-9.926859512834213E+00 VY=-1.868923074835082E+00 VZ=-3.356176930872550E-01
 LT= 2.560268535261566E-02 RG= 7.675491973261245E+03 RR= 3.804060742439584E+00
$$EOE
*******************************************************************************
`;

const VALID_SOE_NEGATIVE_COMPONENTS = `
$$SOE
2461133.500000000 = A.D. 2026-Apr-03 00:00:00.0000 TDB
 X =-6.086958232457416E+04 Y =-7.514201402802209E+04 Z =-7.532004694572952E+03
 VX=-3.484153859163124E+00 VY=-4.111237973046729E+00 VZ=-4.148747196355995E-01
 LT= 8.592219349247955E-02 RG= 2.575882558386205E+04 RR= 4.629067631651893E+00
$$EOE
`;

// ---------------------------------------------------------------------------
// parseSoeBlock
// ---------------------------------------------------------------------------

describe("parseSoeBlock", () => {
  it("parses position X, Y, Z correctly", () => {
    // Arrange / Act
    const result = parseSoeBlock(VALID_SOE_RESULT);

    // Assert
    expect(result.position.x).toBeCloseTo(-4167.61, 1);
    expect(result.position.y).toBeCloseTo(6427.77, 1);
    expect(result.position.z).toBeCloseTo(477.41, 1);
  });

  it("parses velocity VX, VY, VZ correctly", () => {
    const result = parseSoeBlock(VALID_SOE_RESULT);

    expect(result.velocity.x).toBeCloseTo(-9.9269, 3);
    expect(result.velocity.y).toBeCloseTo(-1.8689, 3);
    expect(result.velocity.z).toBeCloseTo(-0.3356, 3);
  });

  it("parses range (RG) and light-time (LT)", () => {
    const result = parseSoeBlock(VALID_SOE_RESULT);

    expect(result.rangeKm).toBeCloseTo(7675.49, 1);
    expect(result.lightTime).toBeCloseTo(0.0256, 4);
  });

  it("parses range-rate (RR)", () => {
    const result = parseSoeBlock(VALID_SOE_RESULT);

    expect(result.rangeRate).toBeCloseTo(3.804, 2);
  });

  it("handles all-negative position components", () => {
    const result = parseSoeBlock(VALID_SOE_NEGATIVE_COMPONENTS);

    expect(result.position.x).toBeLessThan(0);
    expect(result.position.y).toBeLessThan(0);
    expect(result.position.z).toBeLessThan(0);
  });

  it("throws when no SOE block is present", () => {
    expect(() => parseSoeBlock("no data here")).toThrow("No SOE block found in Horizons response");
  });

  it("throws when position line is missing", () => {
    const malformed = `
$$SOE
2461133.500000000 = A.D. 2026-Apr-03 00:00:00.0000 TDB
 VX=-9.93 VY=-1.87 VZ=-0.34
 LT= 0.026 RG= 7675.0 RR= 3.8
$$EOE
`;
    expect(() => parseSoeBlock(malformed)).toThrow(
      "Could not find position/velocity/range lines in SOE block",
    );
  });
});

// ---------------------------------------------------------------------------
// Exported constants
// ---------------------------------------------------------------------------

describe("constants", () => {
  it("EARTH_RADIUS_KM is the standard WGS-84 equatorial radius", () => {
    expect(EARTH_RADIUS_KM).toBeCloseTo(6378.137, 3);
  });

  it("MOON_RADIUS_KM is the standard lunar mean radius", () => {
    expect(MOON_RADIUS_KM).toBeCloseTo(1737.4, 1);
  });

  it("LAUNCH_TIME is April 1 2026 at 06:47 UTC", () => {
    expect(LAUNCH_TIME.toISOString()).toBe("2026-04-01T06:47:00.000Z");
  });
});

// ---------------------------------------------------------------------------
// fetchArtemisAndMoon (mocked fetch)
// ---------------------------------------------------------------------------

function makeHorizonsResponse(soe: string): string {
  return JSON.stringify({ result: soe });
}

describe("fetchArtemisAndMoon", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls fetch twice (spacecraft + moon) and returns parsed bodies", async () => {
    // Arrange
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(JSON.parse(makeHorizonsResponse(VALID_SOE_RESULT)) as unknown),
    } as Response);

    // Act
    const result = await fetchArtemisAndMoon();

    // Assert
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.spacecraft.rangeKm).toBeCloseTo(7675.49, 1);
    expect(result.moon.rangeKm).toBeCloseTo(7675.49, 1);
  });

  it("passes the spacecraft command '-1024' in the URL", async () => {
    // Arrange
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(JSON.parse(makeHorizonsResponse(VALID_SOE_RESULT)) as unknown),
    } as Response);

    // Act
    await fetchArtemisAndMoon();

    // Assert — first call should contain the Artemis body ID
    const firstUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(firstUrl).toContain("COMMAND=-1024");
  });

  it("passes the moon command '301' in the URL", async () => {
    // Arrange
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(JSON.parse(makeHorizonsResponse(VALID_SOE_RESULT)) as unknown),
    } as Response);

    // Act
    await fetchArtemisAndMoon();

    // Assert — second call should contain the Moon body ID
    const secondUrl = mockFetch.mock.calls[1]?.[0] as string;
    expect(secondUrl).toContain("COMMAND=301");
  });

  it("throws when the API returns a non-ok response", async () => {
    // Arrange
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
    } as Response);

    // Act / Assert
    await expect(fetchArtemisAndMoon()).rejects.toThrow(
      "Horizons API error: 429 Too Many Requests",
    );
  });
});
