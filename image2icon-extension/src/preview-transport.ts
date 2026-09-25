import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Do not await execFile/process exit here: Tinycast 0.11.3 can hang in
// NSConcreteTask.waitUntilExit after the helper has already exited.
export async function renderPreviewFile(
  sourcePath: string,
  assetsPath: string,
  optionsJSON: string,
): Promise<string> {
  const directory = mkdtempSync(join(tmpdir(), "rounded-preview-job-"));
  const resultPath = join(directory, "result.json");
  try {
    const child = spawn(
      join(assetsPath, "compiled_raycast_swift", "rounded-icon"),
      [
        "renderPreviewToFile",
        ...[sourcePath, assetsPath, optionsJSON, resultPath].map((value) =>
          JSON.stringify(value),
        ),
      ],
      { detached: true, stdio: "ignore" },
    );
    let launchError: Error | undefined;
    child.on("error", (error: Error) => {
      launchError = error;
    });
    child.unref?.();
    const deadline = Date.now() + 5000;
    while (!existsSync(resultPath)) {
      if (launchError) throw launchError;
      if (Date.now() >= deadline) throw new Error("预览生成超时，请重试");
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
    }
    const response = JSON.parse(readFileSync(resultPath, "utf8")) as {
      base64?: string;
      error?: string;
    };
    if (response.error) throw new Error(response.error);
    if (
      typeof response.base64 !== "string" ||
      !response.base64.startsWith("iVBORw0KGgo")
    ) {
      throw new Error("预览结果无效");
    }
    return response.base64;
  } finally {
    // A timed-out helper cannot recreate this directory with an atomic file write.
    rmSync(directory, { recursive: true, force: true });
  }
}
