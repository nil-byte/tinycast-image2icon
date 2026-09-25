export type NumericParameterId =
  "zoom" | "offsetX" | "offsetY" | "rotation" | "opacity";
export type ParameterId = NumericParameterId | "isCover" | "backgroundHex";

export type Adjustments = {
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  opacity: number;
  isCover: boolean;
  backgroundHex: string;
};

export type ExportFormat =
  "png" | "jpg" | "ico" | "icns" | "iconset" | "favicon" | "ios" | "android";

export type ExportPreferences = {
  directory: string | null;
  rasterSize: number;
  lastFormat: ExportFormat;
};

export type PersistedState = {
  schemaVersion: 1;
  adjustments: Adjustments;
  export: ExportPreferences;
};

export const DEFAULT_ADJUSTMENTS: Adjustments = Object.freeze({
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  opacity: 1,
  isCover: true,
  backgroundHex: "transparent",
});

export const DEFAULT_EXPORT_PREFERENCES: ExportPreferences = Object.freeze({
  directory: null,
  rasterSize: 1024,
  lastFormat: "png",
});

export const NUMERIC_PARAMETER_CONFIG: Record<
  NumericParameterId,
  {
    title: string;
    min: number;
    max: number;
    step: number;
  }
> = {
  zoom: { title: "缩放", min: 0.1, max: 3, step: 0.05 },
  offsetX: { title: "水平位置", min: -300, max: 300, step: 1 },
  offsetY: { title: "垂直位置", min: -300, max: 300, step: 1 },
  rotation: { title: "旋转", min: -180, max: 180, step: 1 },
  opacity: { title: "不透明度", min: 0, max: 1, step: 0.05 },
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rounded(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (["transparent", "clear", "透明"].includes(trimmed.toLowerCase()))
    return "transparent";
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(withHash)) return null;
  return withHash.toUpperCase();
}

export function normalizeAdjustments(value: unknown): Adjustments {
  const raw =
    typeof value === "object" && value !== null
      ? (value as Partial<Adjustments>)
      : {};
  const numberOr = (candidate: unknown, fallback: number) =>
    typeof candidate === "number" && Number.isFinite(candidate)
      ? candidate
      : fallback;
  return {
    zoom: rounded(clamp(numberOr(raw.zoom, DEFAULT_ADJUSTMENTS.zoom), 0.1, 3)),
    offsetX: rounded(
      clamp(numberOr(raw.offsetX, DEFAULT_ADJUSTMENTS.offsetX), -300, 300),
    ),
    offsetY: rounded(
      clamp(numberOr(raw.offsetY, DEFAULT_ADJUSTMENTS.offsetY), -300, 300),
    ),
    rotation: rounded(
      clamp(numberOr(raw.rotation, DEFAULT_ADJUSTMENTS.rotation), -180, 180),
    ),
    opacity: rounded(
      clamp(numberOr(raw.opacity, DEFAULT_ADJUSTMENTS.opacity), 0, 1),
    ),
    isCover:
      typeof raw.isCover === "boolean"
        ? raw.isCover
        : DEFAULT_ADJUSTMENTS.isCover,
    backgroundHex:
      typeof raw.backgroundHex === "string"
        ? (normalizeHexColor(raw.backgroundHex) ??
          DEFAULT_ADJUSTMENTS.backgroundHex)
        : DEFAULT_ADJUSTMENTS.backgroundHex,
  };
}

export function normalizeRasterSize(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? Math.round(clamp(numeric, 16, 1024)) : 1024;
}

export function normalizeExportPreferences(value: unknown): ExportPreferences {
  const raw =
    typeof value === "object" && value !== null
      ? (value as Partial<ExportPreferences>)
      : {};
  const formats: ExportFormat[] = [
    "png",
    "jpg",
    "ico",
    "icns",
    "iconset",
    "favicon",
    "ios",
    "android",
  ];
  return {
    directory:
      typeof raw.directory === "string" && raw.directory.length > 0
        ? raw.directory
        : null,
    rasterSize: normalizeRasterSize(raw.rasterSize),
    lastFormat: formats.includes(raw.lastFormat as ExportFormat)
      ? (raw.lastFormat as ExportFormat)
      : "png",
  };
}

export function formatParameterValue(
  id: ParameterId,
  adjustments: Adjustments,
): string {
  switch (id) {
    case "zoom":
      return `${Math.round(adjustments.zoom * 100)}%`;
    case "offsetX":
      return `${Math.round(adjustments.offsetX)}px`;
    case "offsetY":
      return `${Math.round(adjustments.offsetY)}px`;
    case "rotation":
      return `${Math.round(adjustments.rotation)}°`;
    case "opacity":
      return `${Math.round(adjustments.opacity * 100)}%`;
    case "isCover":
      return adjustments.isCover ? "充满" : "完整";
    case "backgroundHex":
      return adjustments.backgroundHex === "transparent"
        ? "透明"
        : adjustments.backgroundHex;
  }
}

export function parameterTitle(id: ParameterId): string {
  if (id in NUMERIC_PARAMETER_CONFIG)
    return NUMERIC_PARAMETER_CONFIG[id as NumericParameterId].title;
  return id === "isCover" ? "填充方式" : "背景";
}

export function stepParameter(
  adjustments: Adjustments,
  id: NumericParameterId,
  direction: 1 | -1,
): Adjustments {
  const config = NUMERIC_PARAMETER_CONFIG[id];
  const next = clamp(
    adjustments[id] + direction * config.step,
    config.min,
    config.max,
  );
  return { ...adjustments, [id]: rounded(next) };
}

export function resetParameter(
  adjustments: Adjustments,
  id: ParameterId,
): Adjustments {
  return { ...adjustments, [id]: DEFAULT_ADJUSTMENTS[id] };
}

export function parseNumericParameter(
  id: NumericParameterId,
  text: string,
): number | null {
  const cleaned = text.trim().replace(/%|px|°|deg/gi, "");
  if (cleaned.length === 0) return null;
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) return null;
  const converted = id === "zoom" || id === "opacity" ? numeric / 100 : numeric;
  const config = NUMERIC_PARAMETER_CONFIG[id];
  if (converted < config.min || converted > config.max) return null;
  return rounded(converted);
}

export function numericInputHint(id: NumericParameterId): string {
  const config = NUMERIC_PARAMETER_CONFIG[id];
  if (id === "zoom" || id === "opacity")
    return `${Math.round(config.min * 100)}–${Math.round(config.max * 100)}%`;
  if (id === "rotation") return `${config.min}–${config.max}°`;
  return `${config.min}–${config.max}px`;
}

export function numericInputValue(
  id: NumericParameterId,
  adjustments: Adjustments,
): string {
  const value = adjustments[id];
  return id === "zoom" || id === "opacity"
    ? String(Math.round(value * 100))
    : String(Math.round(value));
}
