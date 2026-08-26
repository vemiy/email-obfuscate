'use strict'
const fs = require('fs')
const os = require('os')
const path = require('path')
const assert = require('assert')
const { execFileSync, spawnSync } = require('child_process')

const ROOT = __dirname
const SCRIPT = path.join(ROOT, 'obfuscate-emails.js')
const { obfuscateEmails } = require(SCRIPT)

let passed = 0
function ok(name, fn) {
  try { fn(); passed++; console.log(`  ok - ${name}`) }
  catch (err) { console.error(`  FAIL - ${name}\n    ${err.message}`); process.exitCode = 1 }
}

function mktmp(tag) { return fs.mkdtempSync(path.join(os.tmpdir(), `eo-${tag}-`)) }
function write(base, rel, content) {
  const p = path.join(base, rel)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, content)
}
function read(base, rel) { return fs.readFileSync(path.join(base, rel), 'utf8') }

// ========== 单元测试 ==========

console.log('# unit: entities mode')
{
  const src = '<html><head><title>Contact user@example.com</title></head><body>' +
    '<p>email: user@example.com</p>' +
    '<a href="mailto:user@example.com">mail</a>' +
    '<script>var x="script@example.com";</script>' +
    '<style>.a{content:"style@example.com"}</style>' +
    '<p>UPPER@EXAMPLE.COM</p></body></html>'

  const out = obfuscateEmails(src)

  ok('body emails entity-encoded', () => assert(/&#/.test(out)))
  ok('no plaintext email in body text nodes', () => {
    const bodyOnly = out.slice(out.indexOf('</head>'))
    const stripped = bodyOnly.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    assert.ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(stripped.replace(/&#x?[0-9a-f]+;/gi, 'X')))
  })
  ok('<head> untouched', () => {
    assert.ok(out.includes('<title>Contact user@example.com</title>'))
  })
  ok('<script>/<style> untouched', () => {
    assert.ok(out.includes('script@example.com'))
    assert.ok(out.includes('style@example.com'))
  })
  ok('mailto: href entity-encoded', () => assert(/href=["']mailto:&#/.test(out)))
  ok('idempotent', () => assert.strictEqual(obfuscateEmails(out), out))
}

// ========== 多种 SSG HTML 结构 ==========

console.log('# unit: various SSG HTML structures')
{
  // Hexo-style: nested posts with sidebar
  const hexo = '<html><head></head><body><div id="content">' +
    '<article><h1>post</h1><p>contact admin@hexo.dev</p></article>' +
    '<aside><a href="mailto:admin@hexo.dev"><i class="icon"></i></a></aside>' +
    '</div></body></html>'
  const hexoOut = obfuscateEmails(hexo)
  ok('Hexo-style: article + sidebar emails encoded', () => {
    assert.ok(!hexoOut.includes('admin@hexo.dev'))
    assert.ok(/&#/.test(hexoOut))
  })

  // Hugo-style: content nested deep
  const hugo = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"></head>' +
    '<body><main><section><p>reach us: info@hugo.io</p></section></main></body></html>'
  const hugoOut = obfuscateEmails(hugo)
  ok('Hugo-style: deep nested content encoded', () => {
    assert.ok(!hugoOut.includes('info@hugo.io'))
    assert.ok(/&#/.test(hugoOut))
  })

  // Astro-style: island components with data attributes
  const astro = '<html><head></head><body>' +
    '<div data-astro-cid="abc123"><p>hello@astro.dev</p></div>' +
    '<astro-island><p>contact@astro.dev</p></astro-island>' +
    '</body></html>'
  const astroOut = obfuscateEmails(astro)
  ok('Astro-style: custom element + data-attr content encoded', () => {
    assert.ok(!astroOut.includes('hello@astro.dev'))
    assert.ok(!astroOut.includes('contact@astro.dev'))
    assert.ok(astroOut.includes('data-astro-cid="abc123"'))
  })

  // Jekyll-style: Liquid includes, kramdown output
  const jekyll = '<html><head></head><body>' +
    '<div class="post"><p>Contact: dev@jekyll.rb</p></div>' +
    '<div id="footer"><p>&copy; dev@jekyll.rb</p></div>' +
    '</body></html>'
  const jekyllOut = obfuscateEmails(jekyll)
  ok('Jekyll-style: post + footer emails encoded', () => {
    assert.ok(!jekyllOut.includes('dev@jekyll.rb'))
    assert.ok(/&#/.test(jekyllOut))
  })

  // VitePress / docs-site style: nested divs with code blocks
  const vitepress = '<html><head></head><body>' +
    '<div class="vp-doc"><p>Use <code>support@vite.dev</code> for help</p>' +
    '<p>Or email <a href="mailto:support@vite.dev">support@vite.dev</a></p></div>' +
    '</body></html>'
  const vpOut = obfuscateEmails(vitepress)
  ok('VitePress-style: code block + mailto link encoded', () => {
    assert.ok(!vpOut.includes('support@vite.dev'))
    assert.ok(/&#/.test(vpOut))
  })
}

// ========== --dir 参数测试 ==========

console.log('# CLI: --dir parameter')
{
  const dir1 = mktmp('dir1')
  write(dir1, 'public/index.html', '<html><body>a@b.co</body></html>')
  const r1 = spawnSync(process.execPath, [SCRIPT, '--dir', path.join(dir1, 'public')], { cwd: dir1, encoding: 'utf8' })
  ok('--dir <path> works', () => {
    assert.strictEqual(r1.status, 0)
    assert.ok(read(dir1, 'public/index.html').includes('&#'))
  })
  fs.rmSync(dir1, { recursive: true, force: true })

  const dir2 = mktmp('dir2')
  write(dir2, 'dist/index.html', '<html><body>x@y.zz</body></html>')
  const r2 = spawnSync(process.execPath, [SCRIPT, '--dir=dist'], { cwd: dir2, encoding: 'utf8' })
  ok('--dir=<path> works', () => {
    assert.strictEqual(r2.status, 0)
    assert.ok(read(dir2, 'dist/index.html').includes('&#'))
  })
  fs.rmSync(dir2, { recursive: true, force: true })

  const dir3 = mktmp('dir3')
  write(dir3, '_site/index.html', '<html><body>z@w.io</body></html>')
  const r3 = spawnSync(process.execPath, [SCRIPT], { cwd: dir3, encoding: 'utf8', env: { ...process.env, EMAIL_OBFUSCATE_DIR: '_site' } })
  ok('EMAIL_OBFUSCATE_DIR env var works', () => {
    assert.strictEqual(r3.status, 0)
    assert.ok(read(dir3, '_site/index.html').includes('&#'))
  })
  fs.rmSync(dir3, { recursive: true, force: true })

  const dir4 = mktmp('dir4')
  const r4 = spawnSync(process.execPath, [SCRIPT, '--dir', path.join(dir4, 'nonexistent')], { cwd: dir4, encoding: 'utf8' })
  ok('nonexistent dir: exit 0, skip message', () => {
    assert.strictEqual(r4.status, 0)
    assert.ok(r4.stdout.includes('not found'))
  })
  fs.rmSync(dir4, { recursive: true, force: true })

  const dir5 = mktmp('dir5')
  write(dir5, 'out/page1.html', '<html><body>a@b.co</body></html>')
  write(dir5, 'out/page2.html', '<html><body>c@d.ef</body></html>')
  write(dir5, 'out/style.css', 'body { color: red; }')
  const r5 = spawnSync(process.execPath, [SCRIPT, '--dir', path.join(dir5, 'out')], { cwd: dir5, encoding: 'utf8' })
  ok('processes multiple HTML, skips non-HTML', () => {
    assert.ok(read(dir5, 'out/page1.html').includes('&#'))
    assert.ok(read(dir5, 'out/page2.html').includes('&#'))
    assert.ok(read(dir5, 'out/style.css').includes('color: red'))
  })
  fs.rmSync(dir5, { recursive: true, force: true })
}

// ========== 边界情况 ==========

console.log('# edge cases')
{
  // 无邮箱页面
  const noEmail = '<html><head></head><body><p>no emails here</p></body></html>'
  ok('no-email page returned unchanged', () => assert.strictEqual(obfuscateEmails(noEmail), noEmail))

  // 无 </head> 页面
  const noHead = '<html><body><p>a@b.co</p></body></html>'
  const noHeadOut = obfuscateEmails(noHead)
  ok('no </head> still works', () => {
    assert.ok(!noHeadOut.includes('a@b.co'))
    assert.ok(/&#/.test(noHeadOut))
  })

  // 无 </body> 页面
  const noBody = '<html><head></head><body><p>x@y.zz</p>'
  const noBodyOut = obfuscateEmails(noBody)
  ok('no </body> still works', () => {
    assert.ok(!noBodyOut.includes('x@y.zz'))
    assert.ok(/&#/.test(noBodyOut))
  })

  // 空 HTML
  ok('empty string returns empty', () => assert.strictEqual(obfuscateEmails(''), ''))

  // 多个邮箱同一行
  const multi = '<html><head></head><body><p>a@b.co and c@d.ef</p></body></html>'
  const multiOut = obfuscateEmails(multi)
  ok('multiple emails on same line both encoded', () => {
    assert.ok(!multiOut.includes('a@b.co'))
    assert.ok(!multiOut.includes('c@d.ef'))
  })

  // 嵌套标签
  const nested = '<html><head></head><body><div><p><strong><em>deep@nest.ed</em></strong></p></div></body></html>'
  ok('deeply nested email encoded', () => {
    assert.ok(!obfuscateEmails(nested).includes('deep@nest.ed'))
  })

  // HTML 注释中的邮箱
  const comment = '<html><head></head><body><!-- email: secret@commented.com --><p>visible@page.com</p></body></html>'
  const commentOut = obfuscateEmails(comment)
  ok('comment email encoded, visible email encoded', () => {
    assert.ok(!commentOut.includes('secret@commented.com'))
    assert.ok(!commentOut.includes('visible@page.com'))
  })

  // 超长 HTML（性能）
  let bigHtml = '<html><head></head><body>'
  for (let i = 0; i < 1000; i++) bigHtml += `<p>user${i}@example.com</p>`
  bigHtml += '</body></html>'
  const t0 = Date.now()
  obfuscateEmails(bigHtml)
  ok('1000 emails processed in < 500ms', () => assert.ok(Date.now() - t0 < 500))
}

// ========== 打包 bin 冒烟 ==========

console.log('# packaged bin')
{
  const packDir = mktmp('pack')
  execFileSync('npm', ['pack', '--pack-destination', packDir], { cwd: ROOT, stdio: 'pipe', shell: true })
  const tgz = fs.readdirSync(packDir).find(f => f.endsWith('.tgz'))
  execFileSync('npm', ['install', '-g', path.join(packDir, tgz)], { stdio: 'pipe', shell: true })
  try {
    const useDir = mktmp('use')
    write(useDir, 'dist/index.html', '<html><body>bin@test.dev</body></html>')
    const r = spawnSync('email-obfuscate', ['--dir', path.join(useDir, 'dist')], { cwd: useDir, shell: true, encoding: 'utf8' })
    ok('global bin + --dir works end-to-end', () => {
      assert.strictEqual(r.status, 0, `status=${r.status} out=${r.stdout} err=${r.stderr}`)
      assert.ok(read(useDir, 'dist/index.html').includes('&#'))
    })
    fs.rmSync(useDir, { recursive: true, force: true })
  } finally {
    spawnSync('npm', ['uninstall', '-g', '@vemiy/email-obfuscate'], { stdio: 'pipe', shell: true })
    fs.rmSync(packDir, { recursive: true, force: true })
  }
}

if (process.exitCode) { console.error('\nSOME TESTS FAILED'); process.exit(1) }
console.log(`\nall ${passed} checks passed`)
