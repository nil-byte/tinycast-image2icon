import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADJUSTMENTS,
  formatParameterValue,
  normalizeAdjustments,
  normalizeHexColor,
  parseNumericParameter,
  stepParameter,
} from "../src/model";

describe("parameter model", () => {
  it("normalizes invalid persisted values", () => {
    expect(
      normalizeAdjustments({ zoom: 99, opacity: -2, backgroundHex: "bad" }),
    ).toEqual({
      ...DEFAULT_ADJUSTMENTS,
      zoom: 3,
      opacity: 0,
    });
  });

  it("parses and formats percentages", () => {
    expect(parseNumericParameter("zoom", "125% ")).toBe(1.25);
    expect(parseNumericParameter("opacity", "101")).toBeNull();
    expect(
      formatParameterValue("zoom", { ...DEFAULT_ADJUSTMENTS, zoom: 1.25 }),
    ).toBe("125%");
  });

  it("composes twenty rapid zoom updates without losing steps", () => {
    let current = { ...DEFAULT_ADJUSTMENTS };
    const pendingUpdates = Array.from(
      { length: 20 },
      () => (previous: typeof current) => stepParameter(previous, "zoom", 1),
    );
    for (const update of pendingUpdates) current = update(current);
    expect(current.zoom).toBe(2);
  });

  it("steps and clamps numeric parameters", () => {
    expect(
      stepParameter({ ...DEFAULT_ADJUSTMENTS, offsetX: 299 }, "offsetX", 1)
        .offsetX,
    ).toBe(300);
  });

  it("accepts RGB and RGBA colors", () => {
    expect(normalizeHexColor("fffFFF")).toBe("#FFFFFF");
    expect(normalizeHexColor("#11223344")).toBe("#11223344");
    expect(normalizeHexColor("透明")).toBe("transparent");
  });
});
