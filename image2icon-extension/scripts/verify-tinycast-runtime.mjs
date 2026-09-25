// Integration probe using the installed Tinycast runtime, not a mocked React renderer.
// Usage: node scripts/verify-tinycast-runtime.mjs <upstream test.mjs> <source image>
// The upstream harness is from https://github.com/abue-ammar/tinycast.
// This tests JS/tree delivery and real Swift rendering, NOT native SwiftUI display.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const [harnessPath, sourcePath] = process.argv.slice(2);
assert(harnessPath && sourcePath, "Pass the upstream test.mjs path and a source image");
const runtimePath = "/Applications/Tinycast.app/Contents/Resources/RaycastRuntime.generated.js";
const bundle = join(homedir(), ".config/raycast/extensions/image2icon");
const scratch = mkdtempSync(join(tmpdir(), "rounded-runtime-test-"));
let harness;
try {
  const original = readFileSync(harnessPath, "utf8");
  const start = original.indexOf("const runtimePath =");
  const end = original.indexOf("const runtime =", start);
  assert(start >= 0 && end > start, "Upstream harness layout changed; inspect before adapting");
  const adapted = `${original.slice(0, start)}const runtimePath = ${JSON.stringify(runtimePath)};\n${original.slice(end)}`;
  const adapterPath = join(scratch, "harness.mjs");
  writeFileSync(adapterPath, adapted);
  const { createHarness, bootConfig } = await import(pathToFileURL(adapterPath).href);
  harness = createHarness({
    stubs: {
      "system.selectedFinderItems": () => [{ path: resolve(sourcePath) }],
      "fetch.request": () => { throw new Error("offline integration test"); },
      "storage.get": () => null,
      "storage.set": () => null,
    },
  });
  const config = bootConfig();
  config.environment.assetsPath = join(bundle, "assets");
  harness.boot(config);
  harness.start("test", readFileSync(join(bundle, "image2icon.js"), "utf8"), join(bundle, "image2icon.js"), bundle, "view", config);
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  function nodes(value, result = []) {
    if (!value || typeof value !== "object") return result;
    if (value.type) result.push(value);
    for (const child of Object.values(value)) if (typeof child === "object") nodes(child, result);
    return result;
  }
  const tree = () => harness.state.trees.at(-1);
  const zoomRow = () => nodes(tree()).find((node) => node.type === "List.Item" && node.props.id === "zoom");
  await wait(2000);
  const list = nodes(tree()).find((node) => node.type === "List");
  assert(list?.props.onSelectionChange, JSON.stringify(harness.state.failures));
  harness.dispatch("test", list.props.onSelectionChange.$fn, ["zoom"]);
  await wait(150);
  const hashes = new Map();
  function check(percent) {
    assert.equal(zoomRow().props.accessories[0].text, `${percent}%`);
    assert.deepEqual(harness.state.failures, []);
    const details = nodes(tree()).filter((node) => node.type === "List.Item.Detail");
    assert.equal(details.length, 1, "Only the selected row should carry the preview");
    const markdown = details[0].props.markdown;
    assert(markdown.startsWith("![圆角图标预览](data:image/png;base64,"));
    const hash = createHash("sha256").update(markdown).digest("hex");
    if (hashes.has(percent)) assert.equal(hash, hashes.get(percent), "Same zoom must restore the same image");
    else {
      assert(![...hashes.values()].includes(hash), "Different zoom must change the image");
      hashes.set(percent, hash);
    }
    return hash.slice(0, 12);
  }
  console.log({ percent: 100, hash: check(100) });
  for (const [index, percent] of [125, 150, 175, 150, 125, 100].entries()) {
    const before = harness.state.trees.length;
    for (let step = 0; step < 5; step++) {
      const action = nodes(zoomRow()).find((node) => node.type === "Action" && node.props.title === (index < 3 ? "增加" : "减少"));
      assert(action);
      harness.dispatch("test", action.props.onAction.$fn);
      await wait(50);
    }
    await wait(1200);
    console.log({ percent, hash: check(percent), commits: harness.state.trees.length - before });
  }
  console.log("PASS: six bursts separated by pauses; values and rendered images agree. Native UI still requires verification.");
} finally {
  harness?.stop("test");
  rmSync(scratch, { recursive: true, force: true });
}
