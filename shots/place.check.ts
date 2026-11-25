import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BADGE, place } from './place.ts'

test('numbers sit beside their box, inside the picture, never on another box or number', () => {
  const a = { x: 100, y: 100, w: 200, h: 40 }
  const b = { x: 100, y: 150, w: 200, h: 40 }
  const [pa, pb] = place([{ n: 1, rect: a }, { n: 2, rect: b }], 800, 400)
  assert.ok(pa!.x + BADGE <= a.x, 'left of the first box')
  assert.ok(Math.abs(pa!.y - pb!.y) >= BADGE || Math.abs(pa!.x - pb!.x) >= BADGE, 'no overlap')
  // At the left edge: goes to the right instead.
  const [edge] = place([{ n: 1, rect: { x: 5, y: 100, w: 100, h: 30 } }], 800, 400)
  assert.ok(edge!.x >= 105)
  // An arrow: further away, with a line to the box.
  const [far] = place([{ n: 1, rect: a, arrow: 'left' }], 800, 400)
  assert.ok(far!.arrow && far!.x < a.x - 40)
  // Nowhere to go: an error, not a number on top of something.
  assert.throws(() => place([{ n: 1, rect: { x: 0, y: 0, w: 60, h: 30 } }], 60, 30))
})

test('of the spots that fit, the emptiest wins', () => {
  const r = { x: 200, y: 200, w: 100, h: 30 }
  // The left of the box is busy, the right empty: the number goes right.
  const [p] = place([{ n: 1, rect: r }], 800, 600, (x) => (x < 200 ? 100 : 0))
  assert.ok(p!.x > r.x + r.w)
})

test('crowded: the number moves further out, with an arrow', () => {
  // A button with other marked boxes tight on every side: no near spot is free.
  const r = { x: 300, y: 300, w: 80, h: 30 }
  const around = [{ x: 200, y: 300, w: 92, h: 30 }, { x: 388, y: 300, w: 92, h: 30 }, { x: 200, y: 262, w: 280, h: 30 }, { x: 200, y: 338, w: 280, h: 30 }]
  const [p] = place([{ n: 1, rect: r }, ...around.map((rect, i) => ({ n: i + 2, rect }))], 800, 700)
  assert.ok(p!.arrow, 'an arrow to its box')
  assert.ok(p!.y + 30 < 262 || p!.y > 368 || p!.x + 30 < 200 || p!.x > 480, 'outside the crowd')
})
