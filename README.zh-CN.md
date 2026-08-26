# email-obfuscate

[English](README.md) | 简体中文

构建期脚本，将静态站点生成 HTML 中的明文邮箱地址混淆为 HTML 实体，防止被爬虫收割。

浏览器正常显示邮箱；爬虫抓到的只是实体乱码。

## 安装

npm 安装：

```sh
npm install @vemiy/email-obfuscate
```

或克隆仓库：

```sh
git clone https://github.com/vemiy/email-obfuscate.git
```

## 使用

在静态站点生成 HTML 之后运行：

```sh
npx @vemiy/email-obfuscate
```

默认读取 `./public/` 目录。其他输出目录用 `--dir` 指定：

```sh
npx @vemiy/email-obfuscate --dir dist
```

也可通过环境变量 `EMAIL_OBFUSCATE_DIR` 设置。

适用于**任何**静态站点生成器：

| 生成器 | 默认输出目录 | 命令 |
|---|---|---|
| Hexo | `public/` | `hexo generate && email-obfuscate` |
| Hugo | `public/` | `hugo build && email-obfuscate` |
| Astro | `dist/` | `astro build && email-obfuscate --dir dist` |
| Jekyll | `_site/` | `bundle exec jekyll build && email-obfuscate --dir _site` |
| VitePress | `.vitepress/dist/` | `vitepress build && email-obfuscate --dir .vitepress/dist` |
| Next.js（静态导出） | `out/` | `next build && next export && email-obfuscate --dir out` |

## 工作方式

- 将邮箱每个字符编码为随机的十进制或十六进制 HTML 实体
- 只混淆 `<body>` 内的邮箱；`<head>`（title、meta、og 标签）保持原样，搜索引擎与社交卡片正常读取元数据
- `<script>` 与 `<style>` 块不做处理，JS/CSS 功能不受影响
- 同时处理 `mailto:` 链接中的邮箱
- 大小写不敏感
- 单个文件读取失败时跳过该文件，不中断整体运行

## 注意

- 这是构建钩子而非框架插件，读取当前工作目录下的输出目录（默认 `public/`，可通过 `--dir` 或 `EMAIL_OBFUSCATE_DIR` 修改）。
- 混淆降低被简单爬虫收集的概率，不能防住会执行 JavaScript 或解码实体的爬虫。
- 站点生成器可能把正文复制进 `<meta name="description">` / `og:description`。正文含邮箱的页面请写显式的 front-matter description（不含邮箱）——`<head>` 有意不做处理。
- Cloudflare 内建的 Email Address Obfuscation 对 Worker 添加的内容不生效。本脚本在构建期工作，不依赖托管环境。

## 许可

MIT
