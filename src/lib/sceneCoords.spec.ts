import { describe, it, expect } from "vitest";
import { toScenePosition } from "./sceneCoords";

describe("toScenePosition", () => {
  it("maps the origin to [0, 0, 0]", () => {
    expect(toScenePosition({ x: 0, y: 0, z: 0 })).toEqual([0, 0, 0]);
  });

  it.each([
    ["positive x → positive scene x", { x: 10000, y: 0, z: 0 }, 0, "gt"],
    ["negative x → negative scene x", { x: -10000, y: 0, z: 0 }, 0, "lt"],
    ["positive z → positive scene z", { x: 0, y: 0, z: 10000 }, 2, "gt"],
    ["negative z → negative scene z", { x: 0, y: 0, z: -10000 }, 2, "lt"],
  ] as const)("sign preservation — %s", (_label, pos, axis, direction) => {
    const result = toScenePosition(pos);
    if (direction === "gt") expect(result[axis]).toBeGreaterThan(0);
    else expect(result[axis]).toBeLessThan(0);
  });

  it("maps symmetrically — |pos x| equals |neg x| for same magnitude", () => {
    const [posX] = toScenePosition({ x: 50000, y: 0, z: 0 });
    const [negX] = toScenePosition({ x: -50000, y: 0, z: 0 });
    expect(posX).toBeCloseTo(-negX, 10);
  });

  it.each([
    // [label, km, axis, expectedSceneUnit, decimals]
    ["Earth surface (~6378 km) → ~9.03", 6378, 0, 9.03, 1],
    ["Moon distance (~384400 km) < 100 units", 384400, 0, 40, 0],
  ] as const)("log-scale: %s", (_label, km, axis, expected, decimals) => {
    const result = toScenePosition({ x: km, y: 0, z: 0 });
    if (_label.includes("Moon")) {
      expect(result[axis]).toBeLessThan(100);
      expect(result[axis]).toBeGreaterThan(0);
    } else {
      expect(result[axis]).toBeCloseTo(expected, decimals);
    }
  });
});
