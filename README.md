# Tinycast image2icon

<p align="center">
  <img src="image2icon-extension/assets/icon.png" width="128" height="128" alt="image2icon icon">
</p>

<p align="center">
  <strong>Turn your images into macOS squircle icons.</strong><br>
  Built for <a href="https://github.com/abue-ammar/tinycast">Tinycast</a> with TypeScript and Swift.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/macOS-12%2B-black?logo=apple" alt="macOS 12+">
  <img src="https://img.shields.io/badge/TypeScript-%2B%20Swift-blue?logo=typescript" alt="TypeScript + Swift">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT">
</p>

---

[English](#english) | [中文说明](#中文说明)

---

<a name="english"></a>
## English

### ✨ Features

- **Import images** from a Finder selection, the file picker, or the clipboard.
- **Fine-tune the icon** with zoom, position, rotation, opacity, fit/fill, and background color. Preview with a smaller copy; export from the original image.
- **Export for multiple platforms** as PNG, JPG, ICO, ICNS, iconset, favicon, iOS AppIcon, or Android mipmap; or copy a PNG to the clipboard.
- **Keep your settings** in Tinycast's extension storage.

### 🚀 Getting Started

#### Requirements

- macOS 12 or later, Node.js/npm, and the Swift toolchain
- [Tinycast](https://github.com/abue-ammar/tinycast) (Raycast extension build tools are installed with npm)

#### Build and install

```bash
git clone https://github.com/nil-byte/tinycast-image2icon.git
cd tinycast-image2icon/image2icon-extension
npm ci
npm run build
```

`ray build` compiles the Swift helper and writes the extension to `~/.config/raycast/extensions/image2icon/`. Import that directory into Tinycast. The installed extension is managed by Tinycast and is not part of this repository.

#### Verify

```bash
npm test
cd swift/rounded-icon && swift test
```

### ⚠️ Known limitations

- Tinycast 0.11.3 recreates the view when a Detail image Data URL changes, so a completely flicker-free preview cannot be guaranteed. Native UI interaction has not yet been verified.
- `npm run lint` fails at Raycast's manifest author check: `nil-byte` is not found in Raycast's user directory. Removing `author` is not supported by its validator. Tests and build are separate from this check.

---

<a name="中文说明"></a>
## 中文说明

### ✨ 核心特性

- **多种导入方式**：从 Finder 所选图片、文件选择器或剪贴板导入。
- **灵活调整图标**：调整缩放、位置、旋转、不透明度、填充方式和背景颜色；使用小尺寸副本预览，导出时使用原图。
- **跨平台导出**：支持 PNG、JPG、ICO、ICNS、iconset、Favicon、iOS AppIcon 和 Android mipmap，或直接复制 PNG。
- **自动保存设置**：参数保存在 Tinycast 的扩展存储中。

### 🛠️ 构建与安装

#### 环境要求

- macOS 12 或更新版本、Node.js/npm、Swift 工具链
- [Tinycast](https://github.com/abue-ammar/tinycast)（Raycast 扩展构建工具由 npm 安装）

```bash
git clone https://github.com/nil-byte/tinycast-image2icon.git
cd tinycast-image2icon/image2icon-extension
npm ci
npm run build
```

`ray build` 会编译 Swift 辅助程序，并将扩展生成在 `~/.config/raycast/extensions/image2icon/`。在 Tinycast 中导入该目录即可；已安装的扩展由 Tinycast 管理，不属于本仓库。

#### 验证

```bash
npm test
cd swift/rounded-icon && swift test
```

### ⚠️ 已知限制

- 官方 Tinycast 0.11.3 在 Detail 图片 Data URL 更新时会重建视图，因此无法保证预览完全无频闪；原生界面交互尚未验收。
- `npm run lint` 会因 Raycast 清单的作者校验失败：Raycast 用户目录中找不到 `nil-byte`，而其校验器也不允许省略 `author`。测试与构建不依赖这项校验。

---

## 📄 License & credits

`image2icon-extension/package.json` declares the MIT license. Created by [nil-byte](https://github.com/nil-byte).
