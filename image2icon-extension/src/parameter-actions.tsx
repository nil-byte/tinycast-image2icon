import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { Dispatch, SetStateAction, useState } from "react";
import {
  Adjustments,
  DEFAULT_ADJUSTMENTS,
  NumericParameterId,
  ParameterId,
  formatParameterValue,
  normalizeHexColor,
  numericInputHint,
  numericInputValue,
  parameterTitle,
  parseNumericParameter,
  resetParameter,
  stepParameter,
} from "./model";
import { ExportActions } from "./export-ui";
import { InputActions } from "./input-actions";
import { PARAMETER_SHORTCUTS } from "./parameter-shortcuts";
import { ExportPreferences } from "./model";
import { SourceImage } from "./source";

type InputLoaders = {
  loadFinder: () => Promise<boolean>;
  loadClipboard: () => Promise<boolean>;
  loadPath: (path: string) => Promise<boolean>;
};

type Props = {
  id: ParameterId;
  adjustments: Adjustments;
  setAdjustments: Dispatch<SetStateAction<Adjustments>>;
  inputs: InputLoaders;
  source: SourceImage;
  exportPreferences: ExportPreferences;
  setExportPreferences: (value: ExportPreferences) => void;
  refreshInspiration: () => Promise<void>;
};

export function ParameterActions({
  id,
  adjustments,
  setAdjustments,
  inputs,
  source,
  exportPreferences,
  setExportPreferences,
  refreshInspiration,
}: Props) {
  const isNumeric = !["isCover", "backgroundHex"].includes(id);
  return (
    <ActionPanel>
      <ActionPanel.Section title={parameterTitle(id)}>
        {isNumeric ? (
          <>
            <Action.Push
              title="精确输入…"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={
                <NumericInputForm
                  id={id as NumericParameterId}
                  adjustments={adjustments}
                  setAdjustments={setAdjustments}
                />
              }
            />
            <Action
              title="减少"
              icon={Icon.Minus}
              shortcut={PARAMETER_SHORTCUTS.decrease}
              onAction={() =>
                setAdjustments((current) =>
                  stepParameter(current, id as NumericParameterId, -1),
                )
              }
            />
            <Action
              title="重置此项"
              icon={Icon.ArrowCounterClockwise}
              shortcut={PARAMETER_SHORTCUTS.reset}
              onAction={() =>
                setAdjustments((current) => resetParameter(current, id))
              }
            />
            <Action
              title="增加"
              icon={Icon.Plus}
              shortcut={PARAMETER_SHORTCUTS.increase}
              onAction={() =>
                setAdjustments((current) =>
                  stepParameter(current, id as NumericParameterId, 1),
                )
              }
            />
          </>
        ) : id === "isCover" ? (
          <>
            <Action
              title={adjustments.isCover ? "改为完整显示" : "改为充满画布"}
              icon={Icon.Switch}
              onAction={() =>
                setAdjustments((current) => ({
                  ...current,
                  isCover: !current.isCover,
                }))
              }
            />
          </>
        ) : (
          <>
            <Action.Push
              title="编辑背景…"
              icon={Icon.Swatch}
              target={
                <BackgroundForm
                  adjustments={adjustments}
                  setAdjustments={setAdjustments}
                />
              }
            />
            <Action
              title="设为透明"
              icon={Icon.Swatch}
              onAction={() =>
                setAdjustments((current) => ({
                  ...current,
                  backgroundHex: "transparent",
                }))
              }
            />
          </>
        )}
        {!isNumeric ? (
          <Action
            title="重置此项"
            icon={Icon.ArrowCounterClockwise}
            shortcut={PARAMETER_SHORTCUTS.reset}
            onAction={() =>
              setAdjustments((current) => resetParameter(current, id))
            }
          />
        ) : null}
        <Action
          title="全部重置"
          icon={Icon.RotateAntiClockwise}
          onAction={() => setAdjustments({ ...DEFAULT_ADJUSTMENTS })}
        />
      </ActionPanel.Section>
      <ExportActions
        source={source}
        adjustments={adjustments}
        exportPreferences={exportPreferences}
        setExportPreferences={setExportPreferences}
      />
      <InputActions {...inputs} />
      <ActionPanel.Section title="每日灵感">
        <Action
          title="换一句"
          icon={Icon.Stars}
          onAction={refreshInspiration}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function NumericInputForm({
  id,
  adjustments,
  setAdjustments,
}: {
  id: NumericParameterId;
  adjustments: Adjustments;
  setAdjustments: Dispatch<SetStateAction<Adjustments>>;
}) {
  const [value, setValue] = useState(numericInputValue(id, adjustments));
  const [error, setError] = useState<string | undefined>();
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={parameterTitle(id)}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="应用"
            onSubmit={() => {
              const parsed = parseNumericParameter(id, value);
              if (parsed === null) {
                setError(`请输入 ${numericInputHint(id)} 范围内的数值`);
                void showToast({
                  style: Toast.Style.Failure,
                  title: "数值无效",
                });
                return;
              }
              setAdjustments((current) => ({ ...current, [id]: parsed }));
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="value"
        title={parameterTitle(id)}
        info={numericInputHint(id)}
        value={value}
        error={error}
        onChange={(next) => {
          setValue(next);
          setError(undefined);
        }}
      />
      <Form.Description
        text={`当前：${formatParameterValue(id, adjustments)}`}
      />
    </Form>
  );
}

function BackgroundForm({
  adjustments,
  setAdjustments,
}: {
  adjustments: Adjustments;
  setAdjustments: Dispatch<SetStateAction<Adjustments>>;
}) {
  const [value, setValue] = useState(adjustments.backgroundHex);
  const [error, setError] = useState<string | undefined>();
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="背景"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="应用背景"
            onSubmit={() => {
              const normalized = normalizeHexColor(value);
              if (!normalized) {
                setError("请输入 #RRGGBB、#RRGGBBAA 或 transparent");
                return;
              }
              setAdjustments((current) => ({
                ...current,
                backgroundHex: normalized,
              }));
              pop();
            }}
          />
          <Action
            title="设为透明"
            onAction={() => {
              setAdjustments((current) => ({
                ...current,
                backgroundHex: "transparent",
              }));
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="color"
        title="颜色"
        placeholder="#FFFFFF 或 transparent"
        value={value}
        error={error}
        onChange={(next) => {
          setValue(next);
          setError(undefined);
        }}
      />
      <Form.Description text="可输入 6 位 RGB、8 位 RGBA 十六进制颜色，或 transparent。" />
    </Form>
  );
}
