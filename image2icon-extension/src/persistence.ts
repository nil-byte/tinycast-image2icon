import { LocalStorage } from "@raycast/api";
import {
  Adjustments,
  DEFAULT_ADJUSTMENTS,
  DEFAULT_EXPORT_PREFERENCES,
  ExportPreferences,
  normalizeAdjustments,
  normalizeExportPreferences,
  PersistedState,
} from "./model";

const STORAGE_KEY = "image2icon.settings.v1";

export async function loadPersistedState(): Promise<PersistedState> {
  const fallback: PersistedState = {
    schemaVersion: 1,
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    export: { ...DEFAULT_EXPORT_PREFERENCES },
  };

  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as Partial<PersistedState>;
    if (parsed.schemaVersion !== 1) return fallback;
    return {
      schemaVersion: 1,
      adjustments: normalizeAdjustments(parsed.adjustments),
      export: normalizeExportPreferences(parsed.export),
    };
  } catch {
    return fallback;
  }
}

export async function savePersistedState(
  adjustments: Adjustments,
  exportPreferences: ExportPreferences,
): Promise<void> {
  const state: PersistedState = {
    schemaVersion: 1,
    adjustments: normalizeAdjustments(adjustments),
    export: normalizeExportPreferences(exportPreferences),
  };
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
