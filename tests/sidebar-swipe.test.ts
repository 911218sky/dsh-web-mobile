import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  classifySwipe,
  classifyFilesSwipe,
  slidingVelocity,
  hitTestStart,
  followTranslate,
  followOpenTransform,
  findHorizontalScroller,
  filesZoneHit,
  openStateStartMode,
  selectionOwnsStroke,
  startZonePxFor,
  clearFollowInlineStyles,
  type SwipeThresholds,
  type SwipeChainNode,
} from '../src/client/effects/sidebar-swipe.ts'
import {
  markGestureConsumed,
  consumeIfGestured,
  isGestureConsumed,
  markStrokeLocked,
  clearStrokeLocked,
  isStrokeLocked,
} from '../src/client/effects/gesture-guard.ts'

const BASE: SwipeThresholds = {
  openDistanceRatio: 0.16,
  closeDistanceRatio: 0.13,
  velocityWindowMs: 60,
  openVelocity: 0.45,
  closeVelocity: 0.45,
  lockPx: 8,
  cooldownMs: 350,
  startZonePx: 176, // startZonePxFor(390) — 45% of the probe viewport
}

function classify(
  over: Partial<Parameters<typeof classifySwipe>[0] & Parameters<typeof classifySwipe>[1]>,
  rtl = false,
): 'open' | 'close' | 'none' {
  const t = {
    ...BASE,
    viewportWidthPx: 390,
    drawerOpen: false,
    ...(over as { viewportWidthPx?: number; drawerOpen?: boolean }),
  }
  const m = {
    dx: 0,
    dy: 0,
    velX: 0,
    ...(over as { dx?: number; dy?: number; velX?: number }),
  }
  return classifySwipe(t, m, rtl)
}

test('classifySwipe: lock slop — sub-lockPx strokes are none', () => {
  assert.equal(classify({ dx: 7, dy: 0 }), 'none')
  assert.equal(classify({ dx: -7, dy: 0, drawerOpen: true }), 'none')
})

test('classifySwipe: axis lock — horizontal-dominant strokes pass, vertical-dominant are none', () => {
  // |dx| = 10, |dy| = 9 → 10 > 9 → horizontal-dominant → keeps axis lock
  assert.equal(classify({ dx: 10, dy: 9, velX: 0.6 }), 'open')
  // |dx| = 10, |dy| = 10 → not strictly dominant → none
  assert.equal(classify({ dx: 10, dy: 10, velX: 0.6 }), 'none')
  // ~45° diagonal (80,60): |dx| > |dy| → accepted (old 1.5× bias rejected these)
  assert.equal(classify({ dx: 80, dy: 60 }), 'open')
})

test('classifySwipe: closed drawer — rightward distance opens', () => {
  // 62px / 390 = 0.159 → ≥ 0.16? exactly 62px is 0.1589… → uses 63px
  assert.equal(classify({ dx: 63, dy: 0 }), 'open')
  assert.equal(classify({ dx: 80, dy: 0 }), 'open')
})

test('classifySwipe: closed drawer — leftward never opens', () => {
  assert.equal(classify({ dx: -150, dy: 0 }), 'none')
})

test('classifySwipe: closed drawer — velocity opens short fast strokes', () => {
  // dx = 50px (ratio 0.128 < 0.16) but velX = 0.7 px/ms ≥ 0.45 → open
  assert.equal(classify({ dx: 50, dy: 0, velX: 0.7 }), 'open')
  // slow long drag still opens by distance
  assert.equal(classify({ dx: 100, dy: 0, velX: 0.1 }), 'open')
  // too short + too slow → none
  assert.equal(classify({ dx: 30, dy: 0, velX: 0.3 }), 'none')
})

test('classifySwipe: open drawer — rightward distance closes', () => {
  // 51px / 390 = 0.13 → exactly at threshold → close
  assert.equal(classify({ dx: 51, dy: 0, drawerOpen: true }), 'close')
  assert.equal(classify({ dx: 70, dy: 0, drawerOpen: true }), 'close')
})

test('classifySwipe: open drawer — leftward closes too (bidirectional close)', () => {
  // Leftward toward the slot is a valid close (follow paints that direction).
  assert.equal(classify({ dx: -120, dy: 0, drawerOpen: true }), 'close')
  // 51px / 390 = 0.13 → exactly at threshold, mirrored
  assert.equal(classify({ dx: -51, dy: 0, drawerOpen: true }), 'close')
  // Short + slow in either direction is still refused.
  assert.equal(classify({ dx: -30, dy: 0, velX: -0.2, drawerOpen: true }), 'none')
})

test('classifySwipe: open drawer — a fling must agree with its own direction', () => {
  // Short leftward stroke with a leftward fling → close.
  assert.equal(classify({ dx: -40, dy: 0, velX: -0.55, drawerOpen: true }), 'close')
  // Short leftward stroke with a RIGHTWARD velocity is contradictory → none.
  assert.equal(classify({ dx: -40, dy: 0, velX: 0.55, drawerOpen: true }), 'none')
  assert.equal(classify({ dx: 40, dy: 0, velX: -0.55, drawerOpen: true }), 'none')
})

test('classifySwipe: open drawer — velocity closes short fast strokes', () => {
  // dx = 40px (ratio 0.103 < 0.16) but velX = 0.55 ≥ 0.45 → close
  assert.equal(classify({ dx: 40, dy: 0, velX: 0.55, drawerOpen: true }), 'close')
  assert.equal(classify({ dx: 30, dy: 0, velX: 0.2, drawerOpen: true }), 'none')
})

test('classifySwipe: velocity must agree with the stroke direction', () => {
  // A rightward-stroke below the distance threshold (60px < 62px open
  // threshold) with negative velocity is contradictory → none
  assert.equal(classify({ dx: 60, dy: 0, velX: -0.8 }), 'none')
})

test('classifySwipe: RTL mirrors the X axis', () => {
  // In RTL a rightward raw stroke is logically leftward → none to open
  assert.equal(classify({ dx: 120, dy: 0 }, true), 'none')
  // In RTL a leftward raw stroke is logically rightward → open
  assert.equal(classify({ dx: -120, dy: 0 }, true), 'open')
  // RTL close: raw leftward closes the drawer (and so does raw rightward,
  // since closing is bidirectional — RTL only mirrors the fling agreement).
  assert.equal(classify({ dx: -100, dy: 0, drawerOpen: true }, true), 'close')
  assert.equal(classify({ dx: 100, dy: 0, drawerOpen: true }, true), 'close')
})

test('classifySwipe: reduced-motion is irrelevant to the decision', () => {
  // The classifier is pure geometry; prefers-reduced-motion only affects
  // CSS animation, which the host transition owns. Assert invariance by
  // calling with the same input twice.
  const input = { dx: 130, dy: 0, velX: 0.9 }
  assert.equal(classify(input, false), classify(input, false))
})

test('slidingVelocity: empty / single-sample returns 0', () => {
  assert.equal(slidingVelocity([], 60, 1000), 0)
  assert.equal(slidingVelocity([{ t: 900, x: 10 }], 60, 1000), 0)
})

test('slidingVelocity: end-segment (tail-slope) instantaneous speed', () => {
  const samples = [
    { t: 800, x: 0 },
    { t: 900, x: 20 },
    { t: 950, x: 30 },
    { t: 980, x: 45 },
  ]
  // Window (1000-60=940..1000): last two in-window samples are t=950 and
  // t=980 → (45-30)/(980-950) = 0.5 — the end-of-stroke slope, not the
  // window average (which would be 0.3125 over 900..980).
  assert.equal(slidingVelocity(samples, 60, 1000), 0.5)
})

test('slidingVelocity: ignores stale samples outside the window', () => {
  const samples = [
    { t: 500, x: 0 },
    { t: 700, x: 300 }, // outside the window → must not drag the speed up
    { t: 950, x: 320 },
    { t: 980, x: 326 },
  ]
  assert.equal(slidingVelocity(samples, 60, 1000), (326 - 320) / (980 - 950))
})

test('slidingVelocity: zero time span returns 0', () => {
  assert.equal(
    slidingVelocity(
      [
        { t: 950, x: 10 },
        { t: 950, x: 20 },
      ],
      60,
      1000,
    ),
    0,
  )
})

test('startZonePxFor: the zone is a viewport RATIO, not a fixed width', () => {
  // 45% of the viewport, rounded to an integer so probe boundaries stay
  // exact. The runtime recomputes this per stroke from the live viewport
  // width — portrait/landscape/tablet all adapt with no per-device tuning.
  assert.equal(startZonePxFor(390), 176, 'phone portrait 390px')
  assert.equal(startZonePxFor(430), 194, 'large phone 430px')
  assert.equal(startZonePxFor(768), 346, 'tablet 768px')
  assert.equal(startZonePxFor(1023), 460, 'upper breakpoint 1023px')
  assert.equal(startZonePxFor(400, 0.25), 100, 'ratio is injectable for tests')
  assert.equal(startZonePxFor(0), 0)
})

test('hitTestStart: inside / outside the left start zone (45% of 390 = 176px)', () => {
  const t = { startZonePx: startZonePxFor(390) }
  // The inclusive boundary contract (`edge <= startZonePx`), pinned at the
  // adaptive zone width. Chrome Android's 48dp history-navigation band and
  // the WebKit ~40px guard precedent sit far inside the zone.
  assert.equal(hitTestStart(0, 390, false, t), true)
  assert.equal(hitTestStart(48, 390, false, t), true, 'Chrome edge band (48dp) fully covered')
  assert.equal(hitTestStart(175, 390, false, t), true)
  assert.equal(hitTestStart(176, 390, false, t), true, 'Math.round(390*0.45) = 176, inclusive')
  assert.equal(hitTestStart(177, 390, false, t), false)
  assert.equal(hitTestStart(389, 390, false, t), false)
})

test('hitTestStart: RTL mirrors to the right edge (176px)', () => {
  const t = { startZonePx: startZonePxFor(390) }
  assert.equal(hitTestStart(389, 390, true, t), true)
  assert.equal(hitTestStart(214, 390, true, t), true, 'edge = 390-214 = 176, inclusive')
  assert.equal(hitTestStart(213, 390, true, t), false, 'edge = 177, beyond the zone')
})

test('hitTestStart: viewport edge bounds', () => {
  const t = { startZonePx: startZonePxFor(390) }
  assert.equal(hitTestStart(-1, 390, false, t), false)
  assert.equal(hitTestStart(390, 390, false, t), false)
  // RTL mirrors: x=390 is the logical left edge (edge = 390-390 = 0 → in zone)
  assert.equal(hitTestStart(390, 390, true, t), true)
  // Negative clientX in RTL is off the right side → never in the zone
  assert.equal(hitTestStart(-1, 390, true, t), false)
})

// --- followTranslate (B-tier follow mapping, C3 hybrid) ---

test('followTranslate: open stroke drags the drawer out of its slot, clamped', () => {
  const closedTx = -226.7
  // 62px of travel from the slot → 62px revealed
  assert.equal(followTranslate(closedTx, 62, false, false), -164.7)
  // full slot travel reaches 0 (the open anchor)
  assert.equal(followTranslate(closedTx, 226.7, false, false), 0)
  // over-travel clamps at the open anchor
  assert.equal(followTranslate(closedTx, 400, false, false), 0)
  // leftward / zero travel never follows an open stroke
  assert.equal(followTranslate(closedTx, 0, false, false), null)
  assert.equal(followTranslate(closedTx, -5, false, false), null)
})

test('followTranslate: the close slot must be 110% of the OPEN drawer width', () => {
  // Slot must use the open drawer's width (~280px → -308), not the closed rail
  // (~206px → -226.7); rail clamping stopped 81px short of the edge.
  const railSlot = -226.7
  const drawerSlot = -308
  // 280px stroke: still following at rail slot, reaches the edge with drawer slot.
  assert.equal(followTranslate(railSlot, -280, false, true), -226.7)
  assert.equal(followTranslate(drawerSlot, -280, false, true), -280)
  assert.equal(followTranslate(drawerSlot, -308, false, true), -308)
  assert.equal(followTranslate(drawerSlot, -400, false, true), -308)
})

test('followTranslate: close stroke follows only toward the slot (leftward, LTR)', () => {
  const closedTx = -226.7
  // C3: leftward drag inside the open drawer follows toward the slot
  assert.equal(followTranslate(closedTx, -80, false, true), -80)
  // clamped at the closed slot
  assert.equal(followTranslate(closedTx, -400, false, true), -226.7)
  // rightward-logical = the legacy A-tier close direction: no follow
  assert.equal(followTranslate(closedTx, 40, false, true), null)
  assert.equal(followTranslate(closedTx, 0, false, true), null)
})

test('followTranslate: RTL mirrors both slot direction and gesture axis', () => {
  // RTL drawer slides off the RIGHT edge: closed slot is positive
  const closedTx = 226.7
  // open gesture: physically leftward (raw dx = -50) reveals the drawer
  assert.equal(followTranslate(closedTx, -50, true, false), 176.7)
  assert.equal(followTranslate(closedTx, 50, true, false), null)
  // close gesture: physically rightward (raw dx = +80) follows to the slot
  assert.equal(followTranslate(closedTx, 80, true, true), 80)
  assert.equal(followTranslate(closedTx, -80, true, true), null)
})

test('followTranslate: degenerate zero slot degrades to a constant no-op', () => {
  assert.equal(followTranslate(0, 100, false, false), 0)
  assert.equal(followTranslate(0, -100, false, true), 0)
})

// --- findHorizontalScroller (start-zone yield to native horizontal pans) ---

/** Chain-node factory: parent links are wired in reverse order of args. */
function node(over: Partial<SwipeChainNode>, parent: SwipeChainNode | null = null): SwipeChainNode {
  return {
    parent,
    scrollWidth: 100,
    clientWidth: 100,
    overflowX: 'visible',
    ...over,
  }
}

test('findHorizontalScroller: exact decision table', () => {
  // auto + overflow → hit
  const hit = node({ overflowX: 'auto', scrollWidth: 600, clientWidth: 120 })
  assert.equal(findHorizontalScroller(hit), hit)
  // scroll + overflow → hit
  const hitScroll = node({ overflowX: 'scroll', scrollWidth: 601, clientWidth: 120 })
  assert.equal(findHorizontalScroller(hitScroll), hitScroll)
  // auto but NO overflow (scrollWidth == clientWidth) → miss (cannot pan)
  assert.equal(findHorizontalScroller(node({ overflowX: 'auto', scrollWidth: 120, clientWidth: 120 })), null)
  // overflow hidden/clip/visible → miss even with overflow (clipped: no pan)
  assert.equal(findHorizontalScroller(node({ overflowX: 'hidden', scrollWidth: 600, clientWidth: 120 })), null)
  assert.equal(findHorizontalScroller(node({ overflowX: 'clip', scrollWidth: 600, clientWidth: 120 })), null)
  assert.equal(findHorizontalScroller(node({ overflowX: 'visible', scrollWidth: 600, clientWidth: 120 })), null)
  // subpixel rounding within +1px → miss
  assert.equal(findHorizontalScroller(node({ overflowX: 'auto', scrollWidth: 121, clientWidth: 120 })), null)
  // empty chain → null
  assert.equal(findHorizontalScroller(null), null)
})

test('findHorizontalScroller: innermost matching container wins, walk reaches ancestors', () => {
  // Chain: target(vis) → row(auto, overflow) → page(hidden, overflow).
  // The ROW is the innermost scrollable: a stroke on the row's children
  // belongs to the row's pan, not to any outer clipped box.
  const outer = node({ overflowX: 'hidden', scrollWidth: 900, clientWidth: 390 })
  const row = node({ overflowX: 'auto', scrollWidth: 800, clientWidth: 300 }, outer)
  const target = node({}, row)
  assert.equal(findHorizontalScroller(target), row)
  // Ancestor-only match: target itself is not a scroller but the parent is.
  const ancestorOnly = node({ overflowX: 'auto', scrollWidth: 500, clientWidth: 300 })
  const leaf = node({}, ancestorOnly)
  assert.equal(findHorizontalScroller(leaf), ancestorOnly)
  // No match anywhere up the chain → null (stroke stays with the gesture).
  const plain = node({}, node({}, node({})))
  assert.equal(findHorizontalScroller(plain), null)
})

// --- gesture-guard ---

/**
 * Lightweight fake element chain: the guard only reads `parentElement`
 * (walking the ancestor chain) and uses EventTarget identity, so a minimal
 * stub is enough — no DOM needed in node:test.
 */
interface FakeEl {
  parentElement: FakeEl | null
}
function makeChain(): { child: FakeEl; parent: FakeEl; root: FakeEl } {
  const root: FakeEl = { parentElement: null }
  const parent: FakeEl = { parentElement: root }
  const child: FakeEl = { parentElement: parent }
  return { child, parent, root }
}

test('gesture-guard: mark → consume → expires', () => {
  const { child } = makeChain()
  markGestureConsumed(child, 5)
  assert.equal(consumeIfGestured({ target: child }), true, 'live mark consumes')
  // Wait for expiry (performance.now is monotonic).
  const t0 = performance.now()
  while (performance.now() - t0 < 10) { /* spin */ }
  assert.equal(consumeIfGestured({ target: child }), false, 'expired mark no longer consumes')
  assert.equal(isGestureConsumed(child), false)
})

test('gesture-guard: ancestor-chain coverage with upTo', () => {
  const { child, parent, root } = makeChain()
  // Mark child up to root: child, parent, root all covered.
  markGestureConsumed(child, 100, root)
  assert.equal(consumeIfGestured({ target: child }), true)
  assert.equal(consumeIfGestured({ target: parent }), true)
  assert.equal(consumeIfGestured({ target: root }), true)
})

test('gesture-guard: axis-lock flag yields the host before any consume mark exists (audit S0)', () => {
  // Host document-capture pointerup runs before the gesture layer's, so
  // consume marks are not set yet. Axis lock (written on pointermove) is the
  // race-free yield so the host does not toggle before classify (dead gesture).
  assert.equal(isStrokeLocked(), false, 'idle: lock clear')
  markStrokeLocked() // what tryLock() does on horizontal dominance
  const { child } = makeChain()
  assert.equal(consumeIfGestured({ target: child }), false, 'no consume mark yet — the S0 race window')
  // The host's first-line check on the same release event:
  assert.equal(
    isStrokeLocked() || consumeIfGestured({ target: child }),
    true,
    'host yields during a locked stroke even without marks',
  )
  clearStrokeLocked() // what reset() does at stroke end
  assert.equal(isStrokeLocked(), false, 'reset clears the lock')
})

test('gesture-guard: mark chain covers the synthetic click ancestor target (upTo)', () => {
  // After a stroke the browser dispatches a synthetic click whose target is
  // the release point or an ancestor of it (e.g. the row root). Production
  // marks up to the DRAWER; this test pins the chain invariant with a
  // root-anchored stub.
  const { child, parent, root } = makeChain()
  markGestureConsumed(child, 100, root)
  assert.equal(consumeIfGestured({ target: parent }), true)
})

test('gesture-guard: non-gesture events pass through', () => {
  const { child } = makeChain()
  assert.equal(consumeIfGestured({ target: child }), false)
})

// --- followOpenTransform (open-direction follow, percentage baseline) ---

test('followOpenTransform: rightward travel walks the drawer out of the -101% base', () => {
  // Percentage baseline: the element swaps ~206px rail → ~280px drawer mid-
  // stroke, so a px base misplaces by the width delta. Use 101% (not host
  // -110%): that overshoot hides early travel; 101% keeps a subpixel margin
  // while putting ~5px of edge on screen at the 8px arm.
  assert.equal(
    followOpenTransform(40, false),
    'translateX(min(0px, calc(-101% + 40px)))',
  )
  // min() clamps the open end: overshoot cannot drag past the resting spot.
  assert.equal(
    followOpenTransform(4000, false),
    'translateX(min(0px, calc(-101% + 4000px)))',
  )
})

test('followOpenTransform: no follow for non-positive logical travel', () => {
  assert.equal(followOpenTransform(0, false), null)
  assert.equal(followOpenTransform(-30, false), null)
})

test('followOpenTransform: RTL mirrors both the axis and the slot sign', () => {
  // RTL drawer parks at +110% when closed; the follow base mirrors at 101%.
  assert.equal(
    followOpenTransform(-40, true),
    'translateX(max(0px, calc(101% - 40px)))',
  )
  assert.equal(followOpenTransform(40, true), null)
})

test('selectionOwnsStroke: a live non-collapsed selection owns the stroke (#43)', () => {
  const g = globalThis as { window?: unknown }
  const originalWindow = g.window
  const setSelection = (sel: { isCollapsed: boolean } | null): void => {
    g.window = { getSelection: () => sel }
  }
  try {
    // Handle drag: the selection already exists when the finger goes down.
    setSelection({ isCollapsed: false })
    assert.equal(selectionOwnsStroke(), true)
    // No live selection (or a caret): the swipe layer stays armed.
    setSelection({ isCollapsed: true })
    assert.equal(selectionOwnsStroke(), false)
    setSelection(null)
    assert.equal(selectionOwnsStroke(), false)
  } finally {
    g.window = originalWindow
  }
})

test('selectionOwnsStroke: feature-detected false without a DOM window', () => {
  const g = globalThis as { window?: unknown }
  const originalWindow = g.window
  delete g.window
  try {
    assert.equal(selectionOwnsStroke(), false)
  } finally {
    g.window = originalWindow
  }
})

test('selectionOwnsStroke: a focused text control owns the stroke via selectionStart/End (#44)', () => {
  const g = globalThis as { window?: unknown; document?: unknown }
  const originalWindow = g.window
  const originalDocument = g.document
  // Document selection stays collapsed while a composer field selection is live (#44).
  g.window = { getSelection: () => ({ isCollapsed: true }) }
  const setActive = (active: unknown): void => {
    g.document = { activeElement: active }
  }
  try {
    // Composer handle drag: the textarea reports the live range.
    setActive({ tagName: 'TEXTAREA', selectionStart: 0, selectionEnd: 20 })
    assert.equal(selectionOwnsStroke(), true)
    // <input> is covered by the same element-level model.
    setActive({ tagName: 'INPUT', selectionStart: 2, selectionEnd: 5 })
    assert.equal(selectionOwnsStroke(), true)
    // A caret (collapsed range) inside a focused field is NOT a selection:
    // the swipe layer must stay armed, or the drawer would become
    // unreachable whenever the composer holds focus.
    setActive({ tagName: 'TEXTAREA', selectionStart: 3, selectionEnd: 3 })
    assert.equal(selectionOwnsStroke(), false)
    // Non-text input types report null selectionStart/End (number/email/checkbox).
    setActive({ tagName: 'INPUT', selectionStart: null, selectionEnd: null })
    assert.equal(selectionOwnsStroke(), false)
    // Older engines throw InvalidStateError instead of reporting null; the
    // predicate must not let that escape into a pointer handler.
    setActive({
      tagName: 'INPUT',
      get selectionStart(): number {
        throw new Error('InvalidStateError')
      },
      selectionEnd: null,
    })
    assert.equal(selectionOwnsStroke(), false)
    // Non-field focus (a button, the body) is never a selection owner.
    setActive({ tagName: 'BUTTON', selectionStart: 0, selectionEnd: 9 })
    assert.equal(selectionOwnsStroke(), false)
    setActive(null)
    assert.equal(selectionOwnsStroke(), false)
  } finally {
    g.window = originalWindow
    if (originalDocument === undefined) delete g.document
    else g.document = originalDocument
  }
})

test('selectionOwnsStroke: the document selection still wins with no focused field (#43 regression)', () => {
  const g = globalThis as { window?: unknown; document?: unknown }
  const originalWindow = g.window
  const originalDocument = g.document
  g.window = { getSelection: () => ({ isCollapsed: false }) }
  g.document = { activeElement: null }
  try {
    assert.equal(selectionOwnsStroke(), true)
  } finally {
    g.window = originalWindow
    if (originalDocument === undefined) delete g.document
    else g.document = originalDocument
  }
})

// --- Files gesture pure functions (files-swipe-gesture-design) ---

const FILES_BASE = {
  distanceRatio: 0.16,
  velocity: 0.45,
  lockPx: 8,
  viewportWidthPx: 390,
  // Runtime passes the drawer's CLOSE_DISTANCE_RATIO for the drawer-open cell.
  drawerCloseDistanceRatio: 0.13,
}

function filesClassify(
  over: Partial<Parameters<typeof classifyFilesSwipe>[0] & Parameters<typeof classifyFilesSwipe>[1]>,
  rtl = false,
): 'open' | 'close' | 'files' | 'none' {
  const t = {
    ...FILES_BASE,
    panelOpen: false,
    drawerOpen: false,
    ...(over as { panelOpen?: boolean; drawerOpen?: boolean }),
  }
  const m = {
    dx: 0,
    dy: 0,
    velX: 0,
    ...(over as { dx?: number; dy?: number; velX?: number }),
  }
  return classifyFilesSwipe(t, m, rtl)
}

test('filesZoneHit: right-edge zone boundaries (LTR)', () => {
  const zone = 176 // startZonePxFor(390, 0.45)
  assert.equal(filesZoneHit(390, 390, false, zone), true) // edge 0
  assert.equal(filesZoneHit(389, 390, false, zone), true) // edge 1
  assert.equal(filesZoneHit(214, 390, false, zone), true) // edge 176 = zone
  assert.equal(filesZoneHit(213, 390, false, zone), false) // edge 177
})

test('filesZoneHit: RTL mirrors to the LEFT edge', () => {
  const zone = 176
  assert.equal(filesZoneHit(0, 390, true, zone), true) // edge 0
  assert.equal(filesZoneHit(176, 390, true, zone), true) // edge 176
  assert.equal(filesZoneHit(177, 390, true, zone), false) // edge 177
})

test('classifyFilesSwipe: lock slop + axis dominance', () => {
  assert.equal(filesClassify({ dx: 7, dy: 0 }), 'none')
  assert.equal(filesClassify({ dx: -7, dy: 0 }), 'none')
  assert.equal(filesClassify({ dx: 10, dy: 10 }), 'none')
})

test('classifyFilesSwipe: both closed — leftward opens files, rightward is none', () => {
  assert.equal(filesClassify({ dx: -63, dy: 0 }), 'files') // 63/390 = 0.1615 ≥ 0.16
  assert.equal(filesClassify({ dx: -50, dy: 0, velX: -0.7 }), 'files') // short fast fling
  assert.equal(filesClassify({ dx: -100, dy: 0, velX: -0.1 }), 'files') // slow long drag
  assert.equal(filesClassify({ dx: -30, dy: 0, velX: -0.2 }), 'none') // too short + too slow
  assert.equal(filesClassify({ dx: 120, dy: 0 }), 'none') // rightward, everything closed
})

test('classifyFilesSwipe: panel open — rightward closes it, leftward NEVER collapses (左滑永不收起)', () => {
  assert.equal(filesClassify({ dx: 63, dy: 0, panelOpen: true }), 'files')
  assert.equal(filesClassify({ dx: 40, dy: 0, velX: 0.7, panelOpen: true }), 'files')
  assert.equal(filesClassify({ dx: -120, dy: 0, panelOpen: true }), 'none')
  assert.equal(filesClassify({ dx: 40, dy: 0, velX: -0.7, panelOpen: true }), 'none') // velocity contradicts direction
})

test('classifyFilesSwipe: drawer open — rightward routes to the animated drawer close, leftward is none', () => {
  assert.equal(filesClassify({ dx: 51, dy: 0, drawerOpen: true }), 'close')
  assert.equal(filesClassify({ dx: 40, dy: 0, velX: 0.7, drawerOpen: true }), 'close')
  // Leftward beside an open drawer must not close it.
  assert.equal(filesClassify({ dx: -120, dy: 0, drawerOpen: true }), 'none')
  assert.equal(filesClassify({ dx: -40, dy: 0, velX: -0.7, drawerOpen: true }), 'none')
})

test('classifyFilesSwipe: drawer open — the rightward close obeys the drawer close gates (no jitter close)', () => {
  // Files zone overlaps the open drawer (~66px at 390px); small drifts must not
  // close. This cell uses the drawer close gates (0.13× viewport or 0.45px/ms).
  assert.equal(filesClassify({ dx: 9, dy: 0, drawerOpen: true }), 'none')
  assert.equal(filesClassify({ dx: 40, dy: 0, drawerOpen: true }), 'none') // under 0.13 × 390 = 50.7px, no fling
  assert.equal(filesClassify({ dx: 51, dy: 0, velX: 0, drawerOpen: true }), 'close') // just past the distance gate  assert.equal(filesClassify({ dx: 9, dy: 0, velX: 0.7, drawerOpen: true }), 'close') // a real flick still counts
  assert.equal(filesClassify({ dx: 9, dy: 0, velX: -0.7, drawerOpen: true }), 'none') // fling against the stroke
  assert.equal(filesClassify({ dx: 0, dy: 0, velX: 0.7, drawerOpen: true }), 'none') // a fling alone needs the axis lock
})

test('the two families judge the drawer close alike (same physical stroke, right zone vs left zone)', () => {
  // Right-edge files routing must match drawer-family close across distance/
  // velocity space (zone overlaps drawer by ~66px at 390px).
  const m = (dx: number, velX: number) => ({ dx, dy: 0, velX })
  for (const [dx, velX] of [
    [9, 0], [20, 0], [40, 0.2], [50, 0.44], [51, 0],
    [70, 0], [120, 0], [9, 0.46], [9, 0.7], [40, 0.7], [60, -0.7],
  ] as const) {
    const drawer = classify({ dx, dy: 0, velX, drawerOpen: true })
    // The files family's drawer cell only speaks 'close' | 'none'.
    const files = filesClassify({ dx, dy: 0, velX, drawerOpen: true })
    assert.equal(files === 'close', drawer === 'close', `dx=${dx} velX=${velX}: drawer=${drawer} files=${files}`)
    assert.notEqual(files, 'files', `dx=${dx} velX=${velX}: the drawer-open cell must never toggle the panel`)
  }
})

test('classifyFilesSwipe: both open — the visible top (drawer) owns the close', () => {
  assert.equal(filesClassify({ dx: 120, dy: 0, panelOpen: true, drawerOpen: true }), 'close')
  assert.equal(filesClassify({ dx: -120, dy: 0, panelOpen: true, drawerOpen: true }), 'none')
})

test('classifyFilesSwipe: RTL mirrors the directions', () => {
  assert.equal(filesClassify({ dx: 63, dy: 0 }, true), 'files') // raw +63 = leftward-logical
  assert.equal(filesClassify({ dx: 40, dy: 0, velX: 0.7 }, true), 'files') // rtl leftward fling
  assert.equal(filesClassify({ dx: -63, dy: 0, panelOpen: true }, true), 'files') // raw -63 = rightward-logical
  assert.equal(filesClassify({ dx: -63, dy: 0, drawerOpen: true }, true), 'close')
  assert.equal(filesClassify({ dx: -120, dy: 0 }, true), 'none') // rtl rightward, everything closed
})

test('openStateStartMode: the drawer body always owns its stroke', () => {
  // Inside the drawer body the drawer family wins; outside, files zone keeps
  // its routing (including leftward 'none' when the drawer is open).
  assert.equal(openStateStartMode(true, true), 'drawer')
  assert.equal(openStateStartMode(true, false), 'drawer')
  assert.equal(openStateStartMode(false, true), 'files')
  assert.equal(openStateStartMode(false, false), 'drawer')
})

test('clearFollowInlineStyles: dispose clears important transform/transition', () => {
  const removed: string[] = []
  const el = {
    style: {
      removeProperty(name: string) {
        removed.push(name)
      },
    },
  } as unknown as HTMLElement
  clearFollowInlineStyles(el)
  assert.deepEqual(removed, ['transition', 'transform'])
})
