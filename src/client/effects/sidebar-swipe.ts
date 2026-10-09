import type { ClientContext } from '../client-context.ts'
import { installMobileEffect, getFrame } from './phone-chrome.ts'
import { markGestureConsumed, consumeIfGestured, markStrokeLocked, clearStrokeLocked } from './gesture-guard.ts'
import { fadeOverlayOut } from './overlay-backdrop-fab.ts'

/**
 * Sidebar drawer and files-panel swipe gestures (hybrid follow).
 *
 * Edge swipe-in early-commits host open at axis-lock while the drawer stays
 * pinned off-screen, then follows the finger. Open-drawer leftward drag
 * follows into the slot; rightward close is classify-only (legacy). Release
 * uses classifySwipe (distance OR velocity); commit is
 * `ctx.layout.toggleSidebar()`. Follow rides the host transition: inline
 * `transition:none` + translateX during the stroke, then drop styles and
 * retarget in the same task (no paint between).
 *
 * Backdrop stays binary; mid-stroke modals revert per move; open final state
 * ends at transform:none (containing-block for fixed descendants). Coexists
 * with host overlay handlers via gesture-guard: axis-lock before pointerup,
 * plus consume marks for synthetic clicks. Disposer aborts the live stroke.
 */

/**
 * Start-zone width as a fraction of viewport: left (RTL: right) strip counts
 * as "from the edge". Wide enough to clear Chrome Android's ~48dp history-nav
 * edge strip (browser claims those strokes and pointercancels). Widget
 * conflicts yield via data-mobile-nav-dragging / findFloatingWidget instead of
 * shrinking the zone. Release classification still gates commit; vertical
 * strokes reset at axis lock; horizontal scrollers are excluded
 * (findHorizontalScroller — load-bearing at this width).
 */
const START_ZONE_RATIO = 0.45

/**
 * Zone width in px for a given viewport (pure, for decision-table tests).
 * Rounded so boundary assertions stay integral.
 */
export function startZonePxFor(viewportWidthPx: number, ratio: number = START_ZONE_RATIO): number {
  return Math.round(viewportWidthPx * ratio)
}
/**
 * Axis-lock threshold: once the dominant axis moves this far, the axis is
 * decided. Horizontal (|dx| > |dy|) locks to X; vertical abandons to native
 * scroll. 8px tolerates tap jitter while still deciding within ~16ms.
 */
const LOCK_PX = 8
/** Distance thresholds as a fraction of viewport. Open stays above close so
 *  an accidental reverse swipe cannot re-open. */
const OPEN_DISTANCE_RATIO = 0.16
const CLOSE_DISTANCE_RATIO = 0.13
/** Velocity window: most-recent-60ms instantaneous speed (end-segment slope). */
const VELOCITY_WINDOW_MS = 60
/** px/ms speed thresholds for open / close. */
const OPEN_VELOCITY = 0.45
const CLOSE_VELOCITY = 0.45
/** Covers the .28s CSS transition; prevents reverse-gesture double-toggles. */
const COOLDOWN_MS = 350
/**
 * How long a consume mark stays live (covers the synthetic click). Short by
 * design: browsers fire that click within tens of ms; iOS shells suppress it
 * — a long window would swallow the next genuine tap. When `upTo` is absent
 * the walk can reach the document root, so this also bounds tap suppression.
 */
const CONSUME_WINDOW_MS = 300
/**
 * Open follow arms at axis lock: tryLock already required LOCK_PX of
 * horizontal-dominant travel, so no extra margin — delaying arm left a dead
 * zone before the drawer edge appeared. Release still decides the outcome.
 */
const OPEN_FOLLOW_ARM_PX = 8
/**
 * Host closed-slot offset as a percentage of the drawer's own width
 * (`translateX(-110%)` — 10% overshoot hides the shadow). Percentage is
 * load-bearing for open follow: width changes when React swaps the rail for
 * the drawer; % re-resolves, a cached px value would not.
 */
const CLOSED_SLOT_PCT = 110
/** Self-run terminal close animation; matches the host's .28s transition. */
const COMMIT_ANIM_MS = 280
/**
 * Open-follow baseline percentage. Host closed slot is -110%, but following
 * from -110% hides the first ~28px of travel (10% of a ~280px drawer). 101%
 * keeps a small subpixel margin so the edge answers the finger right after
 * axis lock. Terminal states still use CLOSED_SLOT_PCT verbatim.
 */
const OPEN_FOLLOW_BASE_PCT = 101

/**
 * Files-panel (host right sidebar) gesture — right-edge mirror of the drawer.
 * Zone ratio matches the drawer: a narrow strip hits Chrome Android's ~48dp
 * history-nav edge and pointercancels.
 */
const FILES_ZONE_RATIO = 0.45
/**
 * Distance threshold (fraction of viewport) for both files directions.
 * Drawer keeps a separate close ratio because close follows into its slot;
 * files strokes have no follow, so one ratio serves both.
 */
const FILES_DISTANCE_RATIO = 0.16
/** px/ms velocity threshold for both files directions (drawer parity). */
const FILES_VELOCITY = 0.45

/** Pointer id we are tracking (multi-touch is ignored). */
let trackingPointer = 0
/** True once the stroke is axis-locked. */
let tracking = false
/** Stroke samples (x + timestamp) for recent-window velocity. */
let samples: Array<{ t: number; x: number }> = []
/** Stroke origin (for the direction-bias check). */
let startX = 0
let startY = 0
/** Drawer visibility at lock time. */
let lockDrawerOpen = false
/** Expiry of the post-release cooldown (performance.now()). */
let cooldownUntil = 0
/** Element whose stroke was marked consumed (null = no live mark). */
let consumedEl: Element | null = null

/**
 * Follow cache — set once at lock so per-move writes never read layout.
 * followDrawer stays bound for the whole stroke (direction wobble reuses it).
 */
let followDrawer: HTMLElement | null = null
let followEngaged = false
let strokeClosedTx = 0
let strokeRtl = false
/**
 * True while an open stroke early-committed the host (drawer mounted, pinned
 * in slot, following). Release must keep open or toggle back.
 */
let openFollowArmed = false
/**
 * True once open follow was refused this stroke (modal/takeover/missing
 * drawer) so it never retries mid-stroke.
 */
let openFollowRefused = false

/**
 * Gesture family for the current stroke: 'drawer' or 'files' (no follow;
 * host-panel commit). Written by beginStroke only.
 */
let strokeMode: 'drawer' | 'files' = 'drawer'
/** Files-panel visibility at lock time (mirror of lockDrawerOpen). */
let lockFilesOpen = false
/**
 * Files-panel toggle injected at install (open and close share one function).
 * Module-level because endStroke is; default no-op for node:test import.
 */
let filesToggleFn: () => boolean = () => false

export interface SwipeThresholds {
  openDistanceRatio: number
  closeDistanceRatio: number
  velocityWindowMs: number
  openVelocity: number
  closeVelocity: number
  lockPx: number
  cooldownMs: number
  startZonePx: number
}

/**
 * Pure decision: what does this stroke do, given the drawer state?
 * `dx`/`dy` are raw pointer deltas (RTL mirrors X via `rtl`), `velX` is
 * recent-window X velocity. Requires horizontal lock; then distance OR
 * velocity wins with the drawer-state-specific threshold.
 */
export function classifySwipe(
  t: SwipeThresholds & { viewportWidthPx: number; drawerOpen: boolean },
  m: { dx: number; dy: number; velX: number },
  rtl: boolean,
): 'open' | 'close' | 'none' {
  // RTL mirrors X: normalize to logical direction before judging.
  const dx = rtl ? -m.dx : m.dx
  if (Math.abs(dx) <= t.lockPx) return 'none'
  if (Math.abs(dx) <= Math.abs(m.dy)) return 'none'
  if (t.drawerOpen) {
    // Both horizontal directions close: leftward is the follow-painted
    // "push into slot" path; refusing it made the drawer track then spring
    // back. Rightward stays accepted (legacy close). Nothing else competes
    // for a horizontal stroke while the drawer is open.
    const travel = Math.abs(dx)
    if (travel / t.viewportWidthPx >= t.closeDistanceRatio) return 'close'
    const velX = rtl ? -m.velX : m.velX
    // Fling only counts when it agrees with the stroke's own direction.
    if (velX > 0 !== dx > 0) return 'none'
    return Math.abs(velX) >= t.closeVelocity ? 'close' : 'none'
  }
  if (dx <= 0) return 'none'
  if (dx / t.viewportWidthPx >= t.openDistanceRatio) return 'open'
  const velX = rtl ? -m.velX : m.velX
  return velX >= t.openVelocity ? 'open' : 'none'
}

/** Threshold shape for the files classifier (pure, node:testable). */
export interface FilesThresholds {
  distanceRatio: number
  velocity: number
  lockPx: number
  viewportWidthPx: number
  /** Files panel mounted at lock time. */
  panelOpen: boolean
  /** Drawer open at lock time. */
  drawerOpen: boolean
  /**
   * Distance gate for the drawer-open rightward cell. That cell commits a
   * DRAWER close, so it rides the drawer's own CLOSE_DISTANCE_RATIO (0.13),
   * not the files panel's 0.16: one physical stroke must judge the same
   * wherever it starts. Optional — defaults to `distanceRatio`.
   */
  drawerCloseDistanceRatio?: number
}

/**
 * Pure decision for the files gesture (right-edge zone), mirror of
 * classifySwipe. RTL mirrors X the same way. Verdicts add `files`:
 * - leftward opens the panel only when panel and drawer are both closed
 *   (otherwise 'none' — panel would mount under an open drawer and be
 *   invisible; leftward never collapses anything);
 * - rightward closes the visible top: drawer open → 'close' (animated
 *   commitFollowClose, drawer thresholds); else panel open → 'files'.
 */
export function classifyFilesSwipe(
  t: FilesThresholds,
  m: { dx: number; dy: number; velX: number },
  rtl: boolean,
): 'open' | 'close' | 'files' | 'none' {
  const dx = rtl ? -m.dx : m.dx
  if (Math.abs(dx) <= t.lockPx) return 'none'
  if (Math.abs(dx) <= Math.abs(m.dy)) return 'none'
  const velX = rtl ? -m.velX : m.velX
  if (dx < 0) {
    if (t.panelOpen || t.drawerOpen) return 'none'
    if (-dx / t.viewportWidthPx >= t.distanceRatio) return 'files'
    // A fling only counts when it agrees with the stroke's own direction
    // (the same contradiction guard classifySwipe applies).
    if (velX > 0 !== dx > 0) return 'none'
    return -velX >= t.velocity ? 'files' : 'none'
  }
  if (t.drawerOpen) {
    // Same gates as classifySwipe close (including CLOSE_DISTANCE_RATIO): this
    // cell is the drawer-close path, so both families must judge one stroke
    // alike. Without the gate, the files zone overlaps the open drawer and a
    // slight sideways drift while scrolling would close and consume the tap.
    const closeRatio = t.drawerCloseDistanceRatio ?? t.distanceRatio
    if (dx / t.viewportWidthPx >= closeRatio) return 'close'
    if (velX <= 0) return 'none'
    return velX >= t.velocity ? 'close' : 'none'
  }
  if (t.panelOpen) {
    if (dx / t.viewportWidthPx >= t.distanceRatio) return 'files'
    if (velX > 0 !== dx > 0) return 'none'
    return velX >= t.velocity ? 'files' : 'none'
  }
  return 'none'
}

/**
 * Recent-window instantaneous velocity (px/ms): slope between the last two
 * in-window samples so a slow drag then a flick reports the flick. Older
 * samples ignored; fewer than two → 0.
 */
export function slidingVelocity(
  samples: Array<{ t: number; x: number }>,
  windowMs: number,
  now: number,
): number {
  const cutoff = now - windowMs
  const inWindow = samples.filter((s) => s.t >= cutoff)
  if (inWindow.length < 2) return 0
  const a = inWindow[inWindow.length - 2]!
  const b = inWindow[inWindow.length - 1]!
  const dt = b.t - a.t
  if (dt <= 0) return 0
  return (b.x - a.x) / dt
}

/**
 * Geometric start-hit: pointer down in the left-edge start zone. Pure and
 * viewport-relative (unit-testable); runtime also checks drawer geometry.
 */
export function hitTestStart(
  clientX: number,
  viewportWidthPx: number,
  rtl: boolean,
  t: Pick<SwipeThresholds, 'startZonePx'>,
): boolean {
  const edge = rtl ? viewportWidthPx - clientX : clientX
  return edge >= 0 && edge <= t.startZonePx
}

/**
 * Geometric start-hit for the files gesture: right-edge zone (RTL: left) —
 * mirror of hitTestStart. Pure and viewport-relative.
 */
export function filesZoneHit(
  clientX: number,
  viewportWidthPx: number,
  rtl: boolean,
  zonePx: number,
): boolean {
  const edge = rtl ? clientX : viewportWidthPx - clientX
  return edge >= 0 && edge <= zonePx
}

/**
 * Gesture family for a stroke that begins while the drawer is open. Inside
 * the drawer body the drawer family always wins (own surface must answer
 * leftward drag even where the files zone overlaps). Outside, the right zone
 * keeps files routing and its leftward 'none' verdict.
 */
export function openStateStartMode(insideDrawer: boolean, inFilesZone: boolean): 'drawer' | 'files' {
  return insideDrawer || !inFilesZone ? 'drawer' : 'files'
}

/**
 * Pure follow mapping: translateX (px) for a stroke sample, or null when
 * this sample has no follow. `closedTx` is the signed closed-slot translateX
 * (negative LTR, positive RTL); `dx` is the raw pointer delta; normalization
 * mirrors classifySwipe (rightward-logical = toward open).
 *
 * Close (drawer open): leftward-logical follows toward the slot (clamped);
 * rightward → null (legacy classify-only close). Open (drawer closed): not
 * used at runtime — `followOpenTransform` keeps a percentage baseline across
 * the subtree swap; this px mapping is the tested reference. Degenerate zero
 * slot yields 0 (no-op) rather than inventing travel.
 */
export function followTranslate(
  closedTx: number,
  dx: number,
  rtl: boolean,
  drawerOpen: boolean,
): number | null {
  const dir = closedTx <= 0 ? -1 : 1
  const slot = Math.abs(closedTx)
  const d = rtl ? -dx : dx
  if (drawerOpen) {
    if (d >= 0) return null
    // + 0 normalizes -0 (dir=-1 times a clamped 0) so strict equality in the
    // decision table and in probe comparisons sees a plain zero.
    return dir * Math.min(slot, -d) + 0
  }
  if (d <= 0) return null
  return dir * (slot - Math.min(slot, d)) + 0
}

/**
 * Pure follow mapping for the open direction after early host commit, or
 * null when pulled back past the stroke origin (leftward-logical).
 *
 * Baseline is the host's percentage slot (`translateX(-110%)`): at arm time
 * the element is still the collapsed rail; a frame later React swaps in the
 * wider drawer. A px baseline captured before the swap would be wrong;
 * percentage re-resolves against current width. `min()`/`max()` clamp so
 * overshoot cannot pass the resting position.
 */
export function followOpenTransform(travelPx: number, rtl: boolean): string | null {
  const t = rtl ? -travelPx : travelPx
  if (t <= 0) return null
  return rtl
    ? `translateX(max(0px, calc(${OPEN_FOLLOW_BASE_PCT}% - ${t}px)))`
    : `translateX(min(0px, calc(-${OPEN_FOLLOW_BASE_PCT}% + ${t}px)))`
}

/**
 * Minimal ancestor snapshot for the horizontal-scroller walk. Plain data on
 * purpose: the pure walk below is node:testable, and the runtime maps real
 * Elements onto this shape (chainFrom) before calling it.
 */
export interface SwipeChainNode {
  parent: SwipeChainNode | null
  scrollWidth: number
  clientWidth: number
  overflowX: string
}

/**
 * Pure walk: innermost chain node that is genuinely horizontally scrollable
 * (overflow-x auto/scroll and scrollWidth > clientWidth + 1 for subpixel).
 * A stroke starting inside one belongs to that scroller — do not compete or
 * preventDefault (would break native pan near the left edge at 45% zone).
 * overflow-x hidden/clip never match; those strokes stay free for gestures.
 */
export function findHorizontalScroller(node: SwipeChainNode | null): SwipeChainNode | null {
  let cur = node
  while (cur !== null) {
    if (
      (cur.overflowX === 'auto' || cur.overflowX === 'scroll') &&
      cur.scrollWidth > cur.clientWidth + 1
    ) {
      return cur
    }
    cur = cur.parent
  }
  return null
}

/** The open drawer element: first child of the plugin frame. */
function findDrawer(): HTMLElement | null {
  const frame = getFrame()
  return frame !== null && frame.firstElementChild instanceof HTMLElement
    ? frame.firstElementChild
    : null
}

/** True when the drawer is currently open (per the collapsed marker). */
function drawerOpen(): boolean {
  const frame = getFrame()
  return frame !== null && !frame.hasAttribute('data-sidebar-collapsed')
}

/**
 * True when the host's right sidebar files panel is visible (fullscreen or
 * docked). The panel element is persistent when closed (`visibility: hidden`,
 * rect pushed off-screen), so presence alone is not the state read — check
 * visibility / display / rect. Hosts without the panel return false.
 */
function filesPanelOpen(): boolean {
  const panel = document.querySelector('[data-sidebar-right-panel]')
  if (panel === null) return false
  const cs = getComputedStyle(panel)
  if (cs.visibility === 'hidden' || cs.display === 'none') return false
  return panel.getBoundingClientRect().left < window.innerWidth
}

/**
 * Map the real DOM ancestor chain (target first, root last) onto the plain
 * SwipeChainNode shape findHorizontalScroller walks. Bounded by the document
 * depth (~15 nodes in this app) and run once per pointerdown, so the
 * getComputedStyle calls are not a per-frame cost.
 */
function chainFrom(target: Element): SwipeChainNode | null {
  let node: SwipeChainNode | null = null
  let el: Element | null = target
  while (el !== null) {
    node = {
      parent: node,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      overflowX: getComputedStyle(el).overflowX,
    }
    el = el.parentElement
  }
  return node
}

/** Whether a modal dialog owns the screen (gestures must yield to it). */
function modalOpen(): boolean {
  return document.querySelector('[aria-modal="true"]') !== null
}

/**
 * True when a full-screen takeover (taskboard / ssh) or a host
 * conversation.view overlay (`data-conversation-composer-overlay`) owns the
 * frame. Edge-swipe yields so content scrolling wins the start zone; FAB
 * still opens the drawer.
 */
function takeoverActive(): boolean {
  return (
    document.documentElement.hasAttribute('data-dsh-taskboard-active') ||
    document.documentElement.hasAttribute('data-dsh-ssh-active') ||
    document.querySelector('[data-conversation-composer-overlay]') !== null
  )
}

/**
 * Whether a live, non-collapsed text selection owns the pointer stroke.
 * Selection-handle drags are horizontally dominant and indistinguishable from
 * a swipe — the browser must keep them (iPad WebKit). Feature-detected for
 * node:test without a DOM.
 *
 * Two disjoint models: document selection (message text / contenteditable),
 * and text-control selectionStart/End (invisible to getSelection). Reading
 * only the document model let the swipe layer collapse a composer selection
 * being extended. document.activeElement anchors the element model.
 */
export function selectionOwnsStroke(): boolean {
  if (typeof window === 'undefined') return false
  const sel = window.getSelection()
  if (sel !== null && !sel.isCollapsed) return true
  if (typeof document === 'undefined') return false
  const el = document.activeElement as HTMLTextAreaElement | null
  if (el === null) return false
  const tag = el.tagName
  if (tag !== 'TEXTAREA' && tag !== 'INPUT') return false
  // Types without a text selection report null; older WebKit/Gecko throw
  // InvalidStateError. Both mean "no selection dragged", not "owns stroke".
  try {
    const { selectionStart: start, selectionEnd: end } = el
    return typeof start === 'number' && typeof end === 'number' && start !== end
  } catch {
    return false
  }
}

/** Whether the swipe layer is on cooldown (animation in flight). */
function onCooldown(): boolean {
  return performance.now() < cooldownUntil
}

/**
 * Yield when a live drag marks `data-mobile-nav-dragging` on the held
 * element (or ancestor), or on documentElement/body as a global mark.
 * Checked at pointerdown and every axis-lock attempt: otherwise both layers
 * answer the same pointer and the drawer opens mid-drag. Once axis-locked,
 * a late mark does not unwind an armed open follow.
 */
function dragMarkYields(event: PointerEvent): boolean {
  if (document.documentElement.hasAttribute('data-mobile-nav-dragging')) return true
  if (document.body.hasAttribute('data-mobile-nav-dragging')) return true
  return (
    event.target instanceof Element &&
    event.target.closest('[data-mobile-nav-dragging]') !== null
  )
}

/**
 * Upper bound (px) for the small floating-widget positional heuristic.
 * Leaves headroom for plugin widgets; full-screen overlays cannot pass.
 */
const FLOATING_WIDGET_MAX_PX = 200

/**
 * Yield when the press lands in a small fixed/absolute layer (plugin
 * floating widgets with no standard draggable mark). First small positioned
 * ancestor wins. Excludes our frame subtree (FAB / backdrop / drawer have
 * their own semantics). Approximation: a static badge of this size also
 * yields; oversized widgets need data-mobile-nav-dragging or a higher cap.
 */
function findFloatingWidget(target: Element): Element | null {
  if (target.closest('[data-mobile-nav="frame"]') !== null) return null
  let el: Element | null = target
  while (el !== null) {
    if (el instanceof HTMLElement) {
      const cs = getComputedStyle(el)
      if (
        (cs.position === 'fixed' || cs.position === 'absolute') &&
        el.offsetWidth <= FLOATING_WIDGET_MAX_PX &&
        el.offsetHeight <= FLOATING_WIDGET_MAX_PX
      ) {
        return el
      }
    }
    el = el.parentElement
  }
  return null
}

function floatingWidgetYields(event: PointerEvent): boolean {
  return (
    event.target instanceof Element &&
    findFloatingWidget(event.target) !== null
  )
}

/**
 * Cache follow geometry once per locked stroke; per-move path is write-only.
 *
 * Close strokes follow from a px baseline read here. Open cannot: the host
 * renders two different subtrees in the same column (collapsed rail vs open
 * drawer). Dragging the closed column would only reveal the rail, so open
 * commits first then follows (armOpenFollow) with a percentage baseline.
 */
function startFollow(): void {
  // Unbind first: followDrawer survives across strokes (endStroke releases
  // styles after reset). Without this an open stroke inherits the previous
  // close-follow binding.
  followDrawer = null
  followEngaged = false
  openFollowArmed = false
  openFollowRefused = false
  // strokeRtl is read by applyFollow's open branch before arm — refresh every
  // locked stroke or open inherits the previous reading direction.
  strokeRtl = frameRtl()
  const drawer = findDrawer()
  if (drawer === null) return
  // Closed stroke binds nothing here: open early-commits and binds in
  // armOpenFollow with a percentage baseline (width changes on subtree swap).
  if (!lockDrawerOpen) return
  followDrawer = drawer
  // Slot is 110% of the open drawer's own width (host closed rule). Measuring
  // the open drawer is load-bearing: a baseline from the collapsed rail is
  // too short, so followTranslate clamps early and the drawer stalls short of
  // the edge. Width is stable for a close stroke (no mid-stroke swap), so px
  // is safe here — unlike open, which must stay percentage-based.
  const slot = (drawer.getBoundingClientRect().width * CLOSED_SLOT_PCT) / 100
  strokeClosedTx = strokeRtl ? slot : -slot
}

/**
 * Arm the open follow: pin the drawer in its closed slot with an important
 * inline pair, then flip the host in the same task. React mounts the real
 * drawer while the inline transform holds it off-screen. Pin before flip —
 * otherwise `transform: none` paints at rest for one frame. Backdrop/FAB
 * swap at the flip (binary; no opacity follow).
 */
/** True while arm-time content-visibility defers drawer subtree layout+paint. */
let cvDeferred = false

/** Re-materialize drawer contents after the mount-frame split. */
function revealDrawerContent(): void {
  if (!cvDeferred) return
  cvDeferred = false
  followDrawer?.style.removeProperty('content-visibility')
  const el = findDrawer()
  if (el !== null && el !== followDrawer) el.style.removeProperty('content-visibility')
}

function armOpenFollow(ctx: ClientContext): void {
  if (openFollowArmed || openFollowRefused) return
  const drawer = findDrawer()
  if (drawer === null || modalOpen() || takeoverActive()) {
    openFollowRefused = true
    return
  }
  followDrawer = drawer
  followEngaged = true
  drawer.style.setProperty('transition', 'none', 'important')
  const pinned = followOpenTransform(0.0001, strokeRtl)
  drawer.style.setProperty('transform', pinned ?? `translateX(-${CLOSED_SLOT_PCT}%)`, 'important')
  // Split mount cost: toggle synchronously mounts a large drawer subtree in
  // one long task. content-visibility:hidden before the flip skips subtree
  // layout+paint on the mount frame (box still paints; compositor follows);
  // contents materialize two frames later via revealDrawerContent. No-op
  // where unsupported.
  drawer.style.setProperty('content-visibility', 'hidden', 'important')
  cvDeferred = true
  openFollowArmed = true
  ctx.layout.toggleSidebar()
  requestAnimationFrame(() => {
    requestAnimationFrame(revealDrawerContent)
  })
}

/**
 * Paint this move sample's follow position. Null mapping (legacy direction
 * or pulled back past origin) pins rather than releasing — releasing would
 * let the host transition fight the finger. Re-engaging rewrites both
 * inline properties (also self-heals React restores mid-stroke).
 *
 * Both properties need `important`: open state is `transform: none
 * !important` (layout.css.ts containing-block rule), which outranks a plain
 * inline — without it the computed transform stays `none`. Assert computed
 * transform, not `element.style.transform`.
 */
function applyFollow(ctx: ClientContext, dx: number): void {
  if (!tracking || strokeMode !== 'drawer') return
  if (!lockDrawerOpen) {
    // Open: arm past threshold, then follow with percentage baseline.
    const travel = strokeRtl ? -dx : dx
    if (!openFollowArmed) {
      if (travel < OPEN_FOLLOW_ARM_PX) return
      armOpenFollow(ctx)
      if (!openFollowArmed) return
    }
    const value = followOpenTransform(dx, strokeRtl)
    if (value === null) {
      // Pulled back past origin: keep parked in slot (release still classifies).
      followDrawer?.style.setProperty(
        'transform',
        `translateX(-${CLOSED_SLOT_PCT}%)`,
        'important',
      )
      return
    }
    followDrawer?.style.setProperty('transform', value, 'important')
    return
  }
  if (followDrawer === null) return
  const tx = followTranslate(strokeClosedTx, dx, strokeRtl, lockDrawerOpen)
  if (tx === null) {
    // Pulled back past origin: pin at rest (releasing would restore the host
    // .28s transition mid-stroke and jump on direction wobble).
    followEngaged = true
    followDrawer.style.setProperty('transition', 'none', 'important')
    followDrawer.style.setProperty('transform', 'translateX(0px)', 'important')
    return
  }
  followEngaged = true
  followDrawer.style.setProperty('transition', 'none', 'important')
  followDrawer.style.setProperty('transform', `translateX(${tx}px)`, 'important')
}

/**
 * Clear gesture-owned inline transform/transition.
 * Dispose and release paths must call this so a stuck drawer never keeps
 * an `!important` transform after the effect tears down.
 */
export function clearFollowInlineStyles(el: HTMLElement): void {
  el.style.removeProperty('transition')
  el.style.removeProperty('transform')
}

/**
 * Drop inline follow styles so the host stylesheet retakes control and
 * animates from the finger position to the current host state. Called on
 * every end-stroke branch (revert = spring-back; commit retargets same-task).
 */
function releaseFollowStyles(): void {
  // Clear whenever bound, even if followEngaged was lost — dispose must not
  // leave an !important transform stuck.
  const el = followDrawer
  followEngaged = false
  if (el === null) return
  clearFollowInlineStyles(el)
}

/**
 * Close commit still animating to the closed slot before the host flips.
 * Flip must wait: the column renders two exclusive subtrees, and React swaps
 * them mid-transition if the marker flips early (width/tx jump). Late commit:
 * animate inline to the slot, flip only when off-screen, then drop styles.
 */
let pendingCommit: { el: HTMLElement; ctx: ClientContext; timer: number } | null = null

function finishPendingCommit(): void {
  const pending = pendingCommit
  if (pending === null) return
  pendingCommit = null
  window.clearTimeout(pending.timer)
  // Element may already be unmounted at the flip; stripping a detached node is a no-op.
  clearFollowInlineStyles(pending.el)
  // Host may already have closed (e.g. backdrop tap in the window) — skip or
  // a blind toggle would re-open.
  const frame = getFrame()
  if (frame !== null && !frame.hasAttribute('data-sidebar-collapsed')) {
    pending.ctx.layout.toggleSidebar()
  }
}

/**
 * Animate `el` to `targetTx`, flip the host when it lands. One-shot: a
 * second call settles the previous commit first.
 */
function commitWithAnimation(ctx: ClientContext, el: HTMLElement, targetTx: string): void {
  finishPendingCommit()
  el.style.setProperty('transition', `transform ${COMMIT_ANIM_MS}ms ease-in-out`, 'important')
  // Flush so the transition starts from the finger position, not a coalesced jump.
  void el.getBoundingClientRect()
  el.style.setProperty('transform', targetTx, 'important')
  // Fade dimming with the slide: marker flips only on land, so without this
  // the backdrop snaps away after the drawer already left.
  fadeOverlayOut()
  cooldownUntil = performance.now() + COOLDOWN_MS
  pendingCommit = {
    el,
    ctx,
    timer: window.setTimeout(finishPendingCommit, COMMIT_ANIM_MS + 40),
  }
}

/**
 * Terminal close: animate into the closed slot, then flip. Slot must be the
 * host's real closed rule (-110%) so dropping the inline pair is a no-op.
 */
function commitFollowClose(ctx: ClientContext): void {
  const el = followDrawer
  followDrawer = null
  followEngaged = false
  if (el === null) {
    // No follow binding: fall back to immediate flip.
    releaseFollowStyles()
    ctx.layout.toggleSidebar()
    cooldownUntil = performance.now() + COOLDOWN_MS
    return
  }
  const target = strokeRtl
    ? `translateX(${CLOSED_SLOT_PCT}%)`
    : `translateX(-${CLOSED_SLOT_PCT}%)`
  commitWithAnimation(ctx, el, target)
}

/**
 * Animate an open drawer into its closed slot, then flip. Non-gesture closers
 * (backdrop, Escape, nav taps) route here so click close matches swipe close:
 * the host swaps the pane subtree and drops its surface at the marker flip,
 * so a plain CSS transition would slide an invisible shell — hence late
 * commit. Open direction needs none of this (host keeps visuals until flip).
 * Returns false when the caller should plain-toggle (already closed, or
 * prefers-reduced-motion).
 */
export function closeDrawerAnimated(ctx: ClientContext): boolean {
  if (!drawerOpen()) return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  const drawer = findDrawer()
  if (drawer === null) return false
  const target = frameRtl()
    ? `translateX(${CLOSED_SLOT_PCT}%)`
    : `translateX(-${CLOSED_SLOT_PCT}%)`
  commitWithAnimation(ctx, drawer, target)
  return true
}

/**
 * Cancel: styles back to host, pointer idle. Armed open follow already
 * flipped the host — cancel must toggle back; release inline first so the
 * host transition animates home same-task.
 */
function abortStroke(ctx: ClientContext | null, immediate = false): void {
  if (pendingCommit !== null) {
    // Terminal commit animating: only dispose settles synchronously.
    if (immediate) finishPendingCommit()
    return
  }
  const wasArmed = openFollowArmed
  openFollowArmed = false
  openFollowRefused = false
  revealDrawerContent()
  if (wasArmed && ctx !== null && followDrawer !== null && !immediate) {
    // Armed mid-follow abort: host already open — animate into slot, then flip.
    reset()
    commitFollowClose(ctx)
    return
  }
  releaseFollowStyles()
  reset()
  if (wasArmed && ctx !== null) {
    ctx.layout.toggleSidebar()
    cooldownUntil = performance.now() + COOLDOWN_MS
  }
}

/** Start a stroke; returns true when it may be tracked. */
function beginStroke(
  event: PointerEvent,
  rtl: boolean,
  viewportWidthPx: number,
): boolean {
  if (onCooldown()) return false
  if (modalOpen()) return false
  if (takeoverActive()) return false
  // A live text selection owns the stroke (a selection-handle drag is
  // horizontally dominant and geometrically identical to a swipe — #43,
  // iPad WebKit): yield before any geometric test. This also blocks
  // swipe-open while a stale selection is alive; one tap collapses the
  // selection everywhere, and backdrop tap-to-close is unaffected (a tap
  // never reaches tryLock).
  if (selectionOwnsStroke()) return false
  // A live draggable (data-mobile-nav-dragging, see dragMarkYields) owns the
  // stroke: yield before any geometric test so the drawer cannot arm for a
  // drag that starts inside the start zone.
  if (dragMarkYields(event)) return false
  // Plugin-shipped draggable floating widgets (pet / floating-ball shapes
  // without any cooperation mark) yield the same way, via the positional
  // heuristic — the user pressed the widget itself.
  if (floatingWidgetYields(event)) return false
  if (!(event.target instanceof Element)) return false
  // A stroke beginning inside a genuinely horizontally scrollable container
  // belongs to that scroller (the stats line, a message code block, any
  // carousel): yield it so its native horizontal pan survives — and so the
  // wide 45%-of-viewport start zone cannot turn a strip scroll into a
  // drawer open (failure scenario C1). Applies to both branches: inside the
  // drawer the same "scroller owns horizontal" semantics should hold.
  if (findHorizontalScroller(chainFrom(event.target)) !== null) return false
  const open = drawerOpen()
  const filesZonePx = startZonePxFor(viewportWidthPx, FILES_ZONE_RATIO)
  if (open) {
    // While the drawer is open, any horizontal stroke over the frame may
    // close it (conversation sits behind the backdrop). The right-edge zone
    // is reserved for the files gesture: leftward there must not close
    // (files would open under the drawer); rightward still closes via
    // classifyFilesSwipe. Tap-to-close on the backdrop is unaffected (taps
    // never reach tryLock).
    const frame = getFrame()
    if (frame === null) return false
    const rect = frame.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right) return false
    if (event.clientY < rect.top || event.clientY > rect.bottom) return false
    // A session-row action menu (kebab) owns its own tap.
    if (event.target.closest('[class*="sessionRow"] button') !== null) return false
    // Inside the drawer body, drawer gestures win over the viewport-relative
    // files zone (which overlaps the drawer on narrow viewports).
    const drawer = findDrawer()
    const drawerRect = drawer === null ? null : drawer.getBoundingClientRect()
    const insideDrawer =
      drawerRect !== null && event.clientX >= drawerRect.left && event.clientX <= drawerRect.right
    strokeMode = openStateStartMode(
      insideDrawer,
      filesZoneHit(event.clientX, viewportWidthPx, rtl, filesZonePx),
    )
  } else if (hitTestStart(event.clientX, viewportWidthPx, rtl, { startZonePx: startZonePxFor(viewportWidthPx) })) {
    strokeMode = 'drawer'
  } else if (filesZoneHit(event.clientX, viewportWidthPx, rtl, filesZonePx)) {
    strokeMode = 'files'
  } else {
    return false
  }
  trackingPointer = event.pointerId
  tracking = false
  startX = event.clientX
  startY = event.clientY
  samples = [{ t: event.timeStamp, x: event.clientX }]
  return true
}

/**
 * Axis-lock the stroke once its dominant axis has moved LOCK_PX. Horizontal
 * dominance (|dx| > |dy|) locks to X and is tracked; vertical dominance
 * abandons the stroke back to native scrolling (browser takes over, no
 * further preventDefault). Once locked the axis never re-decides — matching
 * MUI's UNCERTAINTY_THRESHOLD semantics.
 */
function tryLock(event: PointerEvent): boolean {
  const dx = event.clientX - startX
  const dy = event.clientY - startY
  if (Math.max(Math.abs(dx), Math.abs(dy)) < LOCK_PX) return false
  // Second timing window for the drag mark (same pattern as the selection
  // check in onPointerMove): the dragger often raises the mark in its own
  // pointerdown/move handler, i.e. AFTER our beginStroke ran. Re-check at
  // every lock attempt so the stroke yields before the axis locks.
  if (dragMarkYields(event) || floatingWidgetYields(event)) {
    reset()
    return false
  }
  if (Math.abs(dx) <= Math.abs(dy)) {
    // Vertical-dominant: hand the touch back to scrolling.
    reset()
    return false
  }
  tracking = true
  lockDrawerOpen = drawerOpen()
  if (strokeMode === 'files') {
    lockFilesOpen = filesPanelOpen()
    // An OPEN drawer shares this stroke (the right-edge rightward close):
    // bind the drawer's close follow so the commit animates exactly like
    // today's right-zone close. applyFollow stays mode-guarded, so no follow
    // ever paints for files strokes — the LEFTWARD narrowing stroke gets no
    // painting either, which is the point (it must not drag the drawer).
    if (lockDrawerOpen) startFollow()
    markStrokeLocked()
    return true
  }
  // Publish the lock to host handlers (gesture-guard.ts): they run earlier
  // in this release event's capture phase, before endStroke writes any
  // consume mark — the flag is their only ordering-proof yield signal.
  markStrokeLocked()
  startFollow()
  return true
}

/** Append a sample and prune the window. */
function pushSample(event: PointerEvent): void {
  samples.push({ t: event.timeStamp, x: event.clientX })
  const cutoff = event.timeStamp - VELOCITY_WINDOW_MS
  let i = 0
  while (i < samples.length - 1 && samples[i]!.t < cutoff) i += 1
  if (i > 0) samples = samples.slice(i)
}

/**
 * Release the stroke: classify, then either commit or spring back.
 *
 * Hybrid-follow order matters: classify first (follow position is dx), then
 * drop inline follow styles (host transition resumes toward the current
 * state), then flip host state in the same task so motion stays continuous.
 * A revert simply animates home.
 *
 * An ARMED OPEN follow inverts the commit: the host state was already
 * flipped at arm time, so a positive verdict must NOT toggle again (that
 * would close the drawer the user just pulled out) and a negative verdict
 * must toggle BACK. Either way the inline release comes first, so the host
 * transition animates from the finger position to whichever state wins.
 */
function endStroke(
  ctx: ClientContext,
  event: PointerEvent,
  rtl: boolean,
  viewportWidthPx: number,
): void {
  const wasTracking = tracking
  const armedOpen = openFollowArmed
  openFollowArmed = false
  openFollowRefused = false
  // The stroke's mode and panel flag must be captured BEFORE reset(): reset()
  // rewrites strokeMode to 'drawer' and clears lockFilesOpen, and the verdict
  // below branches on them. Harmless for drawer strokes (whose mode already
  // reads 'drawer'), fatal for files strokes — the verdict silently degraded
  // to the drawer classifier and every files commit turned into 'none'.
  const filesMode = strokeMode === 'files'
  const filesOpenAtLock = lockFilesOpen
  // Velocity must be computed before reset() clears the samples.
  const vel = slidingVelocity(samples, VELOCITY_WINDOW_MS, event.timeStamp)
  // Distance is measured from the stroke START (not the axis-lock point):
  // the slop is an activation gate, not travel that should consume the
  // user's swipe distance. Measuring from the lock point made the effective
  // travel = slop + threshold (e.g. 4px + 78px), so a 78px threshold
  // actually needed ~82px+ of finger travel — the "feels like half the
  // screen" complaint. From the start, a 78px threshold is a 78px swipe.
  const dx = event.clientX - startX
  const dy = event.clientY - startY
  reset()
  if (!wasTracking) {
    // A stroke that armed the follow is by definition locked, so this branch
    // cannot leave the host state flipped — but keep the invariant explicit.
    if (armedOpen) {
      commitFollowClose(ctx)
    }
    return
  }
  const modal = modalOpen()
  // An armed open follow has already flipped the marker, so classifySwipe
  // must still be asked the question the USER answered: it was a closed
  // drawer when the stroke began (lockDrawerOpen), which is what the stored
  // flag holds — never re-read drawerOpen() here.
  const verdict =
    modal || (!armedOpen && onCooldown())
      ? ('none' as const)
      : filesMode
        ? classifyFilesSwipe(
            {
              distanceRatio: FILES_DISTANCE_RATIO,
              velocity: FILES_VELOCITY,
              lockPx: LOCK_PX,
              viewportWidthPx,
              panelOpen: filesOpenAtLock,
              drawerOpen: lockDrawerOpen,
              // The drawer-open cell commits a drawer close, so it keeps the
              // drawer's own close distance (the spec's "┍ identical to
              // today's close").
              drawerCloseDistanceRatio: CLOSE_DISTANCE_RATIO,
            },
            { dx, dy, velX: vel },
            rtl,
          )
        : classifySwipe(
            {
              openDistanceRatio: OPEN_DISTANCE_RATIO,
              closeDistanceRatio: CLOSE_DISTANCE_RATIO,
              velocityWindowMs: VELOCITY_WINDOW_MS,
              openVelocity: OPEN_VELOCITY,
              closeVelocity: CLOSE_VELOCITY,
              lockPx: LOCK_PX,
              cooldownMs: COOLDOWN_MS,
              startZonePx: startZonePxFor(viewportWidthPx),
              viewportWidthPx,
              drawerOpen: lockDrawerOpen,
            },
            { dx, dy, velX: vel },
            rtl,
          )
  // The mount-frame split must never survive into a terminal state: reveal
  // the contents (no-op unless armed this stroke) before any release or
  // commit animation.
  revealDrawerContent()
  // CLOSE commits are late: animate into the closed slot, then flip the
  // host once off-screen (early flip swaps the sidebar mid-animation).
  // OPEN / revert / modal / cooldown release without flipping; every path
  // either clears the inline styles or passes them to the pending commit.
  if (armedOpen) {
    // The host is already open (early commit). Keep it on 'open', otherwise
    // animate back into the slot and flip closed.
    if (verdict === 'open') {
      releaseFollowStyles()
      cooldownUntil = performance.now() + COOLDOWN_MS
    } else {
      commitFollowClose(ctx)
    }
    if (event.target instanceof Element) markStrokeConsumed(event.target)
    return
  }
  if (!(event.target instanceof Element)) return
  if (verdict === 'close') {
    // Mark the stroke consumed so the tap's synthetic click cannot
    // double-toggle or navigate a row. The mark walks the ancestor chain up
    // to the DRAWER (not the frame): the synthetic click always lands on the
    // stroke's own start target (left-edge start zone / drawer content), never
    // on the backdrop — but the backdrop is a frame child, so marking up to
    // the frame would make the host treat a genuine backdrop tap within the
    // 300ms window as consumed and swallow the close (the "tap twice to close"
    // bug). Marking stays IMMEDIATE even though the flip is late: the mark
    // snapshots the chain now, and the synthetic click arrives within ~10ms.
    markStrokeConsumed(event.target)
    commitFollowClose(ctx)
    return
  }
  releaseFollowStyles()
  if (verdict === 'open') {
    // Unreachable for a tracked stroke (an unarmed stroke is by definition
    // drawer-open at start), but keep the host-service commit symmetric.
    markStrokeConsumed(event.target)
    ctx.layout.toggleSidebar()
    cooldownUntil = performance.now() + COOLDOWN_MS
  }
  if (verdict === 'files') {
    // The files-panel commit: open (both closed + leftward) or close (panel
    // open + rightward). Toggle FIRST, then mark: the consume mark walks the
    // stroke-start target's ancestors up to the FRAME, and the frame is also
    // an ancestor of the host control the toggle clicks programmatically —
    // marking first matches that very click through the shared upper chain
    // segments and swallows it, so the panel never opens (0.1.5 live
    // observation). The mark still covers the browser's own synthetic click,
    // which is dispatched asynchronously after the release (the send button,
    // a row button, … sit under the release point).
    filesToggleFn()
    markStrokeConsumed(event.target)
    cooldownUntil = performance.now() + COOLDOWN_MS
  }
  if (filesMode && verdict === 'none') {
    // A 'none' files release is still a gesture (panel open + leftward, or
    // too short): consume its synthetic click so it cannot flip the panel
    // through the host toggle under the release point. This must run AFTER
    // the commit branches above, never before a programmatic toggle click.
    markStrokeConsumed(event.target)
  }
}

/**
 * Mark the released stroke so its synthetic click cannot re-toggle the drawer
 * or activate a row.
 *
 * The mark walks the ancestor chain up to the DRAWER when the stroke started
 * inside it: the backdrop is a frame child, so stopping at the frame would
 * make the host treat a genuine backdrop tap within the window as consumed
 * and swallow the close (the "tap twice to close" bug). A stroke that started
 * OUTSIDE the drawer (the left-edge start zone, or — since closing accepts
 * the whole frame — the backdrop itself) has no drawer in its chain, so the
 * walk would otherwise run all the way to the document root and briefly
 * shadow every tap on the page; the frame is the tightest correct stop for
 * those, and it is what must be marked anyway, because a backdrop-started
 * close stroke needs its own overlay click consumed.
 */
function markStrokeConsumed(target: Element): void {
  const drawer = findDrawer()
  const upTo =
    drawer !== null && drawer.contains(target) ? drawer : getFrame() ?? null
  markGestureConsumed(target, CONSUME_WINDOW_MS, upTo)
  consumedEl = target
}

/** Forget stroke state (called on cancel / visibility change / blur). */
function reset(): void {
  trackingPointer = 0
  tracking = false
  samples = []
  strokeMode = 'drawer'
  lockFilesOpen = false
  clearStrokeLocked()
}

/** The logical reading direction of the frame (RTL support). */
function frameRtl(): boolean {
  const frame = getFrame()
  return frame !== null && getComputedStyle(frame).direction === 'rtl'
}

/** Install the gesture layer for the current mobile breakpoint. */
export function installSidebarSwipe(ctx: ClientContext, filesToggle: () => boolean): void {
  installMobileEffect(ctx, 'dsh-web-mobile: sidebar swipe gestures', () => {
    filesToggleFn = filesToggle
    const viewportWidth = (): number =>
      window.innerWidth || document.documentElement.clientWidth || 0

    const onPointerDown = (event: PointerEvent): void => {
      // A new pointer starts a new interaction epoch: drop the previous
      // stroke's click gate. When the browser never delivers the synthetic
      // click (iOS shells suppress it after a swipe), this — together with
      // the short CONSUME_WINDOW_MS — keeps the next genuine tap alive
      // instead of eating it at the document-capture click handler.
      consumedEl = null
      clearStrokeLocked() // belt-and-suspenders: a lost stroke must not leak its lock into this epoch
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
      // A second finger means the browser owns this interaction (pinch zoom),
      // and a two-finger drag is never a drawer swipe. Merely ignoring the
      // extra pointer would keep the stroke alive — and with it the
      // touchmove preventDefault below, which cancels the native pinch. On
      // iOS that pinch is the only way back out of a zoom, so fighting it
      // recreates exactly the trap #45 reported. Hand the whole interaction
      // back instead.
      if (trackingPointer !== 0 && trackingPointer !== event.pointerId) {
        abortStroke(ctx)
        return
      }
      beginStroke(event, frameRtl(), viewportWidth())
    }

    const onPointerMove = (event: PointerEvent): void => {
      if (event.pointerId !== trackingPointer) return
      // Mid-stroke modal (e.g. a11y trap): abort per move so the follow
      // transform is not inherited by the modal; spring the drawer back.
      if (modalOpen() || takeoverActive()) {
        abortStroke(ctx)
        return
      }
      if (!tracking) {
        // Long-press selection can appear after pointerdown but before axis
        // lock (#43): abandon so selection handles stay draggable (reset()
        // also clears touchmove preventDefault). After lock the gesture
        // stays committed — selection does not appear mid-swipe.
        if (selectionOwnsStroke()) {
          reset()
          return
        }
        if (tryLock(event)) {
          pushSample(event)
          applyFollow(ctx, event.clientX - startX)
        }
      } else {
        pushSample(event)
        applyFollow(ctx, event.clientX - startX)
      }
    }

    const onPointerUp = (event: PointerEvent): void => {
      if (event.pointerId !== trackingPointer) return
      endStroke(ctx, event, frameRtl(), viewportWidth())
    }

    const onPointerCancel = (event: PointerEvent): void => {
      if (event.pointerId !== trackingPointer) return
      abortStroke(ctx)
    }

    // The browser may synthesize a click a few ms after the stroke's
    // pointerup. The host overlay handlers and the FAB / backdrop element
    // listeners would treat it as a tap; swallow it at document capture so
    // a swipe can never toggle twice or navigate a row. Non-gesture taps
    // (no live mark) pass through untouched.
    //
    // A click whose target is (or is inside) the backdrop or the FAB is
    // NEVER a gesture's synthetic click: the stroke start is always the
    // left-edge start zone or the drawer content, never the backdrop (outside
    // the drawer, on the right) or the FAB. The mark chain can reach them
    // in degenerate hit-test cases (e.g. a stroke starting on a point where
    // the empty drawer does not register as the event target), and
    // swallowing that click would break the "tap the backdrop to close"
    // path — the "tap twice to close" bug. Let those clicks through.
    const onClick = (event: MouseEvent): void => {
      if (consumedEl === null) return
      if (!(event.target instanceof Element)) return
      // A genuine backdrop / FAB tap is always let through: their own click
      // listeners toggle the drawer, and a consume mark that walked to the
      // document root would otherwise swallow it ("tap twice to close").
      // The one exception is a click on the overlay element that STARTED the
      // just-committed stroke — since close strokes may begin anywhere over
      // the frame, the backdrop can now be the stroke's own start target,
      // and letting its synthetic click through would re-toggle the drawer
      // straight back open.
      const overlay = event.target.closest(
        '[data-mobile-nav="backdrop"], [data-mobile-nav="fab"]',
      )
      if (overlay !== null && !overlay.contains(consumedEl)) return
      if (!consumeIfGestured(event)) return
      event.stopPropagation()
      event.preventDefault()
      consumedEl = null
    }

    const onVisibility = (): void => {
      if (document.hidden) abortStroke(ctx)
    }

    // Edge-touch priority (iOS UIScreenEdgePanGestureRecognizer semantics):
    // a stroke that began inside the left-edge start zone must never be
    // claimed by native scrolling. touch-action: pan-y already forbids the
    // browser from panning it horizontally; this preventDefault (passive:
    // false) additionally stops the vertical-scroll claim, so the pointer
    // event stream reaches the gesture layer intact on browsers where the
    // scroller wins the race (iOS Safari in particular — headless cannot
    // reproduce that behavior). Vertical-dominant strokes abandon the
    // gesture (reset() clears trackingPointer), so scrolling resumes for
    // touches that were never swipes. Strokes starting inside a genuinely
    // horizontally scrollable container never reach this state at all
    // (beginStroke rejects them via findHorizontalScroller), so their
    // native horizontal pan is never prevented.
    //
    // Multi-touch is the one case that must never be prevented: two fingers
    // on the screen mean a pinch, and preventDefault on those touchmoves
    // cancels the browser's zoom gesture. The pointerdown guard above
    // already abandons the stroke when a second finger lands; this is the
    // belt-and-braces path for engines that hand the gesture to the
    // compositor without delivering a second pointerdown (#46 real-device
    // report: pinch-out zoomed but pinch-in would not zoom back).
    const onTouchMove = (event: TouchEvent): void => {
      if (trackingPointer === 0) return
      if (event.touches.length > 1) {
        abortStroke(ctx)
        return
      }
      event.preventDefault()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointermove', onPointerMove, true)
    document.addEventListener('pointerup', onPointerUp, true)
    document.addEventListener('pointercancel', onPointerCancel, true)
    document.addEventListener('click', onClick, true)
    document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false })
    const onBlur = (): void => abortStroke(ctx)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointermove', onPointerMove, true)
      document.removeEventListener('pointerup', onPointerUp, true)
      document.removeEventListener('pointercancel', onPointerCancel, true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('touchmove', onTouchMove, { capture: true } as EventListenerOptions)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      abortStroke(ctx, true)
    }
  })
}
