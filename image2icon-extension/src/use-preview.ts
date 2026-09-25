import { environment } from "@raycast/api";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { renderPreviewFile } from "./preview-transport";
import { Adjustments } from "./model";
import { PreviewScheduler } from "./preview-scheduler";
import { SourceImage } from "./source";

type PreviewRequest = {
  sourcePath: string;
  adjustments: Adjustments;
  optionsJSON: string;
};
type PreviewFrame = {
  sourcePath: string;
  dataURL: string | null;
  error: string | null;
};

// Detail is not a native canvas: each new URL causes host image decoding.
// Settle a short input burst before replacing pixels, rather than flashing
// intermediate images. Do not add animations or loading states per keypress.
const INPUT_SETTLE_MS = 100;

export function usePreview(
  source: SourceImage | null,
  adjustments: Adjustments,
  commitAdjustments: Dispatch<SetStateAction<Adjustments>>,
) {
  const [frame, setFrame] = useState<PreviewFrame | null>(null);
  const mounted = useRef(true);
  const desiredAdjustments = useRef(adjustments);
  const commitAdjustmentsRef = useRef(commitAdjustments);
  const lastRequestedKey = useRef<string | null>(null);
  const publishedAdjustments = useRef<Adjustments | null>(null);
  commitAdjustmentsRef.current = commitAdjustments;

  const scheduler = useMemo(
    () =>
      new PreviewScheduler<PreviewRequest, string>(
        ({ sourcePath, optionsJSON }) =>
          renderPreviewFile(sourcePath, environment.assetsPath, optionsJSON),
        {
          onResult: (base64, request) => {
            if (!mounted.current) return;
            // Commit a complete frame, never an empty/loading intermediate frame.
            setFrame({
              sourcePath: request.sourcePath,
              dataURL: `data:image/png;base64,${base64}`,
              error: null,
            });
            publishedAdjustments.current = request.adjustments;
            commitAdjustmentsRef.current(request.adjustments);
          },
          onError: (cause, request) => {
            if (!mounted.current) return;
            lastRequestedKey.current = null;
            setFrame((previous) => ({
              sourcePath: request.sourcePath,
              dataURL:
                previous?.sourcePath === request.sourcePath
                  ? previous.dataURL
                  : null,
              error: cause instanceof Error ? cause.message : "预览生成失败",
            }));
          },
        },
        INPUT_SETTLE_MS,
      ),
    [],
  );

  const requestPreview = useCallback(
    (next: Adjustments, nextSource: SourceImage) => {
      const optionsJSON = JSON.stringify(next);
      const key = `${nextSource.previewPath}\n${optionsJSON}`;
      if (lastRequestedKey.current === key) return;
      lastRequestedKey.current = key;
      scheduler.request({
        sourcePath: nextSource.previewPath,
        adjustments: next,
        optionsJSON,
      });
    },
    [scheduler],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      lastRequestedKey.current = null;
      scheduler.invalidate();
    };
  }, [scheduler]);

  useEffect(() => {
    // Hydration is external; a published frame must not roll back newer input.
    if (publishedAdjustments.current !== adjustments) {
      desiredAdjustments.current = adjustments;
    }
    if (!source) {
      lastRequestedKey.current = null;
      scheduler.invalidate();
      setFrame(null);
      return;
    }
    requestPreview(desiredAdjustments.current, source);
  }, [source, adjustments, requestPreview, scheduler]);

  const setPreviewAdjustments = useCallback<
    Dispatch<SetStateAction<Adjustments>>
  >(
    (update) => {
      if (!source) return;
      const next =
        typeof update === "function"
          ? update(desiredAdjustments.current)
          : update;
      desiredAdjustments.current = next;
      requestPreview(next, source);
    },
    [requestPreview, source],
  );

  const visibleFrame = frame?.sourcePath === source?.previewPath ? frame : null;
  return {
    dataURL: visibleFrame?.dataURL ?? null,
    error: visibleFrame?.error ?? null,
    isLoading: Boolean(source && !visibleFrame),
    setAdjustments: setPreviewAdjustments,
  };
}
