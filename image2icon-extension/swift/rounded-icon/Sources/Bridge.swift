import AppKit
import Foundation
import ImageIO
import RaycastSwiftMacros
import UniformTypeIdentifiers

struct InputInfo: Encodable {
  let path: String
  let previewPath: String
  let name: String
  let width: Int
  let height: Int
}

@raycast
func validateInput(path: String) throws -> InputInfo {
  if path == "__clipboard__" {
    return try readClipboardImage()
  }
  let url = URL(fileURLWithPath: (path as NSString).expandingTildeInPath)
  var isDirectory: ObjCBool = false
  guard FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory), !isDirectory.boolValue else {
    throw RoundedIconError.inputNotFound
  }
  guard let image = NSImage(contentsOf: url) else {
    throw RoundedIconError.unsupportedImage
  }
  var proposed = NSRect(origin: .zero, size: image.size)
  guard let cgImage = image.cgImage(forProposedRect: &proposed, context: nil, hints: nil) else {
    throw RoundedIconError.unsupportedImage
  }
  let standardizedURL = url.standardizedFileURL
  return InputInfo(
    path: standardizedURL.path,
    previewPath: makePreviewCopyIfNeeded(sourceURL: standardizedURL, width: cgImage.width, height: cgImage.height).path,
    name: url.lastPathComponent,
    width: cgImage.width,
    height: cgImage.height
  )
}

private func readClipboardImage() throws -> InputInfo {
  let pasteboard = NSPasteboard.general
  guard let images = pasteboard.readObjects(forClasses: [NSImage.self]), let image = images.first as? NSImage else {
    throw RoundedIconError.unsupportedImage
  }
  var proposed = NSRect(origin: .zero, size: image.size)
  guard let cgImage = image.cgImage(forProposedRect: &proposed, context: nil, hints: nil) else {
    throw RoundedIconError.unsupportedImage
  }

  let directory = FileManager.default.temporaryDirectory.appendingPathComponent("image2icon", isDirectory: true)
  try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
  let url = directory.appendingPathComponent("clipboard-\(UUID().uuidString).png")
  let representation = NSBitmapImageRep(cgImage: cgImage)
  guard let pngData = representation.representation(using: .png, properties: [:]) else {
    throw RoundedIconError.encodingFailed("PNG")
  }
  try pngData.write(to: url, options: .atomic)
  let previewURL = makePreviewCopyIfNeeded(sourceURL: url, width: cgImage.width, height: cgImage.height)
  return InputInfo(
    path: url.path,
    previewPath: previewURL.path,
    name: "剪贴板图片.png",
    width: cgImage.width,
    height: cgImage.height
  )
}

private func makePreviewCopyIfNeeded(sourceURL: URL, width: Int, height: Int) -> URL {
  guard max(width, height) > 1024,
        let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil) else {
    return sourceURL
  }
  let options: [CFString: Any] = [
    kCGImageSourceCreateThumbnailFromImageAlways: true,
    kCGImageSourceCreateThumbnailWithTransform: true,
    kCGImageSourceThumbnailMaxPixelSize: 1024,
  ]
  guard let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
    return sourceURL
  }

  do {
    let directory = FileManager.default.temporaryDirectory
      .appendingPathComponent("image2icon/previews", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    let destinationURL = directory.appendingPathComponent("preview-\(UUID().uuidString).png")
    guard let destination = CGImageDestinationCreateWithURL(
      destinationURL as CFURL,
      UTType.png.identifier as CFString,
      1,
      nil
    ) else { return sourceURL }
    CGImageDestinationAddImage(destination, thumbnail, nil)
    guard CGImageDestinationFinalize(destination) else { return sourceURL }
    return destinationURL
  } catch {
    return sourceURL
  }
}
