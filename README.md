# email-obfuscate

English | [简体中文](README.zh-CN.md)

A build-time script that obfuscates plaintext email addresses in your static site's generated HTML to prevent scraping by bots.

Browsers render emails normally; crawlers see entity-encoded gibberish.

## Install

Install via npm:

```sh
npm install @vemiy/email-obfuscate
```

Or clone the repo:

```sh
git clone https://github.com/vemiy/email-obfuscate.git
```

## Usage

Run after your static site generates HTML:

```sh
npx @vemiy/email-obfuscate
```

By default reads from `./public/`. Use `--dir` for other output directories:

```sh
npx @vemiy/email-obfuscate --dir dist
```

Or set the `EMAIL_OBFUSCATE_DIR` environment variable.

Works with **any** static site generator:

| Generator | Default output dir | Command |
|---|---|---|
| Hexo | `public/` | `hexo generate && email-obfuscate` |
| Hugo | `public/` | `hugo build && email-obfuscate` |
| Astro | `dist/` | `astro build && email-obfuscate --dir dist` |
| Jekyll | `_site/` | `bundle exec jekyll build && email-obfuscate --dir _site` |
| VitePress | `.vitepress/dist/` | `vitepress build && email-obfuscate --dir .vitepress/dist` |
| Next.js (static) | `out/` | `next build && next export && email-obfuscate --dir out` |

## What it does

- Encodes each character of an email as a random ascii or hex HTML entity
- Only obfuscates emails inside `<body>`. `<head>` (title, meta, og tags) is untouched so search engines and social cards read the metadata unchanged
- `<script>` and `<style>` blocks are untouched so JS/CSS keeps working
- Handles `mailto:` hrefs as well
- Case-insensitive
- Skips files that fail to read instead of aborting the whole run

## Notes

- This is a build hook, not a framework plugin. It reads from the output directory (default `./public/`, configurable via `--dir` or `EMAIL_OBFUSCATE_DIR`).
- Obfuscation reduces the chance of a simple crawler picking up an email; it is not a guarantee against a crawler that executes JavaScript or decodes entities.
- Site generators may copy page content into `<meta name="description">` / `og:description`. If such a page displays an email, add an explicit front-matter description without the email — `<head>` is intentionally left untouched.
- Cloudflare's built-in Email Address Obfuscation does not apply to content added by Workers. This script provides a reliable fallback that works at build time, regardless of the hosting setup.

## License

MIT
