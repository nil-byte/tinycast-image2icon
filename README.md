# image2icon

作者：nil-byte。

用于官方 Tinycast 的 macOS Squircle 图标扩展。源码位于 [`image2icon-extension/`](image2icon-extension/)，扩展名与命令名均为 `image2icon`。

支持从 Finder、文件选择器或剪贴板导入图片；调整缩放、位置、背景等参数；导出 PNG、JPG、ICO、ICNS、iconset、Favicon、iOS 与 Android 图标，或复制 PNG。预览使用小尺寸副本，导出使用原图。参数设置保存在 Tinycast 的扩展存储中。

## 构建与验证

需要 macOS、Node.js/npm、Swift 工具链及 Raycast 扩展构建工具（依赖由 npm 安装）：

```sh
cd image2icon-extension
npm ci
npm test
npm run lint
npm run build
```

`ray build` 会编译 Swift 辅助程序，并在 `~/.config/raycast/extensions/image2icon/` 生成扩展文件。可通过 Tinycast 导入该目录；已安装的扩展由 Tinycast 管理，不属于本仓库。`assets/icon.png` 由保留的 `assets/image2icon.icns` 转换而来，供扩展清单使用。`assets/Contents.json` 和 Squircle 图层是导出时的必要资源。

## 已知限制

官方 Tinycast 0.11.3 在 Detail 图片 Data URL 更新时会重建视图，扩展无法保证完全无频闪。原生界面交互尚未验收；目前只进行了代码检查、自动化测试和构建验证。
