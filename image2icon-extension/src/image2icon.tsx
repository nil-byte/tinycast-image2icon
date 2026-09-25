import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { ExportActions } from "./export-ui";
import { InputActions } from "./input-actions";
import { markdownForInspiration } from "./inspiration";
import { ParameterId, formatParameterValue, parameterTitle } from "./model";
import { ParameterActions } from "./parameter-actions";
import { useInspiration } from "./use-inspiration";
import { usePreview } from "./use-preview";
import { useSettings } from "./use-settings";
import { useSourceImage } from "./use-source-image";

const COMPOSITION_PARAMETERS: ParameterId[] = [
  "zoom",
  "offsetX",
  "offsetY",
  "rotation",
];
const APPEARANCE_PARAMETERS: ParameterId[] = [
  "opacity",
  "isCover",
  "backgroundHex",
];

const PARAMETER_ICONS: Record<ParameterId, Icon> = {
  zoom: Icon.ArrowsExpand,
  offsetX: Icon.AlignCentre,
  offsetY: Icon.Move,
  rotation: Icon.RotateClockwise,
  opacity: Icon.Contrast,
  isCover: Icon.Crop,
  backgroundHex: Icon.Swatch,
};

export default function RoundedIconCommand() {
  const input = useSourceImage();
  const settings = useSettings();
  const [selectedItemId, setSelectedItemId] = useState("source");
  const daily = useInspiration();
  const preview = usePreview(
    input.source,
    settings.adjustments,
    settings.setAdjustments,
  );
  const inputLoaders = {
    loadFinder: input.loadFinder,
    loadClipboard: input.loadClipboard,
    loadPath: input.loadPath,
  };

  if (!input.source) {
    return (
      <List isLoading={input.isLoading || !settings.isLoaded}>
        <List.EmptyView
          icon={Icon.Image}
          title="选择一张图片"
          description="先在 Finder 选中图片，或从文件与剪贴板导入"
          actions={
            <ActionPanel>
              <InputActions {...inputLoaders} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const source = input.source;
  const detail = (
    <List.Item.Detail
      markdown={previewMarkdown(
        preview.dataURL,
        preview.error,
        preview.isLoading,
        markdownForInspiration(daily.inspiration),
      )}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="原图"
            text={`${source.width} × ${source.height}`}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="缩放"
            text={formatParameterValue("zoom", settings.adjustments)}
          />
          <List.Item.Detail.Metadata.Label
            title="位置"
            text={`${formatParameterValue("offsetX", settings.adjustments)}, ${formatParameterValue("offsetY", settings.adjustments)}`}
          />
          <List.Item.Detail.Metadata.Label
            title="旋转"
            text={formatParameterValue("rotation", settings.adjustments)}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="不透明度"
            text={formatParameterValue("opacity", settings.adjustments)}
          />
          <List.Item.Detail.Metadata.Label
            title="填充"
            text={formatParameterValue("isCover", settings.adjustments)}
          />
          <List.Item.Detail.Metadata.Label
            title="背景"
            text={formatParameterValue("backgroundHex", settings.adjustments)}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );

  const parameterItem = (id: ParameterId) => (
    <List.Item
      id={id}
      key={id}
      icon={PARAMETER_ICONS[id]}
      title={parameterTitle(id)}
      accessories={[{ text: formatParameterValue(id, settings.adjustments) }]}
      detail={selectedItemId === id ? detail : undefined}
      actions={
        <ParameterActions
          id={id}
          adjustments={settings.adjustments}
          setAdjustments={preview.setAdjustments}
          inputs={inputLoaders}
          source={source}
          exportPreferences={settings.exportPreferences}
          setExportPreferences={settings.setExportPreferences}
          refreshInspiration={daily.refresh}
        />
      }
    />
  );

  return (
    <List
      isShowingDetail
      isLoading={input.isLoading || !settings.isLoaded}
      searchBarPlaceholder="调整圆角图标…"
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => {
        if (id) setSelectedItemId(id);
      }}
    >
      <List.Section title="图像">
        <List.Item
          id="source"
          icon={{ source: source.path }}
          title={source.name}
          detail={selectedItemId === "source" ? detail : undefined}
          actions={
            <ActionPanel>
              <ExportActions
                source={source}
                adjustments={settings.adjustments}
                exportPreferences={settings.exportPreferences}
                setExportPreferences={settings.setExportPreferences}
              />
              <InputActions {...inputLoaders} />
              <ActionPanel.Section title="每日灵感">
                <Action
                  title="换一句"
                  icon={Icon.Stars}
                  onAction={daily.refresh}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="构图">
        {COMPOSITION_PARAMETERS.map(parameterItem)}
      </List.Section>
      <List.Section title="外观">
        {APPEARANCE_PARAMETERS.map(parameterItem)}
      </List.Section>
    </List>
  );
}

function previewMarkdown(
  dataURL: string | null,
  error: string | null,
  isLoading: boolean,
  inspirationMarkdown: string,
): string {
  if (dataURL) {
    const notice = error
      ? "\n\n预览暂未更新，已保留上次结果。请重试调整。"
      : "";
    return `![圆角图标预览](${dataURL})\n\n${inspirationMarkdown}${notice}`;
  }
  if (error) return `### 无法生成预览\n\n${error}`;
  return isLoading ? "正在生成预览…" : "等待预览";
}
