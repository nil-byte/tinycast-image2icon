import AppKit
import Foundation

struct RenderOptions: Codable {
  let zoom: Double
  let offsetX: Double
  let offsetY: Double
  let rotation: Double
  let opacity: Double
  let isCover: Bool
  let backgroundHex: String

  static let defaults = RenderOptions(
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    opacity: 1,
    isCover: true,
    backgroundHex: "transparent"
  )

  func validated() throws -> RenderOptions {
    guard zoom.isFinite, (0.1...3).contains(zoom) else {
      throw RoundedIconError.invalidOptions("缩放必须在 10% 到 300% 之间。")
    }
    guard offsetX.isFinite, (-300...300).contains(offsetX),
          offsetY.isFinite, (-300...300).contains(offsetY) else {
      throw RoundedIconError.invalidOptions("位置必须在 -300px 到 300px 之间。")
    }
    guard rotation.isFinite, (-180...180).contains(rotation) else {
      throw RoundedIconError.invalidOptions("旋转必须在 -180° 到 180° 之间。")
    }
    guard opacity.isFinite, (0...1).contains(opacity) else {
      throw RoundedIconError.invalidOptions("不透明度必须在 0% 到 100% 之间。")
    }
    _ = try backgroundColor()
    return self
  }

  func backgroundColor() throws -> NSColor {
    let normalized = backgroundHex.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    if normalized == "transparent" || normalized == "clear" || normalized.isEmpty {
      return .clear
    }

    let value = normalized.hasPrefix("#") ? String(normalized.dropFirst()) : normalized
    guard value.count == 6 || value.count == 8, let hex = UInt64(value, radix: 16) else {
      throw RoundedIconError.invalidOptions("背景颜色必须是 #RRGGBB、#RRGGBBAA 或 transparent。")
    }

    let hasAlpha = value.count == 8
    let red = hasAlpha ? (hex >> 24) & 0xff : (hex >> 16) & 0xff
    let green = hasAlpha ? (hex >> 16) & 0xff : (hex >> 8) & 0xff
    let blue = hasAlpha ? (hex >> 8) & 0xff : hex & 0xff
    let alpha = hasAlpha ? hex & 0xff : 0xff
    let redComponent = CGFloat(red) / 255.0
    let greenComponent = CGFloat(green) / 255.0
    let blueComponent = CGFloat(blue) / 255.0
    let alphaComponent = CGFloat(alpha) / 255.0
    return NSColor(
      srgbRed: redComponent,
      green: greenComponent,
      blue: blueComponent,
      alpha: alphaComponent
    )
  }
}
