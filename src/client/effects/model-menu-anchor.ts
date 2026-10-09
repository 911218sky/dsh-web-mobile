import type { ClientContext } from '../client-context.ts'
import { installMobileEffect } from './phone-chrome.ts'

/**
 * Re-anchors the model / reasoning-level menu to the composer card center.
 *
 * The host portals the menu to `body` and aligns its right edge to the
 * trigger, which sits on the right half of the card — the menu reads left-
 * biased. CSS centering under `_root > _menu` dies after the portal; this
 * layer recenters with JS (`left` only).
 *
 * Prefer horizontal center of `[data-composer-card]`; fall back to trigger
 * center plus viewport gutter. Only the model-menu class hash is touched.
 *
 * Cost: full-document queries run only on interactions that may open/close
 * the menu (`refresh` → cache `active`). Scroll/resize use `follow` on the
 * cached node (zero query when closed). Scroll still needed: the card moves
 * while the menu is open. MutationObserver is avoided — streaming would
 * scan the whole tree every frame.
 */

/** Model trigger (icon chip). */
const MODEL_TRIGGER = '[class*="_7KE1Ra_trigger"]'

/** Model / reasoning menu (portaled under body). */
const MODEL_MENU = '[class*="_7KE1Ra_menu"]'

/** Composer card — menu is centered horizontally within it. */
const COMPOSER_CARD = '[data-composer-card]'

/** Viewport edge inset. */
const GUTTER = 8

/** Host may rewrite position during open animation / remeasure; settle retries (ms). */
const SETTLE_MS = [0, 60, 200]

export function installModelMenuAnchor(ctx: ClientContext): void {
  installMobileEffect(ctx, 'dsh-web-mobile: model menu anchor', () => {
    let raf = 0
    const timers: number[] = []
    /** Confirmed-open menu node; null when none (scroll path skips queries). */
    let active: HTMLElement | null = null

    const laidOut = (el: Element | null): DOMRect | null => {
      if (el === null) return null
      const box = el.getBoundingClientRect()
      return box.width > 0 && box.height > 0 ? box : null
    }

    /** Sole full-document query entry (interaction path only; see header cost note). */
    const findMenu = (): HTMLElement | null => {
      for (const el of document.querySelectorAll<HTMLElement>(MODEL_MENU)) {
        if (laidOut(el) !== null) return el
      }
      return null
    }

    /** Center the menu in the composer card (or on the trigger). Writes inline left only. */
    const place = (menu: HTMLElement): void => {
      const menuBox = laidOut(menu)
      if (menuBox === null) return
      const width = menuBox.width
      const viewport = document.documentElement.clientWidth
      const max = Math.max(GUTTER, viewport - width - GUTTER)
      const card = document.querySelector<HTMLElement>(COMPOSER_CARD)
      const cardBox = card === null ? null : card.getBoundingClientRect()
      const trigger = cardBox !== null && cardBox.width > 0 ? null : document.querySelector<HTMLElement>(MODEL_TRIGGER)
      const triggerBox = trigger === null ? null : trigger.getBoundingClientRect()
      const center = cardBox !== null && cardBox.width > 0
        ? cardBox.left + cardBox.width / 2
        : triggerBox === null ? null : triggerBox.left + triggerBox.width / 2
      if (center === null) return
      const left = Math.min(Math.max(center - width / 2, GUTTER), max)
      const next = `${Math.round(left)}px`
      // Skip identical writes so we do not fight the host in the same frame.
      if (menu.style.left !== next) menu.style.left = next
    }

    /** Interaction path: refresh cache (queries) and place. */
    const refresh = (): void => {
      active = findMenu()
      if (active !== null) place(active)
    }

    /** Scroll / resize path: recompute from cached node only (no query). */
    const follow = (): void => {
      if (active === null) return
      if (laidOut(active) === null) {
        active = null
        return
      }
      place(active)
    }

    const schedule = (run: () => void): void => {
      if (raf !== 0) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        run()
      })
    }

    /** Settle retries after interaction (host may rewrite during open animation). */
    const scheduleRefresh = (): void => {
      schedule(refresh)
      for (const delay of SETTLE_MS) timers.push(window.setTimeout(() => schedule(refresh), delay))
      // Keep only the latest settle wave so long sessions do not accumulate timers.
      while (timers.length > SETTLE_MS.length * 2) {
        const stale = timers.shift()
        if (stale !== undefined) window.clearTimeout(stale)
      }
    }

    /** Query only for interactions that may open/close the menu. */
    const touchesMenu = (event: Event): boolean => {
      const target = event.target
      if (!(target instanceof Element)) return false
      return target.closest(MODEL_TRIGGER) !== null || target.closest(MODEL_MENU) !== null
    }

    const onPointerDown = (event: Event): void => {
      if (touchesMenu(event)) scheduleRefresh()
    }
    // Keyboard / a11y (Enter on focused trigger) and synthetic click.
    const onKeyDown = (event: Event): void => {
      if (touchesMenu(event)) scheduleRefresh()
    }
    const onFocusIn = (event: Event): void => {
      if (touchesMenu(event)) scheduleRefresh()
    }
    const onClick = (event: Event): void => {
      if (touchesMenu(event)) scheduleRefresh()
    }
    // Viewport changes use the zero-query follow path.
    const onViewportChange = (): void => {
      schedule(follow)
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('focusin', onFocusIn, true)
    document.addEventListener('click', onClick, true)
    window.addEventListener('resize', onViewportChange)
    document.addEventListener('scroll', onViewportChange, true)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('focusin', onFocusIn, true)
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('resize', onViewportChange)
      document.removeEventListener('scroll', onViewportChange, true)
      if (raf !== 0) window.cancelAnimationFrame(raf)
      for (const timer of timers) window.clearTimeout(timer)
      timers.length = 0
      active = null
    }
  })
}
