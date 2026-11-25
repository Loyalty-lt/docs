// The second pass: the clean screenshot with the marks drawn over it, as an HTML page of its own
// (a <dialog> of the system sits in the browser's top layer, above anything drawn in that page,
// so marks are never drawn there). Same browser and fonts; the marks can be redrawn without
// taking the screenshot again.
import type { Placed, Rect } from './place.ts'

const FONT = "-apple-system,'SF Pro Text',system-ui,sans-serif"
// Orange: the screens are green, so a green mark would blend in.
export const MARK = '#E4572E'

export function composeHtml(png: Buffer, W: number, H: number, opts: {
  boxes: { rect: Rect; note?: string }[]
  marks: { rect: Rect }[]
  placed: Placed[]
  spotlight?: boolean
}) {
  const all = [...opts.boxes.map((b) => b.rect), ...opts.marks.map((m) => m.rect)]
  const pad = 4
  const hole = (r: Rect) => `M${r.x - pad},${r.y - pad}h${r.w + 2 * pad}v${r.h + 2 * pad}h${-(r.w + 2 * pad)}z`
  const spotlight = opts.spotlight && all.length
    ? `<path fill="rgba(14,21,18,0.45)" fill-rule="evenodd" d="M0,0h${W}v${H}h${-W}z ${all.map(hole).join(' ')}"/>`
    : ''
  const outline = (r: Rect) =>
    `<rect x="${r.x - pad}" y="${r.y - pad}" width="${r.w + 2 * pad}" height="${r.h + 2 * pad}" rx="8" fill="none" stroke="rgba(228,87,46,0.22)" stroke-width="9"/>` +
    `<rect x="${r.x - pad}" y="${r.y - pad}" width="${r.w + 2 * pad}" height="${r.h + 2 * pad}" rx="8" fill="none" stroke="${MARK}" stroke-width="3"/>`
  const arrows = opts.placed.filter((p) => p.arrow).map((p) => {
    const a = p.arrow!
    return `<line x1="${a.x1}" y1="${a.y1}" x2="${a.x2}" y2="${a.y2}" stroke="#fff" stroke-width="7" stroke-linecap="round"/>` +
      `<line x1="${a.x1}" y1="${a.y1}" x2="${a.x2}" y2="${a.y2}" stroke="${MARK}" stroke-width="3.5" stroke-linecap="round" marker-end="url(#head)"/>`
  }).join('')
  const notes = opts.boxes.filter((b) => b.note).map((b) =>
    `<div style="position:absolute;left:${b.rect.x - pad}px;top:${Math.max(2, b.rect.y - pad - 30)}px;background:${MARK};color:#fff;font:600 13px/1 ${FONT};padding:7px 10px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.18)">${escapeHtml(b.note!)}</div>`).join('')
  const badges = opts.placed.map((p) =>
    `<div style="position:absolute;left:${p.x}px;top:${p.y}px;width:30px;height:30px;border-radius:50%;background:${MARK};color:#fff;display:flex;align-items:center;justify-content:center;font:700 16px/1 ${FONT};box-shadow:0 0 0 3px #fff,0 3px 8px rgba(60,20,0,.35)">${p.n}</div>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;background:#fff}#c{position:relative;width:${W}px;height:${H}px;overflow:hidden}</style></head><body>
<div id="c"><img src="data:image/png;base64,${png.toString('base64')}" style="display:block;width:${W}px;height:${H}px">
<svg width="${W}" height="${H}" style="position:absolute;left:0;top:0" xmlns="http://www.w3.org/2000/svg">
<defs><marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="${MARK}"/></marker></defs>
${spotlight}${all.map(outline).join('')}${arrows}</svg>${notes}${badges}</div></body></html>`
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
