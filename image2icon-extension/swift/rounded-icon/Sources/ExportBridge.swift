import AppKit
import Foundation
import RaycastSwiftMacros

struct ExportResult: Encodable {
  let path: String
  let format: String
}

@raycast
func exportIcon(
  path: String,
  assetsPath: String,
  optionsJSON: String,
  format: String,
  destination: String,
  rasterSize: Int
) throws -> ExportResult {
  guard let input = NSImage(contentsOfFile: (path as NSString).expandingTildeInPath) else {
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
  guard (16...1024).contains(rasterSize) else {
    throw RoundedIconError.invalidOptions("导出尺寸必须在 16px 到 1024px 之间。")
  }
  let destinationURL = URL(fileURLWithPath: (destination as NSString).expandingTildeInPath)
  let exporter = IconExporter(input: input, options: options, assets: AssetResolver(path: assetsPath))
  let output = try exporter.export(format: format, destination: destinationURL, rasterSize: rasterSize)
  return ExportResult(path: output.path, format: format.lowercased())
}
