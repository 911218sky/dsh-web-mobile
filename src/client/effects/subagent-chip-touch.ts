import type { ClientContext } from '../client-context.ts'
import { installMobileEffect } from './phone-chrome.ts'

/**
 * Touch support for the lineage-count chip ("N sub-agents") that
 * `dsh-client-ui-subagent` renders in the session header.
 *
 * Host builds either open on hover timers (touch synthesizes mismatched
 * mouseenter/leave) or toggle via onClick. A phone tap that also runs this
 * shim's keyboard-path open then hits native onClick and flashes shut.
 *
 * Touch/pen only (mouse keeps native hover):
 * 1. Toggle via the component keyboard path (ArrowDown open, Escape close).
 * 2. Swallow the follow-up click on the trigger we toggled.
 * 3. Briefly swallow trusted synthesized hover on the lineage root / menu
 *    so hover-timer builds cannot cancel or resurrect.
 *
 * Returns a disposer that removes every listener.
 */

/** Count-variant trigger only: the switcher variant has its own onClick. */
const CHIP_TRIGGER_SELECTOR =
  '[data-mobile-nav="frame"] button[class*="_trigger"][aria-haspopup="tree"][aria-expanded]:not([class*="_switcherTrigger"])'

/**
 * Lineage root plus its menu. `ZKlsPq` (hover-only) and `h8S2Va` (onClick
 * toggle) are dsh-client-ui-subagent CSS-module hashes — re-audit on upgrade.
 */
const HOVER_SUBTREE_SELECTOR =
  '[class*="ZKlsPq_root"], [class*="ZKlsPq_menu"], [class*="h8S2Va_root"], [class*="h8S2Va_menu"]'

/** How long after touch activity synthesized hover events stay suppressed. */
const SWALLOW_WINDOW_MS = 800

/**
 * How long the tap's follow-up click stays suppressed on the trigger we
 * toggled through the keyboard path. A touch click lands a few ms after
 * pointerup; 1 s is a generous upper bound before the next deliberate tap.
 */
const CLICK_GRACE_MS = 1000

const SWALLOWED_TYPES = ['mouseover', 'mouseout', 'mouseenter', 'mouseleave'] as const

export function installSubagentChipTouch(ctx: ClientContext): void {
  installMobileEffect(ctx, 'dsh-web-mobile: lineage chip touch toggle', () => {
    if (typeof PointerEvent === 'undefined') return undefined

    let swallowUntil = 0
    const armSwallowWindow = (): void => {
      swallowUntil = Date.now() + SWALLOW_WINDOW_MS
    }

    // Trigger whose tap we just toggled via keyboard path, and click-suppress deadline.
    let toggledTrigger: HTMLElement | null = null
    let toggledUntil = 0

    const onPointerUp = (event: PointerEvent): void => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
      armSwallowWindow()
      const target = event.target
      if (!(target instanceof Element)) return
      const trigger = target.closest<HTMLElement>(CHIP_TRIGGER_SELECTOR)
      if (trigger === null) return
      const open = trigger.getAttribute('aria-expanded') === 'true'
      // Component keyboard path: ArrowDown opens (+focus first row); Escape closes.
      trigger.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: open ? 'Escape' : 'ArrowDown',
          bubbles: true,
          cancelable: true,
        }),
      )
      toggledTrigger = trigger
      toggledUntil = Date.now() + CLICK_GRACE_MS
    }

    /**
     * Swallow the tap's follow-up click on the trigger we toggled so native
     * onClick cannot cancel the keyboard-path toggle. stopPropagation at
     * document capture blocks React delegation while letting other document
     * listeners observe. Identity-checked so menu rows and other taps pass.
     */
    const onClick = (event: MouseEvent): void => {
      if (toggledTrigger === null) return
      if (Date.now() >= toggledUntil) {
        toggledTrigger = null
        return
      }
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest<HTMLElement>(CHIP_TRIGGER_SELECTOR) !== toggledTrigger) return
      toggledTrigger = null
      event.stopPropagation()
    }

    const onAnyPointerActivity = (event: PointerEvent): void => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
      armSwallowWindow()
      void event
    }

    const swallowSyntheticHover = (event: MouseEvent): void => {
      if (Date.now() >= swallowUntil) return
      if (!event.isTrusted) return
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest(HOVER_SUBTREE_SELECTOR) === null) return
      event.stopImmediatePropagation()
    }

    document.addEventListener('pointerdown', onAnyPointerActivity, true)
    document.addEventListener('pointerup', onPointerUp, true)
    document.addEventListener('click', onClick, true)
    for (const type of SWALLOWED_TYPES) {
      document.addEventListener(type, swallowSyntheticHover, true)
    }
    return () => {
      document.removeEventListener('pointerdown', onAnyPointerActivity, true)
      document.removeEventListener('pointerup', onPointerUp, true)
      document.removeEventListener('click', onClick, true)
      for (const type of SWALLOWED_TYPES) {
        document.removeEventListener(type, swallowSyntheticHover, true)
      }
    }
  })
}
