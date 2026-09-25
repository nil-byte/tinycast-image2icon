import Foundation

enum RoundedIconError: LocalizedError {
  case inputNotFound
  case unsupportedImage
  case invalidOptions(String)
  case missingAsset(String)
  case renderingFailed
  case encodingFailed(String)
  case destinationNotWritable(String)
  case externalToolFailed(String)
  case clipboardHasNoImage

  var errorDescription: String? {
    switch self {
    case .inputNotFound:
      return "找不到所选文件。"
    case .unsupportedImage:
      return "无法读取这个图片格式。"
    case .invalidOptions(let detail):
      return "参数无效：\(detail)"
    case .missingAsset(let name):
      return "缺少圆角模板资源：\(name)"
    case .renderingFailed:
      return "圆角图标渲染失败。"
    case .encodingFailed(let format):
      return "无法编码 \(format) 图像。"
    case .destinationNotWritable(let path):
      return "无法写入目标位置：\(path)"
    case .externalToolFailed(let detail):
      return "系统导出工具失败：\(detail)"
    case .clipboardHasNoImage:
      return "剪贴板中没有可用图片。"
    }
  }
}
