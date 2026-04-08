import { describe, expect, it } from "vitest";
import {
  FREE_ORBIT_INITIAL_OFFSET,
  getOrthographicEyeForView,
  computeFreeOrbitInitialOffset,
} from "./sceneCameraPresets";

describe("getOrthographicEyeForView", () => {
  it.each([
    [
      "top",
      {
        position: [0, 0, 100] as const,
        up: [1, 0, 0] as const,
      },
    ],
    [
      "side",
      {
        position: [-100, 0, 0] as const,
        up: [0, 0, 1] as const,
      },
    ],
  ] as const)("returns preset for %s", (view, expected) => {
    expect(getOrthographicEyeForView(view)).toEqual(expected);
  });
});

describe("FREE_ORBIT_INITIAL_OFFSET", () => {
  it("is a non-zero offset tuple", () => {
    expect(FREE_ORBIT_INITIAL_OFFSET).toEqual([0.00008, 0.00008, 0.00008]);
    expect(FREE_ORBIT_INITIAL_OFFSET.some((v) => v !== 0)).toBe(true);
  });
});

describe("computeFreeOrbitInitialOffset", () => {
  it("returns FREE_ORBIT_INITIAL_OFFSET when positions are coincident (dist=0)", () => {
    // Arrange / Act
    const result = computeFreeOrbitInitialOffset([0, 0, 0], [0, 0, 0]);

    // Assert
    expect(result).toEqual(FREE_ORBIT_INITIAL_OFFSET);
  });

  it("returns a finite non-zero offset when moon is to the side (+X)", () => {
    // Arrange / Act
    const result = computeFreeOrbitInitialOffset([0, 0, 0], [1, 0, 0]);

    // Assert
    expect(result.every((v) => isFinite(v))).toBe(true);
    expect(result.some((v) => v !== 0)).toBe(true);
  });

  it("uses +Y lateral fallback when moon is nearly along ecliptic north (+Z)", () => {
    // Arrange — moon directly above capsule along Z axis makes rLen ≈ 0
    const result = computeFreeOrbitInitialOffset([0, 0, 0], [0, 0, 1]);

    // Assert — should not throw and should produce finite values
    expect(result.every((v) => isFinite(v))).toBe(true);
  });

  it("places camera behind capsule relative to the moon direction", () => {
    // Arrange — moon is at +X, so camera should be pushed in -X direction
    const result = computeFreeOrbitInitialOffset([0, 0, 0], [10, 0, 0]);

    // Assert — back component along -moonDir (i.e. -X) should be negative
    expect(result[0]).toBeLessThan(0);
  });
});
