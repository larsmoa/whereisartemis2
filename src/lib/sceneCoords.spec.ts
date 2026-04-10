import { describe, it, expect } from "vitest";
import {
  EARTH_SCENE_RADIUS,
  toScenePosition,
  latLonToSphereLocal,
  latLonToSceneWorld,
} from "./sceneCoords";

const EARTH_RADIUS_KM = 6378.137;

describe("toScenePosition", () => {
  it("maps the origin to [0, 0, 0]", () => {
    expect(toScenePosition({ x: 0, y: 0, z: 0 })).toEqual([0, 0, 0]);
  });

  it("direction is preserved — a purely X-axis position maps to scene X only", () => {
    const [sx, sy, sz] = toScenePosition({ x: 50000, y: 0, z: 0 });
    expect(sy).toBeCloseTo(0, 10);
    expect(sz).toBeCloseTo(0, 10);
    expect(sx).toBeGreaterThan(0);
  });

  it("direction is preserved — a 45° X/Z position maps equally to scene X and Z", () => {
    const d = 100000;
    const [sx, _sy, sz] = toScenePosition({ x: d, y: 0, z: d });
    expect(sx).toBeCloseTo(sz, 8);
  });

  it.each([
    ["positive X → positive scene X", { x: 50000, y: 0, z: 0 }, 0, "gt"],
    ["negative X → negative scene X", { x: -50000, y: 0, z: 0 }, 0, "lt"],
    ["positive Z → positive scene Z", { x: 0, y: 0, z: 50000 }, 2, "gt"],
    ["negative Z → negative scene Z", { x: 0, y: 0, z: -50000 }, 2, "lt"],
  ] as const)("sign preservation — %s", (_label, pos, axis, dir) => {
    const result = toScenePosition(pos);
    if (dir === "gt") expect(result[axis]).toBeGreaterThan(0);
    else expect(result[axis]).toBeLessThan(0);
  });

  it("maps symmetrically — same magnitude opposite direction", () => {
    const [posX] = toScenePosition({ x: 50000, y: 0, z: 0 });
    const [negX] = toScenePosition({ x: -50000, y: 0, z: 0 });
    expect(posX).toBeCloseTo(-negX, 10);
  });

  it("linear scale: Earth surface (r = EARTH_RADIUS_KM) maps to EARTH_SCENE_RADIUS", () => {
    const [sx] = toScenePosition({ x: EARTH_RADIUS_KM, y: 0, z: 0 });
    expect(sx).toBeCloseTo(EARTH_SCENE_RADIUS, 6);
  });

  it("linear scale: Moon distance (~384400 km) is ~60 Earth radii in scene units", () => {
    const [sx] = toScenePosition({ x: 384400, y: 0, z: 0 });
    const expected = (384400 / EARTH_RADIUS_KM) * EARTH_SCENE_RADIUS;
    expect(sx).toBeCloseTo(expected, 2);
    expect(sx).toBeGreaterThan(250);
  });

  it("Artemis at ~96000 km is closer to Earth than Moon at ~384000 km", () => {
    const [ax] = toScenePosition({ x: 96000, y: 0, z: 0 });
    const [mx] = toScenePosition({ x: 384000, y: 0, z: 0 });
    expect(ax).toBeLessThan(mx);
  });

  it("linear scale: scene distances are proportional to km", () => {
    const [ax] = toScenePosition({ x: 96000, y: 0, z: 0 });
    const [mx] = toScenePosition({ x: 384000, y: 0, z: 0 });
    const ratio = ax / mx;
    expect(ratio).toBeCloseTo(96000 / 384000, 5);
  });
});

describe("latLonToSphereLocal", () => {
  const R = 5.0;

  it.each([
    ["equator / Greenwich (0°N, 0°E) faces +X", 0, 0, [R, 0, 0]],
    ["north pole (90°N, any lon) is at +Y", 90, 0, [0, R, 0]],
    ["south pole (−90°N, any lon) is at −Y", -90, 0, [0, -R, 0]],
    ["equator 90°E faces −Z", 0, 90, [0, 0, -R]],
    ["equator 90°W faces +Z", 0, -90, [0, 0, R]],
    ["equator 180°E faces −X", 0, 180, [-R, 0, 0]],
  ] as const)("%s", (_label, lat, lon, expected) => {
    const [x, y, z] = latLonToSphereLocal(lat, lon, R);
    expect(x).toBeCloseTo(expected[0], 6);
    expect(y).toBeCloseTo(expected[1], 6);
    expect(z).toBeCloseTo(expected[2], 6);
  });

  it("result magnitude equals the given radius for any lat/lon", () => {
    const [x, y, z] = latLonToSphereLocal(32.5, -119.5, R);
    const mag = Math.sqrt(x * x + y * y + z * z);
    expect(mag).toBeCloseTo(R, 6);
  });
});

describe("latLonToSceneWorld", () => {
  const R = 5.0;

  it("result magnitude equals the given radius regardless of lat, lon, or GMST", () => {
    const cases: [number, number, number][] = [
      [0, 0, 0],
      [32.5, -119.5, 1.23],
      [90, 0, 2.5],
      [-45, 90, 0],
    ];
    for (const [lat, lon, gmst] of cases) {
      const [x, y, z] = latLonToSceneWorld(lat, lon, R, gmst);
      const mag = Math.sqrt(x * x + y * y + z * z);
      expect(mag).toBeCloseTo(R, 5);
    }
  });

  it("at GMST=0, Greenwich equator (0°N, 0°E) points along scene +X", () => {
    // Greenwich at equator is at local +X in the sphere frame, and GROUP_TILT_X
    // rotation around X leaves the X component unchanged.
    const [x, _y, _z] = latLonToSceneWorld(0, 0, R, 0);
    expect(x).toBeCloseTo(R, 5);
  });

  it("rotating GMST by 2π returns the same position", () => {
    const [x1, y1, z1] = latLonToSceneWorld(20, -117, R, 0.5);
    const [x2, y2, z2] = latLonToSceneWorld(20, -117, R, 0.5 + 2 * Math.PI);
    expect(x1).toBeCloseTo(x2, 5);
    expect(y1).toBeCloseTo(y2, 5);
    expect(z1).toBeCloseTo(z2, 5);
  });

  it("different GMST values produce different world positions", () => {
    const [x1] = latLonToSceneWorld(0, 0, R, 0);
    const [x2] = latLonToSceneWorld(0, 0, R, Math.PI / 2);
    expect(x1).not.toBeCloseTo(x2, 2);
  });
});
