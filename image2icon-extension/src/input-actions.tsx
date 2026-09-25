import {
  Action,
  ActionPanel,
  Form,
  Icon,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useState } from "react";

type InputActionsProps = {
  loadFinder: () => Promise<boolean>;
  loadClipboard: () => Promise<boolean>;
  loadPath: (path: string) => Promise<boolean>;
};

export function InputActions({
  loadFinder,
  loadClipboard,
  loadPath,
}: InputActionsProps) {
  return (
    <ActionPanel.Section title="导入图片">
      <Action
        title="使用 Finder 所选图片"
        icon={Icon.Finder}
        onAction={loadFinder}
      />
      <Action.Push
        title="选择图片…"
        icon={Icon.Folder}
        shortcut={Keyboard.Shortcut.Common.Open}
        target={<FilePickerView loadPath={loadPath} />}
      />
      <Action
        title="从剪贴板导入"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
        onAction={loadClipboard}
      />
    </ActionPanel.Section>
  );
}

function FilePickerView({
  loadPath,
}: {
  loadPath: (path: string) => Promise<boolean>;
}) {
  const [files, setFiles] = useState<string[]>([]);
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="选择图片"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="使用这张图片"
            icon={Icon.CheckCircle}
            onSubmit={async () => {
              const path = files[0];
              if (!path) return;
              if (await loadPath(path)) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="image"
        title="图片"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={files}
        onChange={setFiles}
      />
      <Form.Description text="支持 macOS 可读取的 PNG、JPEG、HEIC、TIFF 和其他图片格式。" />
    </Form>
  );
}
