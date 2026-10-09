import type { ClientContext } from '../client-context.ts'
import { currentSessionIdOf } from '../core/sessions-compat.ts'
import { SHADOW_MARKER } from './composer-keyboard-guard.ts'
import { installMobileEffect } from './phone-chrome.ts'

/**
 * Mobile guard: entering a session must not raise the soft keyboard by itself.
 *
 * Conversation InputBar focuses the Lexical editor from a passive effect keyed
 * on `[locked, sessionId, editor]` — every session switch programmatically
 * focuses the editing surface. On a phone that costs half the screen when the
 * user usually wants to read history first (issue #140).
 *
 * On a snapshot-observed current-session change, open a short guard window and
 * shadow the editor's own `focus` (same recipe / marker as
 * composer-keyboard-guard.ts) so host autofocus is a no-op. Native taps are
 * unaffected. The window is finite and closes early on an editing-surface tap
 * so later programmatic refocus (e.g. `+` command menu) is not swallowed.
 *
 * Timing: host focus runs in a passive effect after commit; a MutationObserver
 * microtask runs before that and re-shadows a remounted `[data-composer-input]`.
 * When InputBar remounts, host focus can run in the commit's layout-effect phase
 * before the observer microtask — so a focusin fallback blurs any focus that
 * lands on the editing surface during the window (same as the keepFocus guard:
 * blur at focusin capture before IME rises; drafts live in host keyboard state).
 *
 * DOM: `[data-composer-input]`, shared `data-mobile-nav-focus-shadow` marker.
 * Re-audit when the conversation package upgrades.
 */

/** Guard window for one session switch: long enough for slow phones + passive
 *  effects; short enough that a quick `+` tap rarely lands inside it. */
const FOCUS_GUARD_WINDOW_MS = 800

/** Lexical editing surface — the only element whose autofocus we swallow. */
const COMPOSER_INPUT_SELECTOR = '[data-composer-input]'

/**
 * Keep the session-switch autofocus from raising the soft keyboard, on the
 * mobile breakpoint only.
 * @param ctx - client root context.
 */
export function installSessionFocusGuard(ctx: ClientContext): void {
  installMobileEffect(ctx, 'dsh-web-mobile: session focus guard', () => {
    const list = ctx.sessions.list
    // Snapshot at install: subscribing must not arm — only a current-id change.
    let lastSessionId = currentSessionIdOf(list.getSnapshot())
    let windowTimer = 0
    let windowOpen = false

    const restore = (): void => {
      window.clearTimeout(windowTimer)
      windowTimer = 0
      windowOpen = false
      const el = document.querySelector<HTMLElement>(`[${SHADOW_MARKER}]`)
      if (el === null) return
      el.removeAttribute(SHADOW_MARKER)
      const shadowed = el as Partial<Record<'focus', () => void>>
      if (Object.prototype.hasOwnProperty.call(el, 'focus')) delete shadowed.focus
    }

    const shadow = (el: HTMLElement): void => {
      if (el.hasAttribute(SHADOW_MARKER)) return
      el.setAttribute(SHADOW_MARKER, '')
      Object.defineProperty(el, 'focus', {
        configurable: true,
        writable: true,
        value: function swallowedFocus(): void {
          /* session-switch autofocus; keep the keyboard down */
        },
      })
    }

    const arm = (): void => {
      restore()
      windowOpen = true
      const el = document.querySelector<HTMLElement>(COMPOSER_INPUT_SELECTOR)
      if (el !== null) shadow(el)
      windowTimer = window.setTimeout(restore, FOCUS_GUARD_WINDOW_MS)
    }

    // Session switches remount InputBar: catch the fresh editor inside the window.
    // Microtask timing beats the host's passive effect.
    const observer = new MutationObserver(() => {
      if (!windowOpen) return
      const el = document.querySelector<HTMLElement>(COMPOSER_INPUT_SELECTOR)
      if (el !== null) shadow(el)
    })

    // Editing-surface tap = user wants to type: close the window immediately.
    const onPointerDown = (event: Event): void => {
      if (!windowOpen) return
      const target = event.target
      if (target instanceof Element && target.closest(COMPOSER_INPUT_SELECTOR) !== null) restore()
    }

    // Fallback for the window lifetime: host may focus before the observer
    // shadows; blur synchronously so IME cannot rise. User taps never reach
    // here — their pointerdown closed the window above.
    const onFocusIn = (event: Event): void => {
      if (!windowOpen) return
      const target = event.target
      if (target instanceof HTMLElement && target.closest(COMPOSER_INPUT_SELECTOR) !== null) target.blur()
    }

    // Arm only when the current session id changes — list churn must not.
    const unsubscribe = list.subscribe(() => {
      const current = currentSessionIdOf(list.getSnapshot())
      if (current === lastSessionId) return
      lastSessionId = current
      arm()
    })

    observer.observe(document.documentElement, { childList: true, subtree: true })
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('focusin', onFocusIn, true)
    return () => {
      unsubscribe()
      observer.disconnect()
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('focusin', onFocusIn, true)
      restore()
    }
  })
}
