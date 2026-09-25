import { describe, expect, it } from "vitest";
import { PARAMETER_SHORTCUTS } from "../src/parameter-shortcuts";

describe("parameter shortcuts", () => {
  it("assigns distinct Option bracket/backslash keys for decrease, reset, increase", () => {
    expect(PARAMETER_SHORTCUTS).toEqual({
      decrease: { modifiers: ["opt"], key: "[" },
      reset: { modifiers: ["opt"], key: "\\" },
      increase: { modifiers: ["opt"], key: "]" },
    });
    expect(
      new Set(
        Object.values(PARAMETER_SHORTCUTS).map(
          ({ modifiers, key }) => `${modifiers.join("+")}:${key}`,
        ),
      ).size,
    ).toBe(3);
  });
});
