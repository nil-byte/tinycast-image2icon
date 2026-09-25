import AppKit
import Foundation

struct IconExporter {
  let input: NSImage
  let options: RenderOptions
  let assets: AssetResolver
  private let fileManager = FileManager.default

  func export(format rawFormat: String, destination: URL, rasterSize: Int) throws -> URL {
    let format = rawFormat.lowercased()
    switch format {
    case "png":
      try writeFile(try png(size: rasterSize), to: destination)
    case "jpg", "jpeg":
      try writeFile(try jpeg(size: rasterSize), to: destination)
    case "ico":
      try writeFile(try ico(sizes: [16, 24, 32, 48, 64, 128, 256]), to: destination)
    case "iconset":
      try writeDirectory(to: destination) { temporary in try writeIconset(to: temporary) }
    case "icns":
      try writeICNS(to: destination)
    case "favicon":
      try writeDirectory(to: destination) { temporary in try writeFavicon(to: temporary) }
    case "ios":
      try writeDirectory(to: destination) { temporary in try writeIOS(to: temporary) }
    case "android":
      try writeDirectory(to: destination) { temporary in try writeAndroid(to: temporary) }
    default:
      throw RoundedIconError.invalidOptions("不支持的导出格式：\(rawFormat)")
    }
    return destination
  }

  func png(size: Int) throws -> Data {
    let rendered = try render(size: size)
    return try ImageEncoder.pngData(from: rendered, pixelSize: size)
  }

  private func jpeg(size: Int) throws -> Data {
    let rendered = try render(size: size)
    return try ImageEncoder.jpegData(from: rendered, pixelSize: size, quality: 0.95)
  }

  private func render(size: Int) throws -> NSImage {
    try SquircleRenderer.render(input: input, options: options, pixelSize: size, assets: assets)
  }

  private func ico(sizes: [Int]) throws -> Data {
    let chunks = try sizes.map { (size: $0, data: try png(size: $0)) }
    return try ICOEncoder.encodePNGChunks(chunks)
  }

  private func writeIconset(to directory: URL) throws {
    let files: [(String, Int)] = [
      ("icon_16x16.png", 16), ("icon_16x16@2x.png", 32),
      ("icon_32x32.png", 32), ("icon_32x32@2x.png", 64),
      ("icon_128x128.png", 128), ("icon_128x128@2x.png", 256),
      ("icon_256x256.png", 256), ("icon_256x256@2x.png", 512),
      ("icon_512x512.png", 512), ("icon_512x512@2x.png", 1024),
    ]
    try writePNGs(files, to: directory)
    try validate(directory: directory, expected: files.map(\.0))
  }

  private func writeICNS(to destination: URL) throws {
    let temporaryRoot = fileManager.temporaryDirectory.appendingPathComponent("tinycast-icns-\(UUID().uuidString)", isDirectory: true)
    let iconset = temporaryRoot.appendingPathComponent("icon.iconset", isDirectory: true)
    let output = temporaryRoot.appendingPathComponent("icon.icns")
    defer { try? fileManager.removeItem(at: temporaryRoot) }
    try fileManager.createDirectory(at: temporaryRoot, withIntermediateDirectories: true)
    try writeIconset(to: iconset)

    let process = Process()
    let errorPipe = Pipe()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/iconutil")
    process.arguments = ["-c", "icns", "-o", output.path, iconset.path]
    process.standardError = errorPipe
    try process.run()
    process.waitUntilExit()
    guard process.terminationStatus == 0, fileManager.fileExists(atPath: output.path) else {
      let data = errorPipe.fileHandleForReading.readDataToEndOfFile()
      let message = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
      throw RoundedIconError.externalToolFailed(message?.isEmpty == false ? message! : "iconutil 返回代码 \(process.terminationStatus)")
    }
    try writeFile(Data(contentsOf: output), to: destination)
  }

  private func writeFavicon(to directory: URL) throws {
    try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
    try ico(sizes: [16, 32, 48]).write(to: directory.appendingPathComponent("favicon.ico"), options: .atomic)
    let files: [(String, Int)] = [
      ("favicon-16.png", 16), ("favicon-32.png", 32), ("favicon-48.png", 48),
      ("favicon-96.png", 96), ("favicon-144.png", 144), ("apple-touch-icon.png", 180),
      ("icon-192.png", 192), ("icon-512.png", 512),
    ]
    try writePNGs(files, to: directory)
    let manifest: [String: Any] = [
      "name": "App Icon", "short_name": "App", "display": "standalone",
      "icons": [
        ["src": "icon-192.png", "sizes": "192x192", "type": "image/png"],
        ["src": "icon-512.png", "sizes": "512x512", "type": "image/png"],
      ],
    ]
    try JSONSerialization.data(withJSONObject: manifest, options: [.prettyPrinted, .sortedKeys])
      .write(to: directory.appendingPathComponent("manifest.json"), options: .atomic)
    let html = """
    <!doctype html><html><head><meta charset="utf-8">
    <link rel="icon" href="favicon.ico" sizes="any">
    <link rel="icon" type="image/png" href="favicon-32.png" sizes="32x32">
    <link rel="apple-touch-icon" href="apple-touch-icon.png" sizes="180x180">
    <link rel="manifest" href="manifest.json"><title>App Icon</title></head><body></body></html>
    """
    try Data(html.utf8).write(to: directory.appendingPathComponent("index.html"), options: .atomic)
    try validate(directory: directory, expected: ["favicon.ico", "manifest.json", "index.html"] + files.map(\.0))
  }

  private func writeIOS(to root: URL) throws {
    let directory = root.appendingPathComponent("AppIcon.appiconset", isDirectory: true)
    try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
    let contentsSource = assets.assetsDirectory.appendingPathComponent("Contents.json")
    guard fileManager.fileExists(atPath: contentsSource.path) else { throw RoundedIconError.missingAsset("Contents.json") }
    try fileManager.copyItem(at: contentsSource, to: directory.appendingPathComponent("Contents.json"))
    let files: [(String, Int)] = [
      ("icon-1024.png", 1024), ("Icon-20.png", 20), ("Icon-20@2x.png", 40), ("Icon-20@3x.png", 60),
      ("Icon-29.png", 29), ("Icon-29@2x.png", 58), ("Icon-29@3x.png", 87),
      ("Icon-40.png", 40), ("Icon-40@2x.png", 80), ("Icon-40@3x.png", 120),
      ("Icon-60@2x.png", 120), ("Icon-60@3x.png", 180), ("Icon-76.png", 76),
      ("Icon-76@2x.png", 152), ("Icon-83.5@2x.png", 167),
    ]
    try writePNGs(files, to: directory)
    try validate(directory: directory, expected: ["Contents.json"] + files.map(\.0))
  }

  private func writeAndroid(to directory: URL) throws {
    try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
    let folders: [(String, Int)] = [
      ("mipmap-mdpi", 48), ("mipmap-hdpi", 72), ("mipmap-xhdpi", 96),
      ("mipmap-xxhdpi", 144), ("mipmap-xxxhdpi", 192),
    ]
    var expected = ["ic_launcher-web.png"]
    for (folder, size) in folders {
      let target = directory.appendingPathComponent(folder, isDirectory: true)
      try fileManager.createDirectory(at: target, withIntermediateDirectories: true)
      try png(size: size).write(to: target.appendingPathComponent("ic_launcher.png"), options: .atomic)
      expected.append("\(folder)/ic_launcher.png")
    }
    try png(size: 512).write(to: directory.appendingPathComponent("ic_launcher-web.png"), options: .atomic)
    try validate(directory: directory, expected: expected)
  }

  private func writePNGs(_ files: [(String, Int)], to directory: URL) throws {
    try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
    var cache: [Int: Data] = [:]
    for (name, size) in files {
      let data = try cache[size] ?? png(size: size)
      cache[size] = data
      try data.write(to: directory.appendingPathComponent(name), options: .atomic)
    }
  }

  private func validate(directory: URL, expected: [String]) throws {
    for relative in expected {
      let url = directory.appendingPathComponent(relative)
      guard fileManager.fileExists(atPath: url.path),
            let attributes = try? fileManager.attributesOfItem(atPath: url.path),
            (attributes[.size] as? NSNumber)?.intValue ?? 0 > 0 else {
        throw RoundedIconError.encodingFailed(relative)
      }
    }
  }

  private func writeFile(_ data: Data, to destination: URL) throws {
    do {
      try fileManager.createDirectory(at: destination.deletingLastPathComponent(), withIntermediateDirectories: true)
      try data.write(to: destination, options: .atomic)
    } catch {
      throw RoundedIconError.destinationNotWritable(destination.path)
    }
  }

  private func writeDirectory(to destination: URL, build: (URL) throws -> Void) throws {
    let parent = destination.deletingLastPathComponent()
    let staging = parent.appendingPathComponent(".\(destination.lastPathComponent).tmp-\(UUID().uuidString)", isDirectory: true)
    let backup = parent.appendingPathComponent(".\(destination.lastPathComponent).backup-\(UUID().uuidString)", isDirectory: true)
    try fileManager.createDirectory(at: parent, withIntermediateDirectories: true)
    defer {
      try? fileManager.removeItem(at: staging)
      try? fileManager.removeItem(at: backup)
    }
    do {
      try build(staging)
      if fileManager.fileExists(atPath: destination.path) {
        try fileManager.moveItem(at: destination, to: backup)
      }
      do {
        try fileManager.moveItem(at: staging, to: destination)
        try? fileManager.removeItem(at: backup)
      } catch {
        if fileManager.fileExists(atPath: backup.path) {
          try? fileManager.moveItem(at: backup, to: destination)
        }
        throw error
      }
    } catch let error as RoundedIconError {
      throw error
    } catch {
      throw RoundedIconError.destinationNotWritable(destination.path)
    }
  }
}
