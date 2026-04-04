import { describe, expect, it } from "vitest";
import { FREE_ORBIT_INITIAL_OFFSET, getOrthographicEyeForView } from "./sceneCameraPresets";

describe("getOrthographicEyeForView", () => {
  it.each([
    [
      "top",
      {
        position: [0, 0, 100] as const,
        up: [-1, 0, 0] as const,
      },
    ],
    [
      "side",
      {
        position: [100, 0, 0] as const,
        up: [0, 0, 1] as const,
      },
    ],
  ] as const)("returns preset for %s", (view, expected) => {
    expect(getOrthographicEyeForView(view)).toEqual(expected);
  });
});

describe("FREE_ORBIT_INITIAL_OFFSET", () => {
  it("is a non-zero offset tuple", () => {
    expect(FREE_ORBIT_INITIAL_OFFSET).toEqual([25, 20, 25]);
    expect(FREE_ORBIT_INITIAL_OFFSET.some((v) => v !== 0)).toBe(true);
  });
});
