// The manual's screenshots, from the local demo system (shots/README.md):
//   npm run shots                       every shot
//   npm run shots -- --only kasa-*      some (ids, * as wildcard)
// Each shot: open the program, do the setup steps, take a clean picture and the rectangles of what
// it marks, then draw the numbers, boxes and arrows over it on a page of its own. Fails on a target
// that is missing, ambiguous, empty, outside the picture or covered. Every API request is answered
// by the local API; nothing else on loyalty.lt can be reached (see gate and --host-resolver-rules).
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import puppeteer, { type Browser, type BrowserContext, type ElementHandle, type Page } from 'puppeteer-core'
import { composeHtml } from './compose.ts'
import { BADGE, candidates, place, type Rect } from './place.ts'
import EN, { DATA } from './en.ts'
import { isMark, type App, type Shot, type Step } from './types.ts'

const here = import.meta.dirname
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORTAL = process.env.PORTAL ?? 'http://localhost:3056'
const API = process.env.API ?? 'http://127.0.0.1:8011'
const TILL_BUILD = process.env.TILL_BUILD ?? path.join(here, '../../staff.loyalty.lt/build/web')
const TILL_PORT = 8012
const TILL = `http://127.0.0.1:${TILL_PORT}`
const OUT = path.join(here, '../public/shots')
const UI = path.join(here, 'ui')
const MANIFEST = path.join(here, 'manifest.json')
const SESSION = JSON.parse(readFileSync(path.join(here, '.session.json'), 'utf8')) as { owner: { token: string }; staffCode: string }

const args = process.argv.slice(2)
const only = args.includes('--only') ? args[args.indexOf('--only') + 1]!.split(',') : null
const match = (id: string) => !only || only.some((p) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`).test(id))
const isTill = (app: App) => app === 'till' || app === 'till-out'

// SHOTS_LANG=en: the same shots from the English screens, saved as <id>.en. The demo data stays as
// it is (a Lithuanian salon); the programs' own words are looked up in their translations: every
// Lithuanian text's English versions are tried, then the text itself (it may be data).
const LANG = process.env.SHOTS_LANG === 'en' ? 'en' : 'lt'
const outId = (s: Shot) => (LANG === 'en' ? `${s.id}.en` : s.id)
const DICT = new Map<string, string[]>()
if (LANG === 'en') {
  const flat = (o: unknown, p = '', out: Record<string, string> = {}) => {
    if (typeof o === 'string') out[p] = o.replace(/\s+/g, ' ').trim()
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) flat(v, p ? `${p}.${k}` : k, out)
    return out
  }
  const pair = (lt: unknown, en: unknown) => {
    const e = flat(en)
    for (const [k, v] of Object.entries(flat(lt))) if (e[k] && e[k] !== v) DICT.set(v, [...new Set([...(DICT.get(v) ?? []), e[k]!])])
  }
  const msgs = path.join(here, '../../partners.loyalty.lt/src/i18n/messages')
  for (const f of readdirSync(path.join(msgs, 'lt')).filter((f) => f.endsWith('.json'))) {
    if (existsSync(path.join(msgs, 'en', f))) pair(JSON.parse(readFileSync(path.join(msgs, 'lt', f), 'utf8')), JSON.parse(readFileSync(path.join(msgs, 'en', f), 'utf8')))
  }
  const tr = path.join(here, '../../staff.loyalty.lt/assets/translations')
  pair(JSON.parse(readFileSync(path.join(tr, 'lt.json'), 'utf8')), JSON.parse(readFileSync(path.join(tr, 'en.json'), 'utf8')))
  for (const [lt, en] of Object.entries(DATA)) DICT.set(lt, [en, ...(DICT.get(lt) ?? []).filter((e) => e !== en)])
}
let current: Shot | undefined
const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Texts with blanks ("puslapis {page} iš {total}", the till's "{} taškai"): Lithuanian as a pattern, English to fill in.
const PATTERNS = [...DICT].filter(([lt]) => /\{[^{}]*\}/.test(lt) && !/\{\w+,/.test(lt)).flatMap(([lt, ens]) => {
  const names = [...lt.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]!)
  const re = esc(lt).replace(/\\\{[^{}]*\\\}/g, '(.+?)')
  return ens.map((en) => ({ re, names, en }))
})
// The English for one Lithuanian text: whole (exact) or its beginning (prefix).
function english(v: string, prefix: boolean): string[] {
  v = v.replace(/\s+/g, ' ').trim()
  const out = [...(DICT.get(v) ?? [])]
  for (const { re, names, en } of PATTERNS) {
    const m = v.match(new RegExp(`^${re}${prefix ? '' : '$'}`))
    if (!m) continue
    let i = 0
    out.push(en.replace(/\{([^{}]*)\}/g, (_, n: string) => m[(n ? names.indexOf(n) : i++) + 1] ?? ''))
  }
  if (prefix && v.length >= 3) for (const [lt, ens] of DICT) if (lt.startsWith(v)) out.push(...ens.map((e) => e.split('{')[0]!.trim()).filter((e) => e.length >= 3))
  // A known text with something after it: "Nuolaida (F6)", "Įrenginys: 3F2A".
  for (let k = v.length - 1; k >= 3; k--) {
    if (!/[\s:(·–-]/.test(v[k]!)) continue
    const head = DICT.get(v.slice(0, k).trim())
    if (head) {
      out.push(...head.map((h) => h + v.slice(v.slice(0, k).trimEnd().length)))
      break
    }
  }
  // Built from words: "puslapis 1 iš 4" → "page 1 of 4".
  const words = v.split(' ').map((w) => DICT.get(w)?.[0] ?? w).join(' ')
  if (words !== v) out.push(words)
  return [...new Set(out)].slice(0, 12)
}
// The targets to try for one Lithuanian target, best first.
function versions(target: string): string[] {
  if (LANG !== 'en') return [target]
  const own = current && EN[current.id]?.[2]?.[target]
  const cut = target.indexOf(' >> ')
  const scope = cut > 0 ? target.slice(0, cut) : ''
  const rest = cut > 0 ? target.slice(cut + 4) : target
  const inCss = (css: string) => {
    const q = css.match(/(\^?=)"([^"]+)"/)
    return q ? english(q[2]!, q[1] === '^=').map((e) => css.replace(q[0], `${q[1]}"${e.replace(/"/g, '\\"')}"`)) : []
  }
  const m = rest.match(/^(text|starts|label)=(.*)$/)
  const found = m ? english(m[2]!, m[1] !== 'text').map((v) => `${m[1]}=${v}`) : inCss(rest)
  const scopes = scope ? [...inCss(scope), scope] : ['']
  const all = [...found, rest].flatMap((r) => scopes.map((sc) => (sc ? `${sc} >> ${r}` : r)))
  return [...new Set([...(own ? [own] : []), ...all])]
}

const MAP = `<!doctype html><style>html,body{margin:0;height:100%;overflow:hidden;background:#eef0ea}</style><svg width="100%" height="100%" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#fff"><g fill="#e2ead6" stroke="none"><path d="M0 0h120v70H0zM250 150h150v110H250z"/></g><g stroke-width="14"><path d="M-10 100 410 60M-10 210 410 170M90-10l40 280M260-10l40 280"/></g><g stroke-width="6"><path d="M-10 30 410 10M-10 155l420-40M180-10l40 280M350-10l40 280"/></g><path d="M200 78c-16 0-28 12-28 28 0 20 28 48 28 48s28-28 28-48c0-16-12-28-28-28z" fill="#d93025" stroke="none"/><circle cx="200" cy="106" r="10" fill="#fff" stroke="none"/></svg>`
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const shots: Shot[] = []
  for (const f of readdirSync(path.join(here, 'specs')).filter((f) => f.endsWith('.ts')).sort()) {
    shots.push(...((await import(path.join(here, 'specs', f))).default as Shot[]))
  }
  const ids = new Set<string>()
  for (const s of shots) {
    if (ids.has(s.id)) throw new Error(`shot id twice: ${s.id}`)
    ids.add(s.id)
  }
  const todo = shots.filter((s) => match(s.id))
  if (!todo.length) throw new Error('no shot matches')
  mkdirSync(OUT, { recursive: true })
  mkdirSync(UI, { recursive: true })
  const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {}

  const server = serveTill()
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true, protocolTimeout: 180_000,
    args: ['--font-render-hinting=none', '--hide-scrollbars', LANG === 'en' ? '--lang=en-GB' : '--lang=lt-LT',
      // The second lock: even a request the gate missed cannot leave for a real Loyalty.lt server.
      '--host-resolver-rules=MAP api.loyalty.lt 127.0.0.1:9, MAP staging-api.loyalty.lt 127.0.0.1:9, MAP ws.loyalty.lt 127.0.0.1:9, MAP partners.loyalty.lt 127.0.0.1:9, MAP staff.loyalty.lt 127.0.0.1:9'],
  })
  const ctx = new Contexts(browser)
  const failed: string[] = []
  try {
    for (const s of todo) {
      try {
        current = s
        manifest[outId(s)] = await take(await ctx.page(s), s, browser)
        console.log(`✓ ${s.id}`)
      } catch (e) {
        failed.push(`${s.id}: ${(e as Error).message}`)
        console.log(`✗ ${s.id}: ${(e as Error).message}`)
        await ctx.snap(s, path.join(here, '.failed')).catch(() => {})
      }
    }
  } finally {
    writeFileSync(MANIFEST, `${JSON.stringify(Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))), null, 1)}\n`)
    await browser.close()
    server.close()
  }
  if (failed.length) {
    console.error(`\n${failed.length} shot(s) failed:\n  ${failed.join('\n  ')}`)
    process.exit(1)
  }
  console.log(`\n${todo.length} shot(s) made.`)
}

// The staff app's web build, as it is published.
function serveTill() {
  const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.ttf': 'font/ttf', '.otf': 'font/otf' }
  return http.createServer((q, r) => {
    let f = path.join(TILL_BUILD, decodeURIComponent((q.url ?? '/').split('?')[0]!))
    if (!existsSync(f) || statSync(f).isDirectory()) f = path.join(TILL_BUILD, 'index.html')
    r.writeHead(200, { 'Content-Type': types[path.extname(f)] ?? 'application/octet-stream' })
    r.end(readFileSync(f))
  }).listen(TILL_PORT, '127.0.0.1')
}

// API requests go to the local API; the local programs and public fonts and pictures pass;
// everything else is refused.
async function gate(page: Page) {
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
  await page.setRequestInterception(true)
  if (process.env.SHOTS_DEBUG) page.on('console', (m) => console.log('console', m.text().slice(0, 300)))
  page.on('request', async (req) => {
    try {
      const url = new URL(req.url())
      if (url.protocol === 'data:' || url.protocol === 'blob:' || ['localhost', '127.0.0.1'].includes(url.hostname) || /(^|\.)(gstatic|googleapis)\.com$/.test(url.hostname) || url.hostname === 'cdn.loyalty.lt') return void (await req.continue())
      if (url.hostname !== 'api.loyalty.lt') {
        // A map of the real world cannot load; show a plain street drawing instead of the browser's error.
        if (req.resourceType() === 'document' && req.frame() !== page.mainFrame()) return void (await req.respond({ status: 200, contentType: 'text/html', body: MAP }))
        return void (await req.abort())
      }
      if (req.method() === 'OPTIONS') return void (await req.respond({ status: 204, headers: cors }))
      const headers = { ...req.headers() }
      delete headers.host
      delete headers.origin
      const body = req.hasPostData() ? (req.postData() ?? (await req.fetchPostData())) : undefined
      const res = await fetch(`${API}${url.pathname}${url.search}`, { method: req.method(), headers, body })
      if (process.env.SHOTS_DEBUG) console.log(res.status, req.method(), url.pathname)
      await req.respond({ status: res.status, headers: { ...cors, 'content-type': res.headers.get('content-type') ?? 'application/json' }, body: Buffer.from(await res.arrayBuffer()) })
    } catch {
      await req.abort().catch(() => {})
    }
  })
}

// One browser context per program, signed in once per run.
class Contexts {
  private pages = new Map<string, Page>()
  private browser: Browser
  constructor(browser: Browser) {
    this.browser = browser
  }
  async snap(s: Shot, dir: string) {
    mkdirSync(dir, { recursive: true })
    const page = this.pages.get(this.key(s))
    await page?.screenshot({ path: path.join(dir, `${s.id}.png`) as `${string}.png` })
    // What the screen said, to see what a missing target is called now.
    if (page) await dumpUi(page, s.id, isTill(s.app), dir).catch(() => {})
  }
  private key(s: Shot) {
    // A phone's till is a till of its own (touch, its own layout).
    return isTill(s.app) ? `${s.app}-${(s.viewport?.[0] ?? 1440) < 768 ? 'phone' : 'wide'}` : s.app
  }
  async page(s: Shot) {
    const key = this.key(s)
    const had = this.pages.get(key)
    if (had) return had
    const context: BrowserContext = await this.browser.createBrowserContext()
    const page = await context.newPage()
    await gate(page)
    await page.emulateTimezone('Europe/Vilnius')
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }])
    await page.setExtraHTTPHeaders({ 'Accept-Language': LANG === 'en' ? 'en-GB,en;q=0.9' : 'lt-LT,lt;q=0.9' })
    // The till keeps its language like this (easy_localization through shared_preferences).
    if (LANG === 'en') await page.evaluateOnNewDocument(() => localStorage.setItem('flutter.locale', '"en"'))
    page.on('dialog', (d) => void (d.type() === 'beforeunload' ? d.accept() : d.dismiss()))
    await viewport(page, s)
    if (s.app === 'portal') {
      const me = (await (await fetch(`${API}/lt/partners/auth/me`, { headers: { Authorization: `Bearer ${SESSION.owner.token}`, Accept: 'application/json' } })).json()) as { data?: unknown }
      if (!me.data) throw new Error('the demo owner is not signed in: run npm run shots:seed')
      await page.evaluateOnNewDocument((token: string, user: string) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', user)
      }, SESSION.owner.token, JSON.stringify(me.data))
    }
    this.pages.set(key, page)
    if (s.app === 'till') {
      try {
        await signInTill(page)
      } catch (e) {
        await this.snap(s, path.join(here, '.failed'))
        this.pages.delete(key)
        throw e
      }
    }
    return page
  }
}

async function viewport(page: Page, s: { viewport?: [number, number] }, height?: number) {
  const [w, h] = s.viewport ?? [1440, 900]
  const phone = w < 768
  await page.setViewport({ width: w, height: height ?? h, deviceScaleFactor: 2, isMobile: phone, hasTouch: phone || w < 1200 })
}

// Flutter draws on a canvas; with its accessibility tree on, every button and text is an element
// with its name and place.
async function semantics(page: Page) {
  await page.waitForFunction(() => !!document.querySelector('flt-semantics-placeholder') || !!document.querySelector('flt-semantics'), { timeout: 40_000 })
  await page.evaluate(() => (document.querySelector('flt-semantics-placeholder') as HTMLElement | null)?.click())
  await page.waitForSelector('flt-semantics', { timeout: 20_000 })
  await sleep(600)
}

async function signInTill(page: Page) {
  await page.goto(TILL, { waitUntil: 'domcontentloaded' })
  await semantics(page)
  await sleep(1500)
  for (const ch of SESSION.staffCode) {
    await page.keyboard.press(ch as never)
    await sleep(140)
  }
  await page.keyboard.press('Enter')
  // Two shops: the till asks which one this device is in.
  await clickAt(page, 'starts=Demo salonas – Centras', 1)
  // The till offers quick sign-in on a new device: keep the PIN this person already has.
  await waitFor(page, 'text=Naudoti turimą PIN', undefined, 20_000)
  await clickAt(page, 'text=Naudoti turimą PIN')
  await waitFor(page, 'text=POS sistema', 1, 20_000)
  await sleep(1500)
}

// A till opened again asks who is working: the cashier picks themselves and enters the PIN.
async function unlockTill(page: Page) {
  for (let i = 0; i < 60; i++) {
    if ((await find(page, 'text=POS sistema', 1)).el) return
    if ((await find(page, 'text=Kas dirba?', 1)).el) {
      await sleep(800)
      await page.keyboard.press('1')
      await sleep(900)
      for (const ch of '1111') {
        await page.keyboard.press(ch as never)
        await sleep(140)
      }
      await waitFor(page, 'text=POS sistema', 1, 20_000)
      return
    }
    await sleep(500)
  }
}

// In the page: the elements a target means (see Target in types.ts), in reading order.
function findAll(target: string): Element[] {
  const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()
  const size = (e: Element) => {
    const r = e.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  if (document.querySelector('flutter-view, flt-glass-pane')) {
    const name = (e: Element) => norm(e.getAttribute('aria-label') || [...e.childNodes].filter((n) => n.nodeType === 3 || n.nodeName === 'SPAN').map((n) => n.textContent).join(' '))
    const want = norm(target.replace(/^(text|starts|label)=/, ''))
    const all = [...document.querySelectorAll('flt-semantics')].filter((e) => size(e) && (target.startsWith('starts=') ? name(e).startsWith(want) : name(e) === want))
    // A button and the text inside it say the same: the button is meant.
    // (label= is for a text that has a button of the same name.)
    const buttons = all.filter((e) => e.getAttribute('role') === 'button')
    const texts = all.filter((e) => e.getAttribute('role') !== 'button')
    const rects = new Set<string>()
    return (target.startsWith('label=') ? texts : buttons.length ? buttons : all).filter((e) => {
      const r = e.getBoundingClientRect()
      const k = `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}`
      return rects.has(k) ? false : (rects.add(k), true)
    }).sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y || a.getBoundingClientRect().x - b.getBoundingClientRect().x)
  }
  const cut = target.indexOf(' >> ')
  const scope = cut > 0 ? document.querySelector(target.slice(0, cut)) : document
  if (cut > 0) target = target.slice(cut + 4)
  if (!scope) return []
  const visible = (e: Element) => {
    const st = getComputedStyle(e)
    return size(e) && st.visibility !== 'hidden' && st.display !== 'none'
  }
  let all: Element[]
  if (target.startsWith('text=') || target.startsWith('starts=')) {
    const exact = target.startsWith('text=')
    const want = norm(target.slice(exact ? 5 : 7))
    const found = [...scope.querySelectorAll('button,a,label,th,td,h1,h2,h3,h4,h5,h6,legend,summary,[role=tab],[role=button],[role=menuitem],option,span,p,li,dt,dd,strong,div')]
      .filter((e) => (exact ? norm(e.textContent) === want : norm(e.textContent).startsWith(want)) && visible(e))
    all = found.filter((e) => !found.some((o) => o !== e && e.contains(o))).map((e) => e.closest('button,a,[role=tab],[role=menuitem],summary,label') ?? e)
  } else if (target.startsWith('label=')) {
    const want = norm(target.slice(6))
    const labels = [...scope.querySelectorAll('label')].filter(visible)
    const exact = labels.filter((l) => norm(l.textContent) === want)
    all = (exact.length ? exact : labels.filter((l) => norm(l.textContent).startsWith(want))).map((l) => {
      const id = l.getAttribute('for')
      const control = id ? document.getElementById(id) : null
      // The smallest box holding both the label and its control.
      let box: Element | null = l.parentElement
      while (box && control && !box.contains(control)) box = box.parentElement
      return box ?? l
    })
  } else {
    all = [...scope.querySelectorAll(target)].filter(visible)
  }
  return [...new Set(all)]
}

// SHOTS_DUMP=1 prints what can be named as a target on the screen, for writing a spec.
function listTargets(): string {
  const norm = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim().slice(0, 70)
  const root = document.querySelector('[role=dialog]') ?? document.querySelector('main') ?? document.body
  const lines = [...root.querySelectorAll('h1,h2,h3,button,a,label,input,textarea,select,[role=tab],[role=switch],[role=combobox],th')].flatMap((e) => {
    const r = e.getBoundingClientRect()
    if (!r.width || !r.height) return []
    const at = ['id', 'aria-label', 'placeholder', 'title', 'role', 'name'].map((k) => (e.getAttribute(k) && !/^radix|^:r/.test(e.getAttribute(k)!) ? `${k}=${norm(e.getAttribute(k))}` : '')).filter(Boolean).join(' ')
    return [`${e.tagName.toLowerCase()} ${norm(e.textContent)}${at ? ` [${at}]` : ''}`]
  })
  return lines.filter((l, i) => l !== lines[i - 1]).join('\n')
}

async function find(page: Page, target: string, nth?: number): Promise<{ el: ElementHandle<Element> | null; count: number }> {
  let r = { el: null as ElementHandle<Element> | null, count: 0 }
  for (const t of versions(target)) {
    const list = await page.evaluateHandle(findAll, t)
    const count = await list.evaluate((l) => l.length)
    const pick = nth !== undefined || count === 1 ? await list.evaluateHandle((l, i) => l[i] ?? null, (nth ?? 1) - 1) : null
    r = { el: (pick?.asElement() as ElementHandle<Element> | null) ?? null, count }
    if (count) return r
  }
  return r
}

async function waitFor(page: Page, target: string, nth?: number, timeout = 15_000) {
  const until = Date.now() + timeout
  for (;;) {
    const r = await find(page, target, nth).catch(() => ({ el: null, count: 0 }))
    if (r.el) return r.el
    if (Date.now() > until) throw new Error(`"${versions(target).join('" / "')}" matches ${r.count} elements (want ${nth !== undefined ? `at least ${nth}` : 'exactly 1; use nth or "css >> target"'})`)
    await sleep(250)
  }
}

// By its place on the screen: the till's elements are only names over a canvas.
async function clickAt(page: Page, target: string, nth?: number) {
  const el = await waitFor(page, target, nth)
  const r = await el.evaluate((e) => { const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } })
  await page.mouse.click(r.x, r.y)
  await sleep(700)
}

// The portal's addresses carry the language: /lt/shops → /en/shops.
const inLang = (url: string, till: boolean) => (LANG === 'en' && !till ? url.replace(/^\/lt(?=\/|$|\?)/, '/en') : url)

async function hydrated(page: Page) {
  await page.waitForFunction(() => !document.querySelector('script[src*="/_next/"]') || Object.keys(document.querySelector('main') ?? document.body).some((k) => k.startsWith('__reactFiber')), { timeout: 60_000 })
}

async function step(page: Page, s: Step, till: boolean) {
  if ('goto' in s) return void (await page.goto(`${till ? TILL : PORTAL}${inLang(s.goto, till)}`, { waitUntil: 'domcontentloaded' }))
  if ('pause' in s) return sleep(s.pause) as Promise<void>
  if ('press' in s) {
    await page.keyboard.press(s.press as never)
    return void (await sleep(900))
  }
  if ('keys' in s) {
    for (const ch of s.keys) {
      await page.keyboard.press(ch as never)
      await sleep(140)
    }
    return void (await sleep(500))
  }
  if ('scan' in s) {
    // All keys at once, as fast as a scanner: typed through the browser they come too slowly while the till draws.
    await page.evaluate((code) => {
      for (const key of [...code, 'Enter']) {
        const init = { key, code: key === 'Enter' ? 'Enter' : /\d/.test(key) ? `Digit${key}` : `Key${key.toUpperCase()}`, keyCode: key === 'Enter' ? 13 : key.toUpperCase().charCodeAt(0), bubbles: true, cancelable: true }
        for (const type of ['keydown', 'keyup']) (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent(type, init))
      }
    }, s.scan)
    return void (await sleep(4500))
  }
  if ('wait' in s) return void (await waitFor(page, s.wait, s.nth))
  if ('upload' in s) {
    await ((await waitFor(page, s.upload[0])) as ElementHandle<HTMLInputElement>).uploadFile(path.join(here, 'files', s.upload[1]))
    return void (await sleep(1200))
  }
  if ('type' in s) {
    if (till) await page.keyboard.type(s.type[1], { delay: 90 })
    else {
      const el = await waitFor(page, s.type[0])
      await el.click({ count: 3 })
      await el.type(s.type[1])
    }
    return void (await sleep(400))
  }
  if ('click' in s) {
    if (till) return clickAt(page, s.click, s.nth)
    await (await waitFor(page, s.click, s.nth)).click()
    return void (await sleep(500))
  }
  const el = await waitFor(page, 'hover' in s ? s.hover : s.scroll, s.nth)
  if ('hover' in s) await el.hover()
  else await el.scrollIntoView()
  await sleep(400)
}

const rectOf = (el: ElementHandle<Element>) => el.evaluate((e) => {
  const b = e.getBoundingClientRect()
  const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)
  const flutter = e.tagName.toLowerCase() === 'flt-semantics'
  return { x: b.x + window.scrollX, y: b.y + window.scrollY, w: b.width, h: b.height, covered: !flutter && !!hit && !e.contains(hit) && !hit.contains(e) }
})
// The page's content: from the main area's top left to the end of what it shows.
const contentRect = (page: Page): Promise<Rect> => page.evaluate(() => {
  const main = document.querySelector('main')!
  const title = main.querySelector('h1')
  let box: Element = title ?? main
  while (box.parentElement && box.parentElement !== main) box = box.parentElement
  let inner: Element = title ?? box
  while (inner.parentElement && inner.parentElement !== main && !/\bspace-y-[4-8]\b/.test(String(inner.className))) inner = inner.parentElement
  const b = (/\bspace-y-[4-8]\b/.test(String(inner.className)) ? inner : box).getBoundingClientRect()
  return { x: b.x + window.scrollX, y: b.y + window.scrollY, w: b.width, h: b.height }
})
const around = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }
}

async function take(page: Page, s: Shot, browser: Browser) {
  const till = isTill(s.app)
  const [vw, vh] = s.viewport ?? [1440, 900]
  await viewport(page, s)
  await page.goto(`${till ? TILL : PORTAL}${inLang(s.url, till)}`, { waitUntil: 'domcontentloaded' })
  if (till) {
    await semantics(page)
    if (s.app === 'till') await unlockTill(page)
    await waitFor(page, s.ready ?? (s.app === 'till' ? 'text=POS sistema' : 'starts=Įrenginys'), 1, 40_000)
    await sleep(2500)
  } else {
    await waitFor(page, s.ready ?? 'main h1', 1, 60_000)
    await hydrated(page)
    await page.waitForNetworkIdle({ idleTime: 600, timeout: 20_000 }).catch(() => {})
  }
  for (const st of s.setup ?? []) await step(page, st, till)
  if (!till) {
    // Still pictures: no animation, no caret, no Next dev badge, no support chat bubble.
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}nextjs-portal,[data-support-widget],#loyalty-support-widget{display:none!important}' })
  }
  const settle = () => page.evaluate(async () => {
    await document.fonts.ready
    for (const i of document.images) i.loading = 'eager'
    const wait = (i: HTMLImageElement) => Promise.race([i.decode().catch(() => null), new Promise((r) => setTimeout(r, 5_000))])
    await Promise.all([...document.images].map((i) => (i.complete ? null : wait(i))))
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  })
  await settle()
  if (process.env.SHOTS_DUMP && !till) console.log(await page.evaluate(listTargets))
  const clip = s.clip ?? (till ? 'viewport' : 'main')
  if (clip !== 'viewport' && !till) {
    // The whole page in one picture: a tall viewport, so nothing scrolls or repeats.
    const h = await page.evaluate(() => Math.ceil(Math.max(document.documentElement.scrollHeight, (document.querySelector('main')?.scrollHeight ?? 0) + 60)))
    await viewport(page, s, Math.min(Math.max(h, vh), 6000))
    await sleep(500)
    await settle()
    await page.evaluate(() => window.scrollTo(0, 0))
  }
  const pad = s.pad ?? (clip === 'page' || clip === 'viewport' ? 0 : clip === 'main' ? 20 : 14)
  let box: Rect
  if (clip === 'viewport' || clip === 'page') {
    const size = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight, full: document.documentElement.scrollHeight }))
    box = { x: 0, y: 0, w: size.w, h: clip === 'page' ? size.full : size.h }
  } else {
    let r: Rect = clip === 'main' ? await contentRect(page) : await rectOf(await waitFor(page, clip))
    if (s.clipTo) r = around(r, await rectOf(await waitFor(page, s.clipTo)))
    box = { x: Math.max(0, r.x - pad), y: Math.max(0, r.y - pad), w: r.w + 2 * pad, h: r.h + 2 * pad }
  }
  const W = Math.round(Math.min(box.w, vw - box.x))
  const H = Math.round(till ? Math.min(box.h, vh - box.y) : box.h)

  const marks = s.marks ?? []
  const rects: Rect[] = []
  for (const m of marks) {
    const target = isMark(m) ? m.target : m.box
    let el = await waitFor(page, target, m.nth, 4_000)
    if (m.closest) {
      const up = (await el.evaluateHandle((e, sel) => e.closest(sel), m.closest)).asElement() as ElementHandle<Element> | null
      if (!up) throw new Error(`mark "${target}" has no container "${m.closest}"`)
      el = up
    }
    let r = await rectOf(el)
    if (m.to) {
      const b = await rectOf(await waitFor(page, m.to, m.toNth, 4_000))
      r = { ...around(r, b), covered: r.covered || b.covered }
    }
    if (r.w < 2 || r.h < 2) throw new Error(`mark "${target}" has no size`)
    if (r.covered) throw new Error(`mark "${target}" is covered by something else`)
    const rel = { x: r.x - box.x, y: r.y - box.y, w: r.w, h: r.h }
    if (rel.x < -1 || rel.y < -1 || rel.x + rel.w > W + 1 || rel.y + rel.h > H + 1) throw new Error(`mark "${target}" is outside the picture`)
    rects.push(rel)
  }
  const png = Buffer.from(await page.screenshot({ type: 'png', clip: { x: box.x, y: box.y, width: W, height: H }, captureBeyondViewport: true }))
  await dumpUi(page, outId(s), till)

  const numbered = marks.map((m, i) => ({ m, r: rects[i]! })).filter((x) => isMark(x.m))
  const toPlace = numbered.map((x) => ({ n: (x.m as { n: number }).n, rect: x.r, arrow: isMark(x.m) ? x.m.arrow : undefined }))
  const composer = await browser.newPage()
  try {
    await composer.setViewport({ width: W, height: Math.min(H, 6000), deviceScaleFactor: 2 })
    // How busy the picture is under each spot a number could take: the emptiest spot wins.
    const spots = toPlace.flatMap((m) => candidates(m.rect, m.arrow))
    await composer.setContent(`<!doctype html><body style="margin:0"><img id="i" src="data:image/png;base64,${png.toString('base64')}" style="display:block;width:${W}px;height:${H}px">`, { waitUntil: 'load' })
    const costs = await composer.evaluate(async (w: number, h: number, list: { x: number; y: number }[], size: number) => {
      const img = document.getElementById('i') as HTMLImageElement
      await img.decode()
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const g = c.getContext('2d', { willReadFrequently: true })!
      g.drawImage(img, 0, 0, w, h)
      return list.map(({ x, y }) => {
        const X = Math.max(0, Math.min(w - size, Math.round(x)))
        const Y = Math.max(0, Math.min(h - size, Math.round(y)))
        const d = g.getImageData(X, Y, size, size).data
        let sum = 0
        let sq = 0
        for (let i = 0; i < d.length; i += 4) {
          const l = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!
          sum += l
          sq += l * l
        }
        const n = d.length / 4
        return Math.sqrt(Math.max(0, sq / n - (sum / n) ** 2))
      })
    }, W, H, spots.map((p) => ({ x: p.x, y: p.y })), BADGE)
    const costOf = new Map(spots.map((p, i) => [`${p.x},${p.y}`, costs[i]!]))
    const placed = place(toPlace, W, H, (x, y) => costOf.get(`${x},${y}`) ?? 0)
    await composer.setContent(composeHtml(png, W, H, {
      boxes: marks.map((m, i) => ({ m, r: rects[i]! })).filter((x) => !isMark(x.m)).map((x) => ({ rect: x.r, note: (x.m as { note?: string }).note })),
      marks: numbered.map((x) => ({ rect: x.r })),
      placed,
      spotlight: s.spotlight,
    }), { waitUntil: 'load' })
    await composer.evaluate(() => document.fonts.ready)
    const el = await composer.$('#c')
    const file = `${outId(s)}.webp`
    writeFileSync(path.join(OUT, file), await el!.screenshot({ type: 'webp', quality: 86, captureBeyondViewport: true }))
    // The same picture at 1×: what phones download (shot.tsx).
    await composer.setViewport({ width: W, height: Math.min(H, 6000), deviceScaleFactor: 1 })
    writeFileSync(path.join(OUT, `${outId(s)}.1x.webp`), await el!.screenshot({ type: 'webp', quality: 86, captureBeyondViewport: true }))
    return { file, w: W, h: H, ...words(s) }
  } finally {
    await composer.close()
  }
}

// The picture's alt text and legend, in the run's language (English: shots/en.ts).
function words(s: Shot) {
  const numbered = (s.marks ?? []).filter(isMark)
  if (LANG === 'lt') return { alt: s.alt, marks: numbered.map((m) => ({ n: m.n, label: m.label, text: m.text })) }
  const en = EN[s.id]
  if (!en) throw new Error(`no English words in shots/en.ts`)
  if ((en[1]?.length ?? 0) !== numbered.length) throw new Error(`shots/en.ts has ${en[1]?.length ?? 0} marks, the spec ${numbered.length}`)
  return { alt: en[0], marks: numbered.map((m, i) => ({ n: m.n, label: en[1]![i]![0], text: en[1]![i]![1] })) }
}

// What the screen says, so the manual's words can be checked against it (content.check.ts).
async function dumpUi(page: Page, id: string, till: boolean, dir = UI) {
  const strings = await page.evaluate((flutter: boolean) => {
    const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim()
    const out = new Set<string>()
    if (flutter) {
      for (const e of document.querySelectorAll('flt-semantics')) {
        const t = norm(e.getAttribute('aria-label') || e.textContent)
        if (t && t.length <= 160) out.add(t)
      }
      return [...out].sort()
    }
    for (const e of document.querySelectorAll('h1,h2,h3,h4,button,a,label,th,legend,summary,[role=tab],[role=menuitem],option,dt,[role=status],[role=alert],p,span,strong')) {
      const t = norm(e.textContent)
      if (t && t.length <= 160) out.add(t)
    }
    for (const e of document.querySelectorAll('[aria-label],[placeholder],[title]')) {
      for (const a of ['aria-label', 'placeholder', 'title']) {
        const v = norm(e.getAttribute(a))
        if (v) out.add(v)
      }
    }
    return [...out].sort()
  }, till)
  writeFileSync(path.join(dir, `${id}.json`), `${JSON.stringify(strings, null, 1)}\n`)
}

await main()
