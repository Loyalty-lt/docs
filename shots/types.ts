// What a screenshot of the manual is: which program (app), where (url), what is done first
// (setup), what part is kept (clip) and what is marked on it (marks). The runner (run.ts) fails
// when a mark's target is missing, ambiguous, empty or covered, so a changed screen never ships
// with wrong numbers.

// portal: partners.loyalty.lt, signed in as the demo owner; guest: the portal, not signed in;
// till: the staff app, signed in as a cashier; till-out: the staff app's sign-in screens.
export type App = 'portal' | 'guest' | 'till' | 'till-out'

// A target: a CSS selector (portal only), text=Exact visible text (a button, tab, heading, label…),
// starts=Beginning of the text, or label=Field label (the whole field: its label, control and hint).
// "css >> target" looks only inside the element the selector picks first. In the till every target
// is a name as screen readers hear it. nth: which one of several, 1-based, in reading order.
export type Target = string

export type Step =
  | { click: Target; nth?: number }
  | { type: [Target, string] }
  // Keys one by one, as a person types them (the till's amount, a PIN).
  | { keys: string }
  | { press: string }
  // A card or barcode read by a scanner: very fast keys, then Enter.
  | { scan: string }
  | { wait: Target; nth?: number }
  | { hover: Target; nth?: number }
  | { scroll: Target; nth?: number }
  | { pause: number }
  | { goto: string }
  | { upload: [Target, string] }

export type Mark = {
  n: number
  target: Target
  nth?: number
  // Mark the target's container instead (portal: a CSS selector, e.g. 'div.rounded-lg').
  closest?: string
  // Mark from the target to this one: the box around both.
  to?: Target
  toNth?: number
  // The screen's own words (bold in the legend) and what it does.
  label: string
  text: string
  // Put the number further away with an arrow pointing at the target.
  arrow?: 'left' | 'right' | 'up' | 'down'
}
// A highlighted area without a number, with an optional caption.
export type Box = { box: Target; nth?: number; closest?: string; to?: Target; toNth?: number; note?: string }

export type Shot = {
  id: string
  app: App
  url: string
  // Alt text: what the picture shows.
  alt: string
  viewport?: [number, number]
  setup?: Step[]
  // What to keep: 'main' (default, the portal without its menu), 'page', 'viewport' (dialogs, the
  // till), or a target. pad: extra pixels around it.
  clip?: 'main' | 'page' | 'viewport' | Target
  clipTo?: Target
  pad?: number
  // Waited for before anything else; default: the page's h1 (till: the amount).
  ready?: Target
  // Dim everything outside the marked areas.
  spotlight?: boolean
  marks?: (Mark | Box)[]
}

export const isMark = (m: Mark | Box): m is Mark => 'n' in m
