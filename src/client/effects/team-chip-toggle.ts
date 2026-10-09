import type { ClientContext } from '../client-context.ts'
import { installMobileEffect } from './phone-chrome.ts'

/**
 * Makes a second tap on the agent-team chip close the open panel.
 *
 * Host trigger onClick only opens (or focuses when already open); close is
 * outside-pointer dismiss or Escape. On touch, re-tapping the chip therefore
 * never toggles closed.
 *
 * When the trigger reports aria-expanded="true" and the body-portal panel is
 * present, arm on pointerdown; on the matching click, synthesize a body
 * pointerdown (outside root/panel → host dismiss) then stopPropagation so the
 * host onClick cannot focus the panel. Order matters: dismiss must run before
 * the host sees the click. Read open state from aria-expanded at pointerdown
 * (pre-render), matching workspace-chip-toggle.
 */

/** Agent-team chip root (stable host marker). */
const ROOT_SELECTOR = '[data-team-action]'

/** Direct child trigger button (aria-haspopup="dialog"). */
const TRIGGER_SELECTOR = '[data-team-action] > button[aria-haspopup="dialog"]'

/** Body-portal panel (stable marker + role="dialog"). */
const PANEL_SELECTOR = '[data-team-panel]'

export function installTeamChipToggle(ctx: ClientContext): void {
  installMobileEffect(ctx, 'dsh-web-mobile: team chip toggle', () => {
    /** Trigger that reported expanded before this stroke; otherwise null. */
    let armed: Element | null = null

    const triggerFrom = (target: EventTarget | null): Element | null =>
      target instanceof Element ? target.closest(TRIGGER_SELECTOR) : null

    const onPointerDownCapture = (event: Event): void => {
      armed = null
      const trigger = triggerFrom(event.target)
      if (trigger === null) return
      if (trigger.getAttribute('aria-expanded') !== 'true') return
      if (document.querySelector(ROOT_SELECTOR) === null) return
      if (document.querySelector(PANEL_SELECTOR) === null) return
      armed = trigger
    }

    const onClickCapture = (event: Event): void => {
      const trigger = armed
      armed = null
      if (trigger === null || triggerFrom(event.target) !== trigger) return
      // Host dismiss listens for pointerdown only; body is outside root and panel.
      document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))
      event.stopPropagation()
    }

    document.addEventListener('pointerdown', onPointerDownCapture, true)
    document.addEventListener('click', onClickCapture, true)
    return () => {
      armed = null
      document.removeEventListener('pointerdown', onPointerDownCapture, true)
      document.removeEventListener('click', onClickCapture, true)
    }
  })
}
