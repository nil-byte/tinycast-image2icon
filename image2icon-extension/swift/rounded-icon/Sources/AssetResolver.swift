import AppKit
import Foundation

struct AssetResolver {
  let assetsDirectory: URL

  init(path: String) {
    assetsDirectory = URL(fileURLWithPath: (path as NSString).expandingTildeInPath, isDirectory: true)
  }

  func requiredImage(named name: String) throws -> NSImage {
    let filename = name.hasSuffix(".png") ? name : "\(name).png"
    let url = assetsDirectory.appendingPathComponent(filename)
    guard let image = NSImage(contentsOf: url) else {
      throw RoundedIconError.missingAsset(filename)
    }
    return image
  }

  func squircleLayers(for size: Int) throws -> (back: NSImage, mask: NSImage, shadow: NSImage) {
    let preferred = preferredAssetSize(for: size)
    let back = try imageWithFallback(prefix: "squircle_back", preferred: preferred)
    let mask = try imageWithFallback(prefix: "squircle_mask", preferred: preferred)
    let shadow = try imageWithFallback(prefix: "squircle_shadow", preferred: preferred)
    return (back, mask, shadow)
  }

  private func preferredAssetSize(for size: Int) -> Int {
    if size <= 16 { return 16 }
    if size <= 32 { return 32 }
    if size <= 64 { return 64 }
    if size <= 128 { return 128 }
    if size <= 256 { return 256 }
    if size <= 512 { return 512 }
    return 1024
  }

  private func imageWithFallback(prefix: String, preferred: Int) throws -> NSImage {
    let preferredName = "\(prefix)_\(preferred)x\(preferred).png"
    if let image = NSImage(contentsOf: assetsDirectory.appendingPathComponent(preferredName)) {
      return image
    }
    return try requiredImage(named: "\(prefix)_1024x1024.png")
  }
}
