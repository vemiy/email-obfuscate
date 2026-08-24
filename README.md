# email-obfuscate

A build-time script that obfuscates plaintext email addresses in your static site's generated HTML to prevent scraping by bots.

Browsers render emails normally; crawlers see entity-encoded gibberish.

## Install

```sh
npm install email-obfuscate
```

## Usage

Run after your static site generates HTML:

```sh
npx email-obfuscate
```

Works with **any** static site generator that outputs to `./public/`:

- **Hexo**: `hexo generate && email-obfuscate`
- **Hugo**: `hugo build && email-obfuscate`
- **Astro**: `astro build && email-obfuscate`
- **Jekyll**: `bundle exec jekyll build && email-obfuscate`

Or add to your build script:

```json
"scripts": {
  "build": "hexo generate && email-obfuscate"
}
```

## What it does

- Encodes each character of an email as a random ascii or hex HTML entity
- Only obfuscates emails inside `<body>`. `<head>` (title, meta, og tags) is untouched so search engines and social cards read the metadata unchanged
- `<script>` and `<style>` blocks are untouched so JS/CSS keeps working
- Handles `mailto:` hrefs as well
- Case-insensitive
- Skips files that fail to read instead of aborting the whole run

## Notes

- This is a build hook, not a framework plugin. It reads from `./public/` in the current working directory.
- Obfuscation reduces the chance of a simple crawler picking up an email; it is not a guarantee against a crawler that executes JavaScript or decodes entities.
- Some hosting platforms (e.g. Cloudflare Workers Static Assets) do not apply built-in email obfuscation to HTML responses. This script provides a reliable fallback that works regardless of the hosting setup.

## License

MIT
