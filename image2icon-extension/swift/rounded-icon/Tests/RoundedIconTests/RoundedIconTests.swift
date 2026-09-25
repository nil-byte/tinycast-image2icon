import AppKit
import XCTest
@testable import rounded_icon

final class RoundedIconTests: XCTestCase {
  private var assetsURL: URL {
    var url = URL(fileURLWithPath: #filePath)
    for _ in 0..<5 { url.deleteLastPathComponent() }
    return url.appendingPathComponent("assets", isDirectory: true)
  }

  private func sourceImage(width: Int = 320, height: Int = 180) -> NSImage {
    let image = NSImage(size: NSSize(width: width, height: height))
    image.lockFocus()
    NSColor.systemBlue.setFill()
    NSRect(x: 0, y: 0, width: width, height: height).fill()
    NSColor.systemYellow.setFill()
    NSRect(x: width / 4, y: height / 4, width: width / 2, height: height / 2).fill()
    image.unlockFocus()
    return image
  }

  func testGeometryCoverContainAndOffsets() {
    let target = CGRect(x: 0, y: 0, width: 100, height: 100)
    let cover = SquircleRenderer.calculateDrawRect(
      inputSize: CGSize(width: 200, height: 100), targetRect: target,
      zoom: 1, isCover: true, offsetX: 0, offsetY: 0
    )
    XCTAssertEqual(cover, CGRect(x: -50, y: 0, width: 200, height: 100))
    let contain = SquircleRenderer.calculateDrawRect(
      inputSize: CGSize(width: 200, height: 100), targetRect: target,
      zoom: 1, isCover: false, offsetX: 4, offsetY: -3
    )
    XCTAssertEqual(contain, CGRect(x: 4, y: 22, width: 100, height: 50))
  }

  func testLuminanceMaskProducesTransparentCorners() throws {
    let rendered = try SquircleRenderer.render(
      input: sourceImage(), options: .defaults, pixelSize: 256,
      assets: AssetResolver(path: assetsURL.path)
    )
    let bitmap = try XCTUnwrap(ImageEncoder.bitmap(from: rendered, pixelSize: 256, hasAlpha: true))
    XCTAssertLessThan(bitmap.colorAt(x: 0, y: 0)?.alphaComponent ?? 1, 0.05)
    XCTAssertGreaterThan(bitmap.colorAt(x: 128, y: 128)?.alphaComponent ?? 0, 0.95)
  }

  func testLargeInputCreatesSessionPreviewCopy() throws {
    let root = FileManager.default.temporaryDirectory.appendingPathComponent("rounded-icon-preview-\(UUID().uuidString)")
    defer { try? FileManager.default.removeItem(at: root) }
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    let sourceURL = root.appendingPathComponent("large.png")
    try ImageEncoder.pngData(from: sourceImage(width: 2048, height: 2048), pixelSize: 2048).write(to: sourceURL)

    let info = try validateInput(path: sourceURL.path)
    XCTAssertEqual(info.path, sourceURL.path)
    XCTAssertNotEqual(info.previewPath, sourceURL.path)
    let previewData = try Data(contentsOf: URL(fileURLWithPath: info.previewPath))
    let previewBitmap = try XCTUnwrap(NSBitmapImageRep(data: previewData))
    XCTAssertEqual(previewBitmap.pixelsWide, 1024)
    XCTAssertEqual(previewBitmap.pixelsHigh, 1024)

    let optionsJSON = String(data: try JSONEncoder().encode(RenderOptions.defaults), encoding: .utf8)!
    let renderedPreview = try renderPreview(
      path: info.previewPath, assetsPath: assetsURL.path, optionsJSON: optionsJSON
    )
    let renderedBitmap = try XCTUnwrap(NSBitmapImageRep(data: XCTUnwrap(Data(base64Encoded: renderedPreview))))
    XCTAssertEqual(renderedBitmap.pixelsWide, 512)
    XCTAssertEqual(renderedBitmap.pixelsHigh, 512)

    let exportURL = root.appendingPathComponent("full-resolution.png")
    _ = try exportIcon(
      path: info.path, assetsPath: assetsURL.path, optionsJSON: optionsJSON,
      format: "png", destination: exportURL.path, rasterSize: 1024
    )
    let exportedBitmap = try XCTUnwrap(NSBitmapImageRep(data: Data(contentsOf: exportURL)))
    XCTAssertEqual(exportedBitmap.pixelsWide, 1024)
    XCTAssertEqual(exportedBitmap.pixelsHigh, 1024)
  }

  func testPreviewRerendersAtEachZoomWithoutReopeningInput() throws {
    let root = FileManager.default.temporaryDirectory.appendingPathComponent("rounded-icon-zoom-\(UUID().uuidString)")
    defer { try? FileManager.default.removeItem(at: root) }
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    let sourceURL = root.appendingPathComponent("source.png")
    try ImageEncoder.pngData(from: sourceImage(), pixelSize: 320).write(to: sourceURL)

    func preview(zoom: Double) throws -> String {
      let options = RenderOptions(
        zoom: zoom, offsetX: 0, offsetY: 0, rotation: 0, opacity: 1,
        isCover: true, backgroundHex: "transparent"
      )
      let json = String(data: try JSONEncoder().encode(options), encoding: .utf8)!
      return try renderPreview(path: sourceURL.path, assetsPath: assetsURL.path, optionsJSON: json)
    }
    let normal = try preview(zoom: 1)
    let increased = try preview(zoom: 1.05)
    let increasedAgain = try preview(zoom: 1.1)
    XCTAssertNotEqual(normal, increased)
    XCTAssertNotEqual(increased, increasedAgain)
    XCTAssertEqual(normal, try preview(zoom: 1))
  }

  func testPNGAndJPEGEncoding() throws {
    let rendered = try SquircleRenderer.render(
      input: sourceImage(), options: .defaults, pixelSize: 128,
      assets: AssetResolver(path: assetsURL.path)
    )
    let png = try ImageEncoder.pngData(from: rendered, pixelSize: 128)
    XCTAssertEqual(Array(png.prefix(8)), [137, 80, 78, 71, 13, 10, 26, 10])
    let jpg = try ImageEncoder.jpegData(from: rendered, pixelSize: 128)
    XCTAssertEqual(Array(jpg.prefix(2)), [255, 216])
  }

  func testAllExportSuitesAndBridge() throws {
    let root = FileManager.default.temporaryDirectory.appendingPathComponent("rounded-icon-tests-\(UUID().uuidString)")
    defer { try? FileManager.default.removeItem(at: root) }
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    let source = sourceImage()
    let sourceURL = root.appendingPathComponent("source.png")
    try ImageEncoder.pngData(from: source, pixelSize: 320).write(to: sourceURL)

    let info = try validateInput(path: sourceURL.path)
    XCTAssertEqual(info.width, 320)
    XCTAssertEqual(info.previewPath, sourceURL.path)
    let preview = try renderPreview(
      path: sourceURL.path, assetsPath: assetsURL.path,
      optionsJSON: String(data: try JSONEncoder().encode(RenderOptions.defaults), encoding: .utf8)!
    )
    XCTAssertGreaterThan(preview.count, 100)
    let previewData = try XCTUnwrap(Data(base64Encoded: preview))
    let previewBitmap = try XCTUnwrap(NSBitmapImageRep(data: previewData))
    XCTAssertEqual(previewBitmap.pixelsWide, 512)
    XCTAssertEqual(previewBitmap.pixelsHigh, 512)

    let exporter = IconExporter(input: source, options: .defaults, assets: AssetResolver(path: assetsURL.path))
    let targets: [(String, String)] = [
      ("png", "icon.png"), ("jpg", "icon.jpg"), ("ico", "icon.ico"), ("icns", "icon.icns"),
      ("iconset", "icon.iconset"), ("favicon", "Favicons"), ("ios", "iOS"), ("android", "Android"),
    ]
    for (format, name) in targets {
      let destination = root.appendingPathComponent(name)
      _ = try exporter.export(format: format, destination: destination, rasterSize: 128)
      XCTAssertTrue(FileManager.default.fileExists(atPath: destination.path), "Missing \(format)")
    }
    XCTAssertTrue(FileManager.default.fileExists(atPath: root.appendingPathComponent("icon.iconset/icon_512x512@2x.png").path))
    XCTAssertTrue(FileManager.default.fileExists(atPath: root.appendingPathComponent("Favicons/manifest.json").path))
    XCTAssertTrue(FileManager.default.fileExists(atPath: root.appendingPathComponent("iOS/AppIcon.appiconset/Contents.json").path))
    XCTAssertTrue(FileManager.default.fileExists(atPath: root.appendingPathComponent("Android/mipmap-xxxhdpi/ic_launcher.png").path))
  }
}
