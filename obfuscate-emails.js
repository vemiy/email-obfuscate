'use strict'
const fs = require('fs')
const path = require('path')

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gi

function obfuscateChar(ch) {
  const c = ch.charCodeAt(0)
  return Math.random() < 0.5 ? `&#${c};` : `&#x${c.toString(16)};`
}

function obfuscate(str) { return str.split('').map(obfuscateChar).join('') }

function obfuscateEmails(html) {
  const headEnd = html.indexOf('</head>')
  let head = '', body = html
  if (headEnd !== -1) { head = html.slice(0, headEnd); body = html.slice(headEnd) }
  const blocks = []
  body = body.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, (m) => { blocks.push(m); return '\u0000B' + (blocks.length - 1) + '\u0000' })
  body = body.replace(/(href=["']mailto:)([^"'@]+@[^"']+)(["'])/gi, (m, pre, mid, post) => pre + obfuscate(mid) + post)
  body = body.replace(EMAIL_RE, obfuscate)
  body = body.replace(/\u0000B(\d+)\u0000/g, (m, i) => blocks[+i])
  return head + body
}

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.html')) out.push(p)
  }
  return out
}

if (require.main === module) {
  const publicDir = path.join(process.cwd(), 'public')
  if (!fs.existsSync(publicDir)) { console.log('public/ not found, skip.'); process.exit(0) }
  let count = 0
  for (const file of walk(publicDir, [])) {
    try {
      const raw = fs.readFileSync(file, 'utf8')
      const out = obfuscateEmails(raw)
      if (out !== raw) { fs.writeFileSync(file, out, 'utf8'); count++ }
    } catch (err) { console.error(`skip ${file}: ${err.message}`) }
  }
  console.log(`email-obfuscate: ${count} html file(s) obfuscated.`)
}

module.exports = { obfuscateEmails }
