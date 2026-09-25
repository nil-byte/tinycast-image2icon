import AppKit
import Foundation
import RaycastSwiftMacros

@raycast
func copyPNG(path: String, assetsPath: String, optionsJSON: String) throws -> Bool {
  guard let input = NSImage(contentsOfFile: (path as NSString).expandingTildeInPath) else {
    throw RoundedIconError.unsupportedImage
  }
  guard let data = optionsJSON.data(using: .utf8),
        let options = try? JSONDecoder().decode(RenderOptions.self, from: data) else {
    throw RoundedIconError.invalidOptions("参数编码无效。")
  }
  let rendered = try SquircleRenderer.render(
    input: input,
    options: options,
    pixelSize: 1024,
    assets: AssetResolver(path: assetsPath)
  )
  let png = try ImageEncoder.pngData(from: rendered, pixelSize: 1024)
  guard let image = NSImage(data: png) else { throw RoundedIconError.encodingFailed("PNG") }
  let pasteboard = NSPasteboard.general
  pasteboard.clearContents()
  return pasteboard.writeObjects([image])
}
