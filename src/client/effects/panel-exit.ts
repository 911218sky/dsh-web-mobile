import type { ClientContext } from '../client-context.ts'
import type { ReconcilerTask } from '../core/reconciler-core.ts'
import { panelSelectorOf } from '../core/layout-compat.ts'
import { getFrame, installMobileEffect } from './phone-chrome.ts'

/**
 * Sidebar panel exit.
 *
 * Host sidebar panels replace the main area (`ctx.layout.selectPanel(id)`),
 * with no built-in way back: `PanelRow.onClick` is `selectPanel(id)` (re-tapping
 * the selected row stays on the panel), and the only `selectPanel(null)` caller
 * is `workspace.replaceMain` (opening a session). On a phone that is a dead end
 * unless the user opens the drawer and picks a session.
 *
 * Three exits, same `exit` action:
 *  1. system back / back gesture (popstate) — returned task
 *  2. re-tap the selected panel row — installPanelRowExit
 *  3. top-left FAB (back-to-conversation while a panel owns main) —
 *     createOverlayTask in overlay-backdrop-fab.ts
 */

/**
 * Host marks the selected sidebar panel row with `aria-current="page"`
 * (null in conversation, `"page"` on a panel). `panelRow` is a CSS-module
 * fragment matched as a substring. Why DOM, not `ctx.layout`: layout exposes
 * no readable panel id; selection lives on the host's PanelInfo store.
 */
const PANEL_ROW_ACTIVE = '[class*="panelRow"][aria-current="page"]'

/**
 * True from exit start until React commits the swap. During that window the
 * row still shows `aria-current="page"`, but the panel is semantically gone —
 * history must treat it as closed or a second entry arms mid-flight.
 */
let panelLeaving = false

/** Whether a panel owns the main area (DOM truth, ignoring the exit window). */
export function panelOwnsMainArea(): boolean {
  return document.querySelector(PANEL_ROW_ACTIVE) !== null
}

/** Whether a panel owns the main area, counting the in-flight exit as closed. */
function panelViewOpen(): boolean {
  return !panelLeaving && panelOwnsMainArea()
}

/** Marker set on the frame while the incoming conversation fades in. */
const PANEL_EXIT_ATTR = 'data-mobile-panel-exit'

/** Safety net: clears the marker if the reveal animation never fires. */
const PANEL_EXIT_FALLBACK_MS = 2000

/**
 * `ctx.layout.selectPanel` exists on 0.1.6-alpha.2 but not on rc.6 (layout face
 * only has toggleSidebar/openDetails/closeDetails; same drift as
 * core/sessions-compat.ts). Capability-checked via core/layout-compat.ts so
 * the plugin stays compile-green on rc.6 and goes inert there.
 */

/** The three exit routes plus the capability gate they all share. */
export interface PanelExit {
  /** Leave the panel (no-op when the host has no panel-selection API). */
  exit: () => void
  /** Whether the host can select a panel at all; false on rc.6. */
  supported: boolean
  /**
   * Whether a panel owns the main area, ignoring the in-flight exit window.
   * FAB uses this so its icon does not flip to open-drawer mid-exit.
   */
  panelOpen: () => boolean
  /** The system-back route, for the shared reconciler. */
  task: ReconcilerTask
}

/**
 * Leave the panel: switch back to the conversation and fade the incoming
 * content in.
 *
 * The switch is not delayed behind an outgoing animation: `selectPanel(null)`
 * remounts the conversation and that commit can block the main thread for
 * hundreds of ms on a long session. Fading the panel out first would show a
 * blank screen for that window. Keeping the panel opaque until commit makes
 * it disappear on the same frame the conversation appears; only the fade-in
 * remains.
 *
 * @param layout - `ctx.layout`; probed, never assumed.
 * @returns the exit action (idempotent while an exit is in flight) and the
 *   system-back reconciler task.
 */
export function createPanelExit(layout: unknown): PanelExit {
  const selectPanel = panelSelectorOf(layout)
  const supported = selectPanel !== null
  let leaving = false
  let cleanupTimer: number | null = null

  // Reveal animation runs on a frame descendant — capture phase; that is the
  // precise end-of-transition signal (better than a guessed timeout).
  function onAnimationEnd(event: AnimationEvent): void {
    if (event.animationName === 'dsh-mobile-panel-reveal') cleanup()
  }

  function cleanup(): void {
    if (cleanupTimer !== null) {
      window.clearTimeout(cleanupTimer)
      cleanupTimer = null
    }
    const frame = getFrame()
    if (frame !== null) {
      frame.removeEventListener('animationend', onAnimationEnd, true)
      frame.removeAttribute(PANEL_EXIT_ATTR)
    }
    panelLeaving = false
    leaving = false
  }

  const exit = (): void => {
    if (!supported || leaving) return
    leaving = true
    panelLeaving = true
    // Marker before swap so the incoming conversation carries the animation
    // from first style resolution — no full-opacity frame.
    const frame = getFrame()
    if (frame !== null) {
      frame.setAttribute(PANEL_EXIT_ATTR, '')
      frame.addEventListener('animationend', onAnimationEnd, true)
    }
    selectPanel()
    cleanupTimer = window.setTimeout(cleanup, PANEL_EXIT_FALLBACK_MS)
  }

  return { exit, supported, panelOpen: panelOwnsMainArea, task: createPanelBackExitTask(exit, supported) }
}

/**
 * System back key / back gesture exits the panel.
 *
 * Host core does not touch browser history (PDF preview plugin does, unrelated).
 * On phone the panel view often sits at `history.length === 1`, so back would
 * leave the page. This layer arms one history entry while a panel is open and
 * exits when it is popped.
 *
 * Edges: our own `history.back()` (other exit routes) echoes as popstate —
 * `selfBackPending` swallows it, with a timeout so a WebView that never emits
 * popstate cannot leave the flag stuck. Between click and React commit the row
 * is still marked active; `panelViewOpen()` reports closed in that window so
 * no second entry is armed.
 *
 * @param exitPanel - the shared exit action.
 * @param supported - false when the host has no panel-selection API.
 */
export function createPanelBackExitTask(exitPanel: () => void, supported: boolean): ReconcilerTask {
  let armed = false
  let listening = false
  let selfBackPending = false
  let selfBackTimer: number | null = null

  function clearSelfBack(): void {
    selfBackPending = false
    if (selfBackTimer !== null) {
      window.clearTimeout(selfBackTimer)
      selfBackTimer = null
    }
  }

  function selfBack(): void {
    selfBackPending = true
    if (selfBackTimer !== null) window.clearTimeout(selfBackTimer)
    selfBackTimer = window.setTimeout(clearSelfBack, 1200)
    try {
      history.back()
    } catch {
      clearSelfBack()
    }
  }

  function onPopState(): void {
    if (selfBackPending) {
      clearSelfBack()
      return
    }
    if (!armed) return
    armed = false
    if (panelViewOpen()) exitPanel()
  }

  function listen(): void {
    if (listening) return
    window.addEventListener('popstate', onPopState)
    listening = true
  }

  function unlisten(): void {
    if (!listening) return
    window.removeEventListener('popstate', onPopState)
    listening = false
  }

  return {
    name: 'panel-back-exit',
    scopes: ['*'],
    ensure: (): void => {
      if (!supported) return
      listen()
      if (panelViewOpen()) {
        if (armed) return
        armed = true
        try {
          // Second argument empty: add a poppable entry without touching the URL.
          history.pushState({ mobilePanelExit: true }, '')
        } catch {
          // Sandboxed frames refuse pushState; give up on this exit rather than
          // breaking anything else.
          armed = false
        }
        return
      }
      if (armed) {
        armed = false
        selfBack()
      }
    },
    dispose: (): void => {
      unlisten()
      clearSelfBack()
      if (armed) {
        armed = false
        selfBack()
      }
    },
  }
}

/**
 * Re-tapping the selected panel row returns to the conversation. Unselected
 * rows still go through the host's `selectPanel(id)`.
 *
 * Capture phase so the host onClick can be stopped. Drawer close rides the
 * same click (phone-chrome navigation-tap whitelist) — closing on pointerup
 * cancels the synthesized click (drawer-nav click pitfall).
 */
export function installPanelRowExit(ctx: ClientContext, exitPanel: () => void): void {
  installMobileEffect(ctx, 'dsh-web-mobile: panel row returns to conversation', () => {
    const onClick = (event: MouseEvent): void => {
      const target = event.target
      if (!(target instanceof Element) || typeof target.closest !== 'function') return
      const row = target.closest('[class*="panelRow"]')
      if (row === null) return
      if (row.getAttribute('aria-current') !== 'page') return
      event.preventDefault()
      event.stopPropagation()
      exitPanel()
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  })
}
