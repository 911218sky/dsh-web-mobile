import type { ClientContext } from '../client-context.ts'
import { detectIosWebKit, installMobileEffect } from './phone-chrome.ts'

/**
 * Prevents composer control taps from re-raising a dismissed soft keyboard.
 *
 * Host `keepFocus` (mousedown on send/stop/+) calls preventDefault then
 * programmatic editor.focus(). On iOS WebKit that re-opens the keyboard after
 * scroll-dismiss; the `+` path also focusDraftEditor before opening the
 * command menu, which shifts the row so a second tap misses the button.
 *
 * On iOS WebKit or coarse pointer: capture pointerdown/touchstart/mousedown
 * inside the composer card (not the editing surface), shadow
 * `[data-composer-input].focus` with a no-op for 700ms, then restore.
 * keepFocus's preventDefault still runs; editor tap-to-type restores early.
 * focusin blur inside the window covers paths that bypass the shadow.
 * DOM: `[data-composer-card]`, `[data-composer-input]` — audit on upgrades.
 * Interops with session-focus-guard via SHADOW_MARKER.
 */

/** Composer card root that owns the fixed control cluster. */
const COMPOSER_CARD_SELECTOR = '[data-composer-card]'

/** Lexical editing surface (only element allowed to raise the keyboard). */
const COMPOSER_INPUT_SELECTOR = '[data-composer-input]'

/** Marker on the editor while focus is shadowed; shared with session-focus-guard. */
export const SHADOW_MARKER = 'data-mobile-nav-focus-shadow'

export function installComposerKeyboardGuard(ctx: ClientContext): void {
  installMobileEffect(ctx, 'dsh-web-mobile: composer keyboard guard', () => {
    // Coarse pointer: block button-driven programmatic focus (e.g. + → focusDraftEditor).
    // Fine pointer / desktop keeps host keepFocus. Editor taps restore early below.
    const ios = detectIosWebKit(navigator, typeof CSS !== 'undefined' && typeof CSS.supports === 'function' ? CSS.supports.bind(CSS) : null)
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
    if (!ios && !coarse) {
      return undefined
    }

    /** Shadow restore timer; non-zero means the guard window is open (see onFocusIn). */
    let shadowTimer = 0

    /** Remove the focus shadow and clear the guard window (must zero shadowTimer). */
    const restore = (): void => {
      window.clearTimeout(shadowTimer)
      shadowTimer = 0
      const el = document.querySelector<HTMLElement>(`[${SHADOW_MARKER}]`)
      if (el === null) return
      el.removeAttribute(SHADOW_MARKER)
      const shadowed = el as Partial<Record<'focus', () => void>>
      if (Object.prototype.hasOwnProperty.call(el, 'focus')) delete shadowed.focus
    }

    const onPointerDown = (event: Event): void => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (typeof target.closest !== 'function') return
      const card = target.closest(COMPOSER_CARD_SELECTOR)
      if (card === null) return
      const editor = card.querySelector<HTMLElement>(COMPOSER_INPUT_SELECTOR)
      if (editor === null) return
      // User tapped the editor to type: end the guard so blur cannot steal focus.
      if (target.closest(COMPOSER_INPUT_SELECTOR) !== null) {
        restore()
        return
      }
      // Button-area tap: shadow focus for the remainder of this dispatch.
      restore()
      editor.setAttribute(SHADOW_MARKER, '')
      Object.defineProperty(editor, 'focus', {
        configurable: true,
        writable: true,
        value: function swallowedFocus(): void {
          /* keepFocus called; keep the dismissed keyboard dismissed */
        },
      })
      // 700ms covers host post-menu-open focus effects; click+setTimeout(0) is too early.
      // Programmatic focus only; editor taps restore above. New button taps reset the timer.
      window.clearTimeout(shadowTimer)
      shadowTimer = window.setTimeout(restore, 700)
    }

    // pointerdown + touchstart + mousedown: Android WebView often skips synthetic mousedown.
    // focusin blur: fallback if focus still reaches the editor within the guard window
    // (sync blur; deferred blur lets the IME start). Host draft state does not need DOM focus.
    const onFocusIn = (event: Event): void => {
      if (shadowTimer === 0) return
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (target.closest(COMPOSER_INPUT_SELECTOR) === null) return
      target.blur()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('touchstart', onPointerDown, true)
    document.addEventListener('mousedown', onPointerDown, true)
    document.addEventListener('focusin', onFocusIn, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('touchstart', onPointerDown, true)
      document.removeEventListener('mousedown', onPointerDown, true)
      document.removeEventListener('focusin', onFocusIn, true)
      restore()
    }
  })
}
