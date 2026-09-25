import AppKit
import Foundation
import RaycastSwiftMacros

// Tinycast 0.11.3 can stall while collecting an exited asynchronous process.
// Publish a complete response independently of process termination notification.
@raycast
func renderPreviewToFile(path: String, assetsPath: String, optionsJSON: String, resultPath: String) throws -> String {
  let payload: [String: String]
  do {
    payload = ["base64": try renderPreview(path: path, assetsPath: assetsPath, optionsJSON: optionsJSON)]
  } catch {
    payload = ["error": error.localizedDescription]
  }
  let data = try JSONSerialization.data(withJSONObject: payload)
  try data.write(to: URL(fileURLWithPath: resultPath), options: .atomic)
  return "ok"
}

@raycast
func renderPreview(path: String, assetsPath: String, optionsJSON: String) throws -> String {
  let inputURL = URL(fileURLWithPath: (path as NSString).expandingTildeInPath)
  guard let input = NSImage(contentsOf: inputURL) else {
    throw RoundedIconError.unsupportedImage
  }
  guard let optionsData = optionsJSON.data(using: .utf8) else {
    throw RoundedIconError.invalidOptions("参数编码无效。")
  }
  let options: RenderOptions
  do {
    options = try JSONDecoder().decode(RenderOptions.self, from: optionsData)
  } catch {
    throw RoundedIconError.invalidOptions("参数编码无效。")
  }
  let rendered = try SquircleRenderer.render(
    input: input,
    options: options,
    pixelSize: 512,
    assets: AssetResolver(path: assetsPath)
  )
  return try ImageEncoder.pngData(from: rendered, pixelSize: 512).base64EncodedString()
}
