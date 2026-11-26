// The manual's own tests (npm test): every page is complete, every screenshot exists, every internal
// link goes somewhere, every <Ui> word is one the programs really show, sentences stay short, and no
// real person's data is in the text. DOCS_COVERAGE=1 also checks that every portal screen has a page.
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { parse as parseYaml } from 'yaml'

const here = import.meta.dirname
const CONTENT = path.join(here, 'content/manual')
const COVERAGE = process.env.DOCS_COVERAGE === '1'
const read = (f: string) => readFileSync(f, 'utf8')
const json = (f: string) => JSON.parse(read(f))

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f)
    return statSync(p).isDirectory() ? (f === 'node_modules' || f === '.next' ? [] : walk(p)) : [p]
  })

type Page = { file: string; url: string; lang: 'lt' | 'en'; fm: { title?: string; description?: string; screen?: string | string[] }; body: string }
const pages: Page[] = walk(CONTENT)
  .filter((f) => f.endsWith('.mdx'))
  .map((file) => {
    const raw = read(file)
    const fm = raw.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? ''
    let rel = path.relative(CONTENT, file).replace(/\.mdx$/, '')
    // page.en.mdx: the English page of the same address, under /en.
    const lang: 'lt' | 'en' = rel.endsWith('.en') ? 'en' : 'lt'
    rel = rel.replace(/\.en$/, '')
    const url = `/${rel.replace(/(^|\/)index$/, '')}`.replace(/\/$/, '')
    return { file: path.relative(here, file), url, lang, fm: parseYaml(fm) ?? {}, body: raw.slice(fm.length + 9) }
  })
const urls = new Set(['/', '/docs', ...pages.map((p) => p.url)])
const lt = pages.filter((p) => p.lang === 'lt')
const prose = (p: Page) => p.body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, 'x')

test('every page has a title and a description', () => {
  for (const p of pages) {
    assert.ok(p.fm.title, `${p.file}: no title`)
    assert.ok(p.fm.description, `${p.file}: no description`)
  }
})

test('every page is in its menu, and the menu has no dead entries', () => {
  for (const meta of walk(CONTENT).filter((f) => /meta(\.en)?\.json$/.test(f) && path.dirname(f) !== CONTENT)) {
    const dir = path.dirname(meta)
    const listed = (json(meta).pages as string[]).filter((s) => !s.startsWith('---'))
    const there = [...new Set(readdirSync(dir).filter((f) => f.endsWith('.mdx')).map((f) => f.replace(/(\.en)?\.mdx$/, '')))]
    assert.deepEqual([...listed].sort(), there.sort(), path.relative(here, meta))
  }
})

test('every screenshot a page shows has a spec and has been made', async () => {
  const specs = new Set<string>()
  for (const f of readdirSync(path.join(here, 'shots/specs')).filter((f) => f.endsWith('.ts'))) {
    for (const s of (await import(path.join(here, 'shots/specs', f))).default as { id: string }[]) {
      assert.ok(!specs.has(s.id), `shots/specs/${f}: ${s.id} twice`)
      specs.add(s.id)
    }
  }
  const made = json(path.join(here, 'shots/manifest.json'))
  const used = new Set<string>()
  for (const p of pages) {
    for (const [, id] of p.body.matchAll(/<Shot id="([^"]+)"/g)) {
      used.add(id!)
      assert.ok(specs.has(id!), `${p.file}: <Shot id="${id}"> has no spec in shots/specs`)
      assert.ok(made[id!], `${p.file}: ${id} is not made (npm run shots -- --only ${id})`)
      if (p.lang === 'en') assert.ok(made[`${id}.en`], `${p.file}: ${id} has no English picture (SHOTS_LANG=en npm run shots -- --only ${id})`)
    }
  }
  assert.deepEqual([...specs].filter((s) => !used.has(s)), [], 'specs no page shows')
})

test('internal links go to pages that exist', () => {
  for (const p of pages) {
    for (const m of p.body.matchAll(/\]\((\/[^)\s#]*)(?:#[^)\s]*)?\)|href="(\/[^"#]*)/g)) {
      const href = (m[1] ?? m[2])!
      assert.ok(urls.has(href.replace(/\/$/, '') || '/'), `${p.file}: link to ${href}, which is no page`)
    }
  }
})

// Every word the programs show: the screenshots' dumps, and the portal's and the till's translations.
const words = (() => {
  const all = new Set<string>()
  const add = (v: unknown): void => {
    if (typeof v === 'string') all.add(v.trim())
    else if (v && typeof v === 'object') Object.values(v).forEach(add)
  }
  for (const f of readdirSync(path.join(here, 'shots/ui')).filter((f) => f.endsWith('.json'))) add(json(path.join(here, 'shots/ui', f)))
  const byLang = { lt: new Set(all), en: new Set(all) }
  for (const lang of ['lt', 'en'] as const) {
    const before = all.size
    const portal = path.join(here, `../partners.loyalty.lt/src/i18n/messages/${lang}`)
    const till = path.join(here, `../staff.loyalty.lt/assets/translations/${lang}.json`)
    all.clear()
    if (existsSync(portal)) walk(portal).filter((f) => f.endsWith('.json')).forEach((f) => add(json(f)))
    if (existsSync(till)) add(json(till))
    all.forEach((w) => byLang[lang].add(w))
    void before
  }
  const portal = path.join(here, '../partners.loyalty.lt/src/i18n/messages/lt')
  const till = path.join(here, '../staff.loyalty.lt/assets/translations/lt.json')
  return { byLang, complete: existsSync(portal) && existsSync(till) }
})()

test('every <Ui> word is one the programs show', { skip: !words.complete && 'portal and till sources are not here' }, () => {
  for (const p of pages) {
    for (const [, label] of p.body.matchAll(/<Ui>([^<]+)<\/Ui>/g)) {
      assert.ok(words.byLang[p.lang].has(label!.trim()), `${p.file}: <Ui>${label}</Ui> is not on any screen in ${p.lang}`)
    }
  }
})

test('sentences are short (at most 25 words)', () => {
  for (const p of pages) {
    const lines = prose(p)
      .split('\n')
      .filter((l) => l.trim() && !/^\s*(\||<\/?[A-Z]|#|import |export |\{|---)/.test(l))
      .map((l) => l.replace(/<[^>]+>/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/„[^“]*“/g, 'tekstas'))
    for (const s of lines.flatMap((l) => l.split(/(?<=[.!?:;])\s+/))) {
      const count = s.split(/\s+/).filter((w) => /\p{L}|\d/u.test(w)).length
      assert.ok(count <= 25, `${p.file}: a sentence of ${count} words — "${s.trim().slice(0, 120)}…"`)
    }
  }
})

test('every page is in both languages', () => {
  const en = new Set(pages.filter((p) => p.lang === 'en').map((p) => p.url))
  assert.deepEqual(lt.map((p) => p.url).filter((u) => !en.has(u)), [], 'Lithuanian pages with no English page (page.en.mdx)')
})

test('no bare {placeholder} and no abbreviation of "taškai"', () => {
  for (const p of pages) {
    const m = prose(p).match(/(?<!\\)\{\{?[a-zA-Z_][\w]*\}?\}/)
    assert.ok(!m, `${p.file}: ${m?.[0]} outside \`code\` breaks the page`)
    assert.doesNotMatch(p.body, /\btšk\b/i, `${p.file}: write "taškai" in full`)
    assert.doesNotMatch(p.body, /podcast/i, `${p.file}: write "tinklalaidė"`)
  }
})

// The manual is public: only example.com / example.lt addresses, Loyalty.lt's own, and made-up phones.
test('no real e-mail addresses or phones', () => {
  const texts = [...pages.map((p) => [p.file, p.body] as const), ...readdirSync(path.join(here, 'shots/ui')).map((f) => [`shots/ui/${f}`, read(path.join(here, 'shots/ui', f))] as const)]
  for (const [file, text] of texts) {
    for (const [mail] of text.matchAll(/[\w.+-]+@[\p{L}\d-]+(?:\.[\w-]+)+/gu)) assert.match(mail, /@(example\.(com|lt)|([\w-]+\.)?loyalty\.lt|(jusu-domenas|jusu-imone|kompanija|imone|įmonė)\.lt|(company|your-domain|yourcompany)\.com)/i, `${file}: ${mail}`)
    for (const [phone] of text.matchAll(/\+370[\d ]{8,}/g)) assert.match(phone.replace(/ /g, ''), /^\+370(60000\d{3}|0{8}|61234567|62345678|63456789|37282595)/, `${file}: ${phone}`)
  }
})

// Screens the manual leaves out: ours, not the partner's.
const OURS = ['/auth/admin-login']
test('every portal screen has its page', { skip: !COVERAGE }, () => {
  const app = path.join(here, '../partners.loyalty.lt/src/app/[locale]')
  const screens = walk(app)
    .filter((f) => f.endsWith('page.tsx'))
    // Pages that only send you on are no screens.
    .filter((f) => !(/\bredirect\(|router\.replace\(/.test(read(f)) && !/return \(?\s*<[A-Za-z]/.test(read(f))))
    .map((f) => `/${path.relative(app, path.dirname(f))}`.replace(/\/\([^)]+\)/g, '').replace(/\[[^\]]+\]/g, '[id]') || '/')
    .filter((s) => !OURS.includes(s))
  const claimed = new Set(lt.flatMap((p) => [p.fm.screen ?? []].flat()))
  assert.deepEqual(screens.filter((s) => !claimed.has(s)), [], 'screens no page claims (screen: in the frontmatter)')
})
