import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseSoeBlock,
  parseSoeBlocks,
  fetchArtemisAndMoon,
  fetchTrajectory,
  fetchHorizonsWithRetry,
  EARTH_RADIUS_KM,
  MOON_RADIUS_KM,
  LAUNCH_TIME,
  HORIZONS_START_TIME,
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
// parseSoeBlocks (multi-epoch)
// ---------------------------------------------------------------------------

const MULTI_EPOCH_SOE_RESULT = `
*******************************************************************************
$$SOE
2461133.500000000 = A.D. 2026-Apr-01 06:47:00.0000 TDB 
 X =-4.167610090861469E+03 Y = 6.427774643992089E+03 Z = 4.774057898683686E+02
 VX=-9.926859512834213E+00 VY=-1.868923074835082E+00 VZ=-3.356176930872550E-01
 LT= 2.560268535261566E-02 RG= 7.675491973261245E+03 RR= 3.804060742439584E+00
2461133.541666667 = A.D. 2026-Apr-01 07:47:00.0000 TDB 
 X = 1.000000000000000E+04 Y = 2.000000000000000E+04 Z = 3.000000000000000E+03
 VX=-9.000000000000000E+00 VY=-1.000000000000000E+00 VZ=-1.000000000000000E-01
 LT= 5.000000000000000E-02 RG= 2.236067977499790E+04 RR= 3.000000000000000E+00
2461133.583333333 = A.D. 2026-Apr-01 08:47:00.0000 TDB 
 X =-5.000000000000000E+04 Y =-5.000000000000000E+04 Z =-5.000000000000000E+03
 VX=-2.000000000000000E+00 VY=-2.000000000000000E+00 VZ=-2.000000000000000E-01
 LT= 1.000000000000000E-01 RG= 7.071067811865476E+04 RR= 2.000000000000000E+00
$$EOE
*******************************************************************************
`;

describe("parseSoeBlocks", () => {
  it("returns one Vec3 per epoch", () => {
    const result = parseSoeBlocks(MULTI_EPOCH_SOE_RESULT);

    expect(result).toHaveLength(3);
  });

  it.each([
    [0, -4167.61, 6427.77, 477.41],
    [1, 10000, 20000, 3000],
    [2, -50000, -50000, -5000],
  ] as const)("epoch %i has correct x/y/z (±0.5 km)", (idx, x, y, z) => {
    const result = parseSoeBlocks(MULTI_EPOCH_SOE_RESULT);

    expect(result[idx]?.position.x).toBeCloseTo(x, 0);
    expect(result[idx]?.position.y).toBeCloseTo(y, 0);
    expect(result[idx]?.position.z).toBeCloseTo(z, 0);
  });

  it("throws when no SOE block is present", () => {
    expect(() => parseSoeBlocks("no data here")).toThrow("No SOE block found");
  });

  it("returns empty array when SOE block has no position lines", () => {
    const noPositions = `
$$SOE
2461133.500000000 = A.D. 2026-Apr-01 06:47:00.0000 TDB 
$$EOE
`;
    const result = parseSoeBlocks(noPositions);

    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// fetchHorizonsWithRetry
// ---------------------------------------------------------------------------

describe("fetchHorizonsWithRetry", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("returns response immediately on success", async () => {
    const mockFetch = vi.mocked(fetch);
    const mockResponse = { ok: true, status: 200 } as Response;
    mockFetch.mockResolvedValue(mockResponse);

    const promise = fetchHorizonsWithRetry("http://example.com");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockResponse);
  });

  it("retries on 503 and eventually succeeds", async () => {
    const mockFetch = vi.mocked(fetch);
    const errorResponse = { ok: false, status: 503, statusText: "Service Unavailable" } as Response;
    const successResponse = { ok: true, status: 200 } as Response;

    mockFetch
      .mockResolvedValueOnce(errorResponse)
      .mockResolvedValueOnce(errorResponse)
      .mockResolvedValueOnce(successResponse);

    const promise = fetchHorizonsWithRetry("http://example.com");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result).toBe(successResponse);
  });

  it("retries on 429 and eventually succeeds", async () => {
    const mockFetch = vi.mocked(fetch);
    const errorResponse = { ok: false, status: 429, statusText: "Too Many Requests" } as Response;
    const successResponse = { ok: true, status: 200 } as Response;

    mockFetch.mockResolvedValueOnce(errorResponse).mockResolvedValueOnce(successResponse);

    const promise = fetchHorizonsWithRetry("http://example.com");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toBe(successResponse);
  });

  it("throws after max retries on 503", async () => {
    const mockFetch = vi.mocked(fetch);
    const errorResponse = { ok: false, status: 503, statusText: "Service Unavailable" } as Response;

    mockFetch.mockResolvedValue(errorResponse);

    const promise = fetchHorizonsWithRetry("http://example.com", undefined, 2);
    const expectPromise = expect(promise).rejects.toThrow(
      "Horizons API error: 503 Service Unavailable",
    );
    await vi.runAllTimersAsync();
    await expectPromise;

    expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it("throws immediately on 404 (no retry)", async () => {
    const mockFetch = vi.mocked(fetch);
    const errorResponse = { ok: false, status: 404, statusText: "Not Found" } as Response;

    mockFetch.mockResolvedValue(errorResponse);

    const promise = fetchHorizonsWithRetry("http://example.com");
    const expectPromise = expect(promise).rejects.toThrow("Horizons API error: 404 Not Found");
    await vi.runAllTimersAsync();
    await expectPromise;

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries on network errors and eventually succeeds", async () => {
    const mockFetch = vi.mocked(fetch);
    const successResponse = { ok: true, status: 200 } as Response;

    mockFetch
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce(successResponse);

    const promise = fetchHorizonsWithRetry("http://example.com");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toBe(successResponse);
  });
});

// ---------------------------------------------------------------------------
// fetchTrajectory (mocked fetch)
// ---------------------------------------------------------------------------

describe("fetchTrajectory", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("returns parsed TrajectoryPoint[] for all epochs", async () => {
    // Arrange
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve(JSON.parse(JSON.stringify({ result: MULTI_EPOCH_SOE_RESULT })) as unknown),
    } as Response);

    // Act
    const promise = fetchTrajectory("-1024");
    await vi.runAllTimersAsync();
    const result = await promise;

    // Assert
    expect(result).toHaveLength(3);
    expect(result[0]?.position.x).toBeCloseTo(-4167.61, 0);
  });

  it("uses STEP_SIZE=1 h in the request URL", async () => {
    // Arrange
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve(JSON.parse(JSON.stringify({ result: MULTI_EPOCH_SOE_RESULT })) as unknown),
    } as Response);

    // Act
    const promise = fetchTrajectory("-1024");
    await vi.runAllTimersAsync();
    await promise;

    // Assert
    const url = mockFetch.mock.calls[0]?.[0] as string;
    expect(url).toContain("STEP_SIZE=1h");
  });

  it("throws when the API returns a non-ok response", async () => {
    // Arrange
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    } as Response);

    // Act / Assert
    const promise = fetchTrajectory("-1024");
    const expectPromise = expect(promise).rejects.toThrow("Horizons API error: 503");
    await vi.runAllTimersAsync();
    await expectPromise;
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

  it("LAUNCH_TIME is the actual Artemis II launch time", () => {
    expect(LAUNCH_TIME.toISOString()).toBe("2026-04-01T22:24:00.000Z");
  });

  it("HORIZONS_START_TIME is the earliest available Artemis II ephemeris", () => {
    expect(HORIZONS_START_TIME.toISOString()).toBe("2026-04-02T02:00:00.000Z");
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
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("calls fetch three times (spacecraft + moon + sun) and returns parsed bodies", async () => {
    // Arrange
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(JSON.parse(makeHorizonsResponse(VALID_SOE_RESULT)) as unknown),
    } as Response);

    // Act
    const promise = fetchArtemisAndMoon();
    await vi.runAllTimersAsync();
    const result = await promise;

    // Assert
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.spacecraft.rangeKm).toBeCloseTo(7675.49, 1);
    expect(result.moon.rangeKm).toBeCloseTo(7675.49, 1);
    expect(result.sun.rangeKm).toBeCloseTo(7675.49, 1);
  });

  it("passes the spacecraft command '-1024' in the URL", async () => {
    // Arrange
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(JSON.parse(makeHorizonsResponse(VALID_SOE_RESULT)) as unknown),
    } as Response);

    // Act
    const promise = fetchArtemisAndMoon();
    await vi.runAllTimersAsync();
    await promise;

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
    const promise = fetchArtemisAndMoon();
    await vi.runAllTimersAsync();
    await promise;

    // Assert — second call should contain the Moon body ID
    const secondUrl = mockFetch.mock.calls[1]?.[0] as string;
    expect(secondUrl).toContain("COMMAND=301");
  });

  it("passes the sun command '10' in the URL", async () => {
    // Arrange
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(JSON.parse(makeHorizonsResponse(VALID_SOE_RESULT)) as unknown),
    } as Response);

    // Act
    const promise = fetchArtemisAndMoon();
    await vi.runAllTimersAsync();
    await promise;

    // Assert — third call should contain the Sun body ID
    const thirdUrl = mockFetch.mock.calls[2]?.[0] as string;
    expect(thirdUrl).toContain("COMMAND=10");
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
    const promise = fetchArtemisAndMoon();
    const expectPromise = expect(promise).rejects.toThrow(
      "Horizons API error: 429 Too Many Requests",
    );
    await vi.runAllTimersAsync();
    await expectPromise;
  });
});
