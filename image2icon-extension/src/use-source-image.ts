import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  SourceGeneration,
  SourceImage,
  sourceFromClipboard,
  sourceFromFinder,
  sourceFromPath,
} from "./source";

export function useSourceImage() {
  const [source, setSource] = useState<SourceImage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const generation = useRef(new SourceGeneration());
  const didAttemptInitialFinderImport = useRef(false);

  const run = useCallback(
    async (
      loader: () => Promise<SourceImage>,
      reportFailure = true,
    ): Promise<boolean> => {
      const request = generation.current.begin();
      setIsLoading(true);
      try {
        const next = await loader();
        if (!generation.current.isCurrent(request)) return false;
        setSource(next);
        return true;
      } catch (error) {
        if (generation.current.isCurrent(request) && reportFailure) {
          await showToast({
            style: Toast.Style.Failure,
            title: "无法导入图片",
            message: error instanceof Error ? error.message : "请重试",
          });
        }
        return false;
      } finally {
        if (generation.current.isCurrent(request)) setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (didAttemptInitialFinderImport.current) return;
    didAttemptInitialFinderImport.current = true;
    void run(sourceFromFinder, false);
  }, [run]);

  const loadPath = useCallback(
    (path: string) => run(() => sourceFromPath(path)),
    [run],
  );
  const loadFinder = useCallback(() => run(sourceFromFinder), [run]);
  const loadClipboard = useCallback(() => run(sourceFromClipboard), [run]);

  return { source, isLoading, loadPath, loadFinder, loadClipboard };
}
