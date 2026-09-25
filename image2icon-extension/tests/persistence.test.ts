import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_ADJUSTMENTS, DEFAULT_EXPORT_PREFERENCES } from "../src/model";
import { loadPersistedState, savePersistedState } from "../src/persistence";
import { storage } from "./raycast-api.mock";

describe("settings persistence", () => {
  beforeEach(() => storage.clear());

  it("returns defaults when storage is empty", async () => {
    const state = await loadPersistedState();
    expect(state.adjustments).toEqual(DEFAULT_ADJUSTMENTS);
    expect(state.export).toEqual(DEFAULT_EXPORT_PREFERENCES);
  });

  it("round-trips versioned settings without source data", async () => {
    await savePersistedState(
      { ...DEFAULT_ADJUSTMENTS, zoom: 1.5, backgroundHex: "#123456" },
      { ...DEFAULT_EXPORT_PREFERENCES, directory: "/tmp/export", rasterSize: 512 },
    );
    const state = await loadPersistedState();
    expect(state.schemaVersion).toBe(1);
    expect(state.adjustments.zoom).toBe(1.5);
    expect(state.export.directory).toBe("/tmp/export");
    expect(JSON.stringify(state)).not.toContain("source");
  });
});
