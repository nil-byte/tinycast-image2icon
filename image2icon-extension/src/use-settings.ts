import { useEffect, useRef, useState } from "react";
import {
  Adjustments,
  DEFAULT_ADJUSTMENTS,
  DEFAULT_EXPORT_PREFERENCES,
  ExportPreferences,
} from "./model";
import { loadPersistedState, savePersistedState } from "./persistence";

export function useSettings() {
  const [adjustments, setAdjustments] = useState<Adjustments>({
    ...DEFAULT_ADJUSTMENTS,
  });
  const [exportPreferences, setExportPreferences] = useState<ExportPreferences>(
    { ...DEFAULT_EXPORT_PREFERENCES },
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    void loadPersistedState().then((state) => {
      if (!active) return;
      setAdjustments(state.adjustments);
      setExportPreferences(state.export);
      setIsLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void savePersistedState(adjustments, exportPreferences);
    }, 150);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [adjustments, exportPreferences, isLoaded]);

  return {
    adjustments,
    setAdjustments,
    exportPreferences,
    setExportPreferences,
    isLoaded,
  };
}
