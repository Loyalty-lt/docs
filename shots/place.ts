// Where the numbers go: beside each marked box, never on another box or number, inside the
// picture, and where the screenshot is emptiest (cost: how busy the pixels under a spot are,
// measured by the runner). Pure (rectangles in, positions out), tested in place.check.ts.
export type Rect = { x: number; y: number; w: number; h: number }
export type Placed = { n: number; x: number; y: number; arrow?: { x1: number; y1: number; x2: number; y2: number } }
export type Dir = 'left' | 'right' | 'up' | 'down'

export const BADGE = 30
const GAP = 8
const FAR = 56

const overlaps = (a: Rect, b: Rect, m = 0) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m

// When nothing near fits: 1–3 steps further out on each side, each with an arrow.
const farther = (r: Rect) => {
  const cx = r.x + r.w / 2 - BADGE / 2
  const cy = r.y + r.h / 2 - BADGE / 2
  return [1, 2, 3].flatMap((k) => [
    { x: r.x - FAR * k - BADGE, y: cy }, { x: r.x + r.w + FAR * k, y: cy }, { x: cx, y: r.y - FAR * k - BADGE }, { x: cx, y: r.y + r.h + FAR * k },
  ]).map((c) => ({ ...c, far: true }))
}

// The spots tried for one box, in order of preference; `far` ones get an arrow.
export function candidates(r: Rect, arrow?: Dir): { x: number; y: number; far?: boolean; inside?: boolean }[] {
  const cx = r.x + r.w / 2 - BADGE / 2
  const cy = r.y + r.h / 2 - BADGE / 2
  const near = [
    { x: r.x - GAP - BADGE, y: cy }, { x: r.x + r.w + GAP, y: cy }, { x: r.x - BADGE / 2, y: r.y - GAP - BADGE }, { x: r.x + r.w - BADGE / 2, y: r.y - GAP - BADGE },
    { x: cx, y: r.y - GAP - BADGE }, { x: r.x - BADGE / 2, y: r.y + r.h + GAP }, { x: r.x + r.w - BADGE / 2, y: r.y + r.h + GAP }, { x: cx, y: r.y + r.h + GAP },
  ]
  const far: Record<Dir, { x: number; y: number }> = { left: { x: r.x - FAR - BADGE, y: cy }, right: { x: r.x + r.w + FAR, y: cy }, up: { x: cx, y: r.y - FAR - BADGE }, down: { x: cx, y: r.y + r.h + FAR } }
  // Inside the box's top-left corner, when it is big (a whole table, a card).
  const inside = r.w > BADGE * 3 && r.h > BADGE * 2 ? [{ x: r.x + GAP, y: r.y + GAP, inside: true }] : []
  return arrow ? [{ ...far[arrow], far: true }, ...near, ...inside] : [...near, ...inside]
}

export function place(marks: { n: number; rect: Rect; arrow?: Dir }[], W: number, H: number, cost: (x: number, y: number) => number = () => 0): Placed[] {
  const out: Placed[] = []
  const taken: Rect[] = []
  const boxes = marks.map((m) => m.rect)
  for (const m of marks) {
    const r = m.rect
    const fits = (c: { x: number; y: number; inside?: boolean }) => {
      const b = { x: c.x, y: c.y, w: BADGE, h: BADGE }
      if (c.x < 2 || c.y < 2 || c.x + BADGE > W - 2 || c.y + BADGE > H - 2) return false
      if (taken.some((t) => overlaps(b, t, 4))) return false
      // A box around this one (a card around its button) may be covered; any other may not.
      const around = (o: Rect) => o !== r && o.x <= r.x && o.y <= r.y && o.x + o.w >= r.x + r.w && o.y + o.h >= r.y + r.h
      return boxes.every((o) => (o === r ? c.inside || !overlaps(b, o) : around(o) || !overlaps(b, o, 2)))
    }
    let options = candidates(r, m.arrow).map((c, i) => ({ c, i })).filter(({ c }) => fits(c))
    // Crowded: further out, with an arrow, in any direction.
    if (!options.length) options = farther(r).map((c, i) => ({ c, i })).filter(({ c }) => fits(c))
    if (!options.length) throw new Error(`no room for number ${m.n} next to its target (split the shot or move the clip)`)
    // An asked-for arrow wins when it fits; else the emptiest spot, a little in favour of the usual ones.
    const best = m.arrow && options[0]!.c.far ? options[0]! : options.reduce((a, b) => (cost(b.c.x, b.c.y) + b.i * 2 < cost(a.c.x, a.c.y) + a.i * 2 ? b : a))
    const at = best.c
    taken.push({ x: at.x, y: at.y, w: BADGE, h: BADGE })
    const p: Placed = { n: m.n, x: at.x, y: at.y }
    if (at.far) {
      const bx = at.x + BADGE / 2
      const by = at.y + BADGE / 2
      p.arrow = { x1: bx, y1: by, x2: Math.max(r.x, Math.min(bx, r.x + r.w)), y2: Math.max(r.y, Math.min(by, r.y + r.h)) }
    }
    out.push(p)
  }
  return out
}
