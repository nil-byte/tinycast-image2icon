import {
  Action,
  ActionPanel,
  Alert,
  environment,
  Form,
  Icon,
  confirmAlert,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { existsSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { useState } from "react";
import { copyPNG, exportIcon } from "swift:../swift/rounded-icon";
import {
  Adjustments,
  ExportFormat,
  ExportPreferences,
  normalizeRasterSize,
} from "./model";
import { SourceImage } from "./source";

type Props = {
  source: SourceImage;
  adjustments: Adjustments;
  exportPreferences: ExportPreferences;
  setExportPreferences: (value: ExportPreferences) => void;
};

const FORMAT_LABELS: Record<ExportFormat, string> = {
  png: "PNG 图片",
  jpg: "JPG 图片",
  ico: "Windows ICO",
  icns: "macOS ICNS",
  iconset: "macOS iconset",
  favicon: "网站 Favicon",
  ios: "iOS AppIcon",
  android: "Android mipmap",
};

export function ExportActions(props: Props) {
  return (
    <ActionPanel.Section title="输出">
      <Action.Push
        title="导出…"
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
        target={<ExportForm {...props} />}
      />
      <Action
        title="复制 PNG"
        icon={Icon.Clipboard}
        shortcut={Keyboard.Shortcut.Common.Copy}
        onAction={async () => {
          const toast = await showToast({
            style: Toast.Style.Animated,
            title: "正在复制 PNG…",
          });
          try {
            const copied = await copyPNG(
              props.source.path,
              environment.assetsPath,
              JSON.stringify(props.adjustments),
            );
            if (!copied) throw new Error("无法写入剪贴板");
            toast.style = Toast.Style.Success;
            toast.title = "已复制 PNG";
            toast.message = "1024 × 1024";
          } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = "复制失败";
            toast.message = readableError(error);
          }
        }}
      />
    </ActionPanel.Section>
  );
}

function ExportForm({
  source,
  adjustments,
  exportPreferences,
  setExportPreferences,
}: Props) {
  const [format, setFormat] = useState<ExportFormat>(
    exportPreferences.lastFormat,
  );
  const [directories, setDirectories] = useState<string[]>(
    exportPreferences.directory ? [exportPreferences.directory] : [],
  );
  const [sizeText, setSizeText] = useState(
    String(exportPreferences.rasterSize),
  );
  const [sizeError, setSizeError] = useState<string | undefined>();
  const [isExporting, setIsExporting] = useState(false);
  const { pop } = useNavigation();
  const isRaster = format === "png" || format === "jpg";

  async function submit() {
    const directory = directories[0];
    if (!directory) {
      await showToast({
        style: Toast.Style.Failure,
        title: "请选择导出文件夹",
      });
      return;
    }
    const numericSize = Number(sizeText);
    if (
      isRaster &&
      (!Number.isFinite(numericSize) || numericSize < 16 || numericSize > 1024)
    ) {
      setSizeError("请输入 16–1024");
      return;
    }
    const rasterSize = isRaster
      ? normalizeRasterSize(numericSize)
      : exportPreferences.rasterSize;
    const destination = join(directory, destinationName(source.name, format));
    if (existsSync(destination)) {
      const confirmed = await confirmAlert({
        title: "覆盖现有项目？",
        message: destination,
        primaryAction: { title: "覆盖", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }

    setIsExporting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `正在导出 ${FORMAT_LABELS[format]}…`,
    });
    try {
      const result = (await exportIcon(
        source.path,
        environment.assetsPath,
        JSON.stringify(adjustments),
        format,
        destination,
        rasterSize,
      )) as { path?: string };
      const outputPath = result.path ?? destination;
      setExportPreferences({ directory, rasterSize, lastFormat: format });
      toast.style = Toast.Style.Success;
      toast.title = "导出完成";
      toast.message = outputPath;
      toast.primaryAction = {
        title: "在 Finder 中显示",
        onAction: () => showInFinder(outputPath),
      };
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "导出失败";
      toast.message = readableError(error);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Form
      isLoading={isExporting}
      navigationTitle="导出圆角图标"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="导出"
            icon={Icon.Download}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="format"
        title="格式"
        value={format}
        onChange={(value) => setFormat(value as ExportFormat)}
      >
        {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((value) => (
          <Form.Dropdown.Item
            key={value}
            value={value}
            title={FORMAT_LABELS[value]}
          />
        ))}
      </Form.Dropdown>
      <Form.FilePicker
        id="directory"
        title="位置"
        allowMultipleSelection={false}
        canChooseFiles={false}
        canChooseDirectories
        value={directories}
        onChange={setDirectories}
      />
      {isRaster ? (
        <Form.TextField
          id="size"
          title="尺寸"
          info="16–1024px"
          value={sizeText}
          error={sizeError}
          onChange={(value) => {
            setSizeText(value);
            setSizeError(undefined);
          }}
        />
      ) : null}
      <Form.Description
        text={`输出：${destinationName(source.name, format)}`}
      />
    </Form>
  );
}

function destinationName(sourceName: string, format: ExportFormat): string {
  const stem =
    basename(sourceName, extname(sourceName)).replace(/[/:]/g, "-") || "icon";
  switch (format) {
    case "png":
      return `${stem}.png`;
    case "jpg":
      return `${stem}.jpg`;
    case "ico":
      return `${stem}.ico`;
    case "icns":
      return `${stem}.icns`;
    case "iconset":
      return `${stem}.iconset`;
    case "favicon":
      return `${stem}-Favicons`;
    case "ios":
      return `${stem}-iOS-AppIcon`;
    case "android":
      return `${stem}-Android`;
  }
}

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : "未知错误";
}
