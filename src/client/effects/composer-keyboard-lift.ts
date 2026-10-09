import type { ClientContext } from '../client-context.ts'
import { detectIosWebKit, installMobileEffect } from './phone-chrome.ts'

/**
 * Keep the iOS composer above the system form-assistant bar.
 *
 * Host Lexical selection-scroll mixes layout coords (`visualViewport.offsetTop`
 * + height) with the caret's visual `getBoundingClientRect`. Frames agree only
 * at scroll 0; iOS keyboard forces nonzero window scroll, so each keystroke
 * computes a bogus negative `scrollBy` that drops the sticky composer behind
 * the keyboard (Lexical #8848/#6277, WebKit 46bfd8e).
 *
 * Contract (tests/composer-keyboard-lift.test.ts): iOS WebKit, mobile branch,
 * only while `[data-composer-input]` is focused; lift from screen-space only
 * (seat `rect.bottom` vs `visualViewport.height`); fail open (lift 0) when
 * unverified (`vv.scale !== 1`, or `scrollY` vs `vv.offsetTop` beyond
 * tolerance); add applied lift back into the rect before comparing.
 *
 * Disposer tears down listeners, rAF, and transform on focusout / dispose.
 * Active path needs a real iOS device (`detectIosWebKit` is false in Chromium).
 */

/** Inputs of the pure lift decision, read fresh by the adapter per event. */
export interface ComposerLiftState {
  /** Seat `rect.bottom` with the applied lift added back (screen px). */
  seatBottom: number
  /** `visualViewport.height` — keyboard assembly top on screen (scale 1 only). */
  viewportHeight: number
  /** `visualViewport.scale`. */
  scale: number
  /** `window.scrollY`, cross-checked against `offsetTop`. */
  scrollY: number
  /** `visualViewport.offsetTop`, cross-checked against `scrollY`. */
  offsetTop: number
}

/**
 * How far the two scroll channels may drift before the coordinate model
 * counts as unverified: covers rounding and event-order jitter, still small
 * enough to catch a real visual-viewport pan.
 */
export const CHANNEL_TOLERANCE_PX = 24

/**
 * CSS px to lift the composer seat by; 0 rests (fail-open for every
 * unverified model, not just for "no overlap").
 */
export function computeComposerLift(state: ComposerLiftState): number {
  const { seatBottom, viewportHeight, scale, scrollY, offsetTop } = state
  if (!Number.isFinite(seatBottom) || !Number.isFinite(viewportHeight)) return 0
  if (!Number.isFinite(scale) || Math.abs(scale - 1) > 0.01) return 0
  if (!Number.isFinite(scrollY) || !Number.isFinite(offsetTop)) return 0
  if (Math.abs(scrollY - offsetTop) > CHANNEL_TOLERANCE_PX) return 0
  const overlap = seatBottom - viewportHeight
  return overlap > 0 ? overlap : 0
}

/** Host composer seat, scoped under the plugin frame marker. */
const SEAT_SELECTOR = '[data-mobile-nav="frame"] [class*="_composerSeat"]'

/** The Lexical editing surface — the only focus that arms the lift. */
const COMPOSER_INPUT_SELECTOR = '[data-composer-input]'

export function installComposerKeyboardLift(ctx: ClientContext): void {
  installMobileEffect(ctx, 'dsh-web-mobile: composer keyboard lift', () => {
    if (
      !detectIosWebKit(
        navigator,
        typeof CSS !== 'undefined' && typeof CSS.supports === 'function' ? CSS.supports.bind(CSS) : null,
      )
    ) {
      return undefined
    }
    const viewport = window.visualViewport
    if (!viewport) return undefined

    let seat: HTMLElement | null = null
    let appliedLift = 0
    let frame = 0

    const sync = (): void => {
      frame = 0
      if (seat === null || !seat.isConnected) return
      const lift = computeComposerLift({
        // Rect already includes our transform; add applied lift back so
        // seatBottom reads as the un-lifted screen bottom.
        seatBottom: seat.getBoundingClientRect().bottom + appliedLift,
        viewportHeight: viewport.height,
        scale: viewport.scale,
        scrollY: window.scrollY,
        offsetTop: viewport.offsetTop,
      })
      appliedLift = lift
      seat.style.transform = lift > 0 ? `translateY(${-lift}px)` : ''
    }
    const schedule = (): void => {
      if (frame === 0) frame = requestAnimationFrame(sync)
    }

    const release = (): void => {
      viewport.removeEventListener('resize', schedule)
      viewport.removeEventListener('scroll', schedule)
      window.removeEventListener('scroll', schedule)
      if (frame !== 0) {
        cancelAnimationFrame(frame)
        frame = 0
      }
      if (seat !== null) seat.style.transform = ''
      seat = null
      appliedLift = 0
    }

    const onFocusIn = (event: FocusEvent): void => {
      const target = event.target
      if (!(target instanceof Element) || target.closest(COMPOSER_INPUT_SELECTOR) === null) return
      release()
      const found = document.querySelector<HTMLElement>(SEAT_SELECTOR)
      if (found === null) return
      seat = found
      viewport.addEventListener('resize', schedule)
      viewport.addEventListener('scroll', schedule)
      window.addEventListener('scroll', schedule, { passive: true })
      schedule()
    }
    const onFocusOut = (event: FocusEvent): void => {
      const target = event.target
      if (!(target instanceof Element) || target.closest(COMPOSER_INPUT_SELECTOR) === null) return
      const next = event.relatedTarget
      // Focus moving inside the seat keeps the keyboard up: stay armed.
      if (next instanceof Element && next.closest(SEAT_SELECTOR) !== null) return
      release()
    }

    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('focusout', onFocusOut, true)
    return () => {
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('focusout', onFocusOut, true)
      release()
    }
  })
}
