import AppKit
import Foundation

struct ImageEncoder {
  static func pngData(from image: NSImage, pixelSize: Int) throws -> Data {
    guard let representation = bitmap(from: image, pixelSize: pixelSize, hasAlpha: true),
          let data = representation.representation(using: .png, properties: [:]) else {
      throw RoundedIconError.encodingFailed("PNG")
    }
    return data
  }

  static func jpegData(from image: NSImage, pixelSize: Int, quality: CGFloat = 0.9) throws -> Data {
    guard pixelSize > 0 else { throw RoundedIconError.encodingFailed("JPG") }
    let flattened = NSImage(size: NSSize(width: pixelSize, height: pixelSize))
    flattened.lockFocus()
    NSColor.white.setFill()
    NSRect(x: 0, y: 0, width: pixelSize, height: pixelSize).fill()
    image.draw(
      in: NSRect(x: 0, y: 0, width: pixelSize, height: pixelSize),
      from: .zero,
      operation: .sourceOver,
      fraction: 1
    )
    flattened.unlockFocus()
    guard let tiff = flattened.tiffRepresentation,
          let representation = NSBitmapImageRep(data: tiff),
          let data = representation.representation(
            using: .jpeg,
            properties: [.compressionFactor: min(1, max(0, quality))]
          ) else {
      throw RoundedIconError.encodingFailed("JPG")
    }
    return data
  }

  static func bitmap(from image: NSImage, pixelSize: Int, hasAlpha: Bool) -> NSBitmapImageRep? {
    guard pixelSize > 0,
          let representation = NSBitmapImageRep(
            bitmapDataPlanes: nil,
            pixelsWide: pixelSize,
            pixelsHigh: pixelSize,
            bitsPerSample: 8,
            samplesPerPixel: hasAlpha ? 4 : 3,
            hasAlpha: hasAlpha,
            isPlanar: false,
            colorSpaceName: .deviceRGB,
            bytesPerRow: 0,
            bitsPerPixel: hasAlpha ? 32 : 24
          ),
          let context = NSGraphicsContext(bitmapImageRep: representation) else { return nil }

    NSGraphicsContext.saveGraphicsState()
    defer { NSGraphicsContext.restoreGraphicsState() }
    NSGraphicsContext.current = context
    context.imageInterpolation = NSImageInterpolation.high
    let rect = NSRect(x: 0, y: 0, width: pixelSize, height: pixelSize)
    if !hasAlpha {
      NSColor.white.setFill()
      rect.fill()
    } else {
      context.cgContext.clear(rect)
    }
    image.draw(
      in: rect,
      from: .zero,
      operation: .sourceOver,
      fraction: 1,
      respectFlipped: true,
      hints: [.interpolation: NSImageInterpolation.high]
    )
    context.flushGraphics()
    return representation
  }
}
