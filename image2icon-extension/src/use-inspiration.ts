import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  Inspiration,
  fallbackInspiration,
  loadDailyInspiration,
  refreshInspiration,
} from "./inspiration";

export function useInspiration() {
  const [inspiration, setInspiration] = useState<Inspiration>(() =>
    fallbackInspiration(),
  );

  useEffect(() => {
    let active = true;
    void loadDailyInspiration().then((next) => {
      if (active) setInspiration(next);
    });
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      setInspiration(await refreshInspiration());
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "暂时无法换一句",
        message: "请检查网络后重试",
      });
    }
  }, []);

  return { inspiration, refresh };
}
