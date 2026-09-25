import AppKit
import Foundation

struct SquircleRenderer {
  static func render(
    input: NSImage,
    options rawOptions: RenderOptions,
    pixelSize: Int,
    assets: AssetResolver
  ) throws -> NSImage {
    guard (1...4096).contains(pixelSize) else {
      throw RoundedIconError.invalidOptions("输出尺寸无效。")
    }
    let options = try rawOptions.validated()
    let layers = try assets.squircleLayers(for: pixelSize)
    let canvasSize = NSSize(width: pixelSize, height: pixelSize)
    let canvas = NSImage(size: canvasSize)

    canvas.lockFocus()
    defer { canvas.unlockFocus() }
    guard let context = NSGraphicsContext.current?.cgContext else {
      throw RoundedIconError.renderingFailed
    }

    let rect = NSRect(origin: .zero, size: canvasSize)
    layers.shadow.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1)

    let drawRect = calculateDrawRect(
      inputSize: input.size,
      targetRect: rect,
      zoom: CGFloat(options.zoom),
      isCover: options.isCover,
      offsetX: CGFloat(options.offsetX) * CGFloat(pixelSize) / 1024,
      offsetY: CGFloat(options.offsetY) * CGFloat(pixelSize) / 1024
    )

    try drawWithAlphaMask(layers.mask, in: rect, context: context) {
      let background = try options.backgroundColor()
      if background.alphaComponent > 0 {
        background.setFill()
        rect.fill()
      }
      layers.back.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1)
      drawTransformed(
        image: input,
        in: drawRect,
        rotation: CGFloat(options.rotation),
        opacity: CGFloat(options.opacity),
        context: context
      )
    }

    return canvas
  }

  static func calculateDrawRect(
    inputSize: CGSize,
    targetRect: CGRect,
    zoom: CGFloat,
    isCover: Bool,
    offsetX: CGFloat,
    offsetY: CGFloat
  ) -> CGRect {
    guard inputSize.width > 0, inputSize.height > 0,
          targetRect.width > 0, targetRect.height > 0 else { return .zero }

    let targetAspect = targetRect.width / targetRect.height
    let imageAspect = inputSize.width / inputSize.height
    let width: CGFloat
    let height: CGFloat

    if isCover {
      if imageAspect > targetAspect {
        height = targetRect.height * zoom
        width = height * imageAspect
      } else {
        width = targetRect.width * zoom
        height = width / imageAspect
      }
    } else if imageAspect > targetAspect {
      width = targetRect.width * zoom
      height = width / imageAspect
    } else {
      height = targetRect.height * zoom
      width = height * imageAspect
    }

    return CGRect(
      x: targetRect.minX + (targetRect.width - width) / 2 + offsetX,
      y: targetRect.minY + (targetRect.height - height) / 2 + offsetY,
      width: width,
      height: height
    )
  }

  private static func drawWithAlphaMask(
    _ mask: NSImage,
    in rect: NSRect,
    context: CGContext,
    draw: () throws -> Void
  ) throws {
    context.saveGState()
    defer { context.restoreGState() }
    context.beginTransparencyLayer(auxiliaryInfo: nil)
    defer { context.endTransparencyLayer() }
    try draw()
    mask.draw(in: rect, from: .zero, operation: .destinationIn, fraction: 1)
  }

  private static func drawTransformed(
    image: NSImage,
    in rect: CGRect,
    rotation: CGFloat,
    opacity: CGFloat,
    context: CGContext
  ) {
    context.saveGState()
    defer { context.restoreGState() }
    if rotation != 0 {
      context.translateBy(x: rect.midX, y: rect.midY)
      context.rotate(by: rotation * .pi / 180)
      context.translateBy(x: -rect.midX, y: -rect.midY)
    }
    image.draw(
      in: rect,
      from: .zero,
      operation: .sourceOver,
      fraction: min(1, max(0, opacity)),
      respectFlipped: true,
      hints: [.interpolation: NSImageInterpolation.high]
    )
  }
}
