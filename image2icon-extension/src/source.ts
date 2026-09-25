import { getSelectedFinderItems } from "@raycast/api";
import { validateInput } from "swift:../swift/rounded-icon";

export type SourceImage = {
  path: string;
  previewPath: string;
  name: string;
  width: number;
  height: number;
};

type SwiftInputInfo = Partial<SourceImage>;

function validatedInfo(value: unknown): SourceImage {
  const info = value as SwiftInputInfo;
  if (
    typeof info?.path !== "string" ||
    typeof info.previewPath !== "string" ||
    typeof info.name !== "string" ||
    typeof info.width !== "number" ||
    typeof info.height !== "number"
  ) {
    throw new Error("无法读取图片信息");
  }
  return {
    path: info.path,
    previewPath: info.previewPath,
    name: info.name,
    width: info.width,
    height: info.height,
  };
}

export async function sourceFromPath(path: string): Promise<SourceImage> {
  try {
    return validatedInfo(await validateInput(path));
  } catch {
    throw new Error(
      "无法打开这张图片，请选择 PNG、JPEG、HEIC、TIFF 或其他 macOS 支持的图片",
    );
  }
}

export async function sourceFromFinder(): Promise<SourceImage> {
  const items = await getSelectedFinderItems();
  if (items.length === 0) throw new Error("请先在 Finder 中选择一张图片");
  if (items.length > 1) throw new Error("一次只能选择一张图片");
  return sourceFromPath(items[0].path);
}

export async function sourceFromClipboard(): Promise<SourceImage> {
  try {
    return validatedInfo(await validateInput("__clipboard__"));
  } catch {
    throw new Error("剪贴板中没有可用的图片");
  }
}

export class SourceGeneration {
  private current = 0;

  begin(): number {
    this.current += 1;
    return this.current;
  }

  isCurrent(generation: number): boolean {
    return generation === this.current;
  }
}
