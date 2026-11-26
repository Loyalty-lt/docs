// The manual as PDFs: public/pdf/loyalty-lt-{partners,till}-{lt,en}.pdf, from the print pages
// (app/print) of a running docs site.  npm run pdf [-- http://localhost:3098]
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { promisify } from 'node:util';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE = process.argv[2] ?? 'http://localhost:3098';
const JPEG_QUALITY = '80';
const OUT = path.join(import.meta.dirname, '../public/pdf');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CACHE = path.join(import.meta.dirname, '../node_modules/.cache/pdf-jpeg');
mkdirSync(OUT, { recursive: true });
mkdirSync(CACHE, { recursive: true });

// Chrome keeps a JPEG in the PDF as it is, but stores any other picture uncompressed: each
// screenshot (WebP) goes in as a JPEG at most 1600 px wide (about 200 dpi on A4), made once.
const run = promisify(execFile);
let busy = 0;
const queue = [];
const slot = () => (busy < 6 ? (busy++, Promise.resolve()) : new Promise((r) => queue.push(r)));
const free = () => (queue.length ? queue.shift()() : busy--);
async function jpeg(webp) {
  const out = path.join(CACHE, `${path.basename(webp, '.webp')}-${statSync(webp).mtimeMs}.jpg`);
  if (!existsSync(out)) {
    await slot();
    try {
      await run('magick', [webp, '-background', 'white', '-flatten', '-resize', '1600x>', '-quality', JPEG_QUALITY, out]);
    } finally {
      free();
    }
  }
  return readFileSync(out);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 600_000 });
try {
  // PDF_ONLY=en/till makes one.
  for (const lang of ['lt', 'en']) {
    for (const section of ['partners', 'till']) {
      if (process.env.PDF_ONLY && process.env.PDF_ONLY !== `${lang}/${section}`) continue;
      const page = await browser.newPage();
      await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
      await page.setRequestInterception(true);
      page.on('request', async (req) => {
        const url = new URL(req.url());
        if (!url.pathname.startsWith('/shots/') || !url.pathname.endsWith('.webp')) return void req.continue().catch(() => {});
        try {
          const body = await jpeg(path.join(OUT, '..', decodeURIComponent(url.pathname)));
          await req.respond({ status: 200, contentType: 'image/jpeg', body });
        } catch (e) {
          console.error(`  ${url.pathname}: ${e.message.split('\n')[0]}`);
          await req.continue().catch(() => {});
        }
      });
      const t0 = Date.now();
      const took = (what) => console.log(`  ${lang}/${section}: ${what} ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      const res = await page.goto(`${BASE}/print/${lang}/${section}`, { waitUntil: 'load', timeout: 300_000 });
      if (res?.status() !== 200) throw new Error(`${BASE}/print/${lang}/${section} answered ${res?.status()}: is the docs site running?`);
      took('page');
      // Every picture loaded before printing (they are lazy on the site).
      await page.evaluate(async () => {
        for (const i of document.images) i.loading = 'eager';
        // A picture in a hidden tab may never decode: wait at most 10 s for each.
        const wait = (i) => Promise.race([i.decode().catch(() => null), new Promise((r) => setTimeout(r, 10_000))]);
        await Promise.all([...document.images].map((i) => (i.complete ? null : wait(i))));
        await document.fonts.ready;
      });
      took('pictures');
      const file = path.join(OUT, `loyalty-lt-${section}-${lang}.pdf`);
      await page.pdf({
        path: file,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: '<div style="width:100%;font-size:8px;color:#888;text-align:center;font-family:sans-serif"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
        margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
        timeout: 600_000,
      });
      took('pdf');
      console.log(`${path.basename(file)}  ${(statSync(file).size / 1e6).toFixed(1)} MB`);
      // A guide with its pictures is megabytes; a few kilobytes is an error page.
      if (statSync(file).size < 1e6) throw new Error(`${path.basename(file)} is too small: not the guide`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
