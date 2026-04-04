import { describe, it, expect } from "vitest";
import { EARTH_SCENE_RADIUS, toScenePosition } from "./sceneCoords";

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
