import type { ClientContext } from '../client-context.ts'
import { installMobileEffect } from './phone-chrome.ts'

/**
 * Makes a second tap on the hero workspace chip close the open picker.
 *
 * The chip toggles correctly, but WorkspacePickFlow mounts Menu with
 * `anchor={null}` (empty rootRef span), so the chip sits outside Menu's
 * outside-dismiss exemption. Open + re-tap: pointerdown closes, then click
 * toggles open again — net reopen. (Preset triggers pass a real button
 * anchor and do not have this bug.)
 *
 * When the chip reports aria-expanded="true" and a portal menu is present,
 * arm on pointerdown; on the matching click, stopPropagation so React never
 * re-toggles open. Opening (menu closed) is left alone. Read open state from
 * aria-expanded at pointerdown (pre-render).
 */

/** Hero workspace chip: direct child of the hero row (preset trigger is nested under Menu's anchor). */
const CHIP_SELECTOR = '[class*="heroWorkspaceRow"] > button[aria-haspopup="menu"]'

/** Host Menu portal list; outside-dismiss only exists while this is present. */
const OPEN_MENU_SELECTOR = '[role="menu"]'

export function installWorkspaceChipToggle(ctx: ClientContext): void {
  installMobileEffect(ctx, 'dsh-web-mobile: workspace chip toggle', () => {
    /** Chip that reported expanded before this stroke; otherwise null. */
    let armed: Element | null = null

    const chipFrom = (target: EventTarget | null): Element | null =>
      target instanceof Element ? target.closest(CHIP_SELECTOR) : null

    const onPointerDownCapture = (event: Event): void => {
      armed = null
      const chip = chipFrom(event.target)
      if (chip === null) return
      if (chip.getAttribute('aria-expanded') !== 'true') return
      if (document.querySelector(OPEN_MENU_SELECTOR) === null) return
      armed = chip
    }

    const onClickCapture = (event: Event): void => {
      const chip = armed
      armed = null
      if (chip === null || chipFrom(event.target) !== chip) return
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
