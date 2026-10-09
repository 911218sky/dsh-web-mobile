import type { ClientContext } from '../client-context.ts'
import { installMobileEffect } from './phone-chrome.ts'

/**
 * Makes a second tap on the composer `+` button close the command menu.
 *
 * Host `toggleSource()` can dismiss when launcher matches and the menu is
 * open, but the `+` onClick runs `focusDraftEditor` first. That update path
 * calls `inputTriggers.track()`, which clears the launcher while leaving the
 * menu open — so the dismiss branch is unreachable and every tap re-opens.
 * (`aria-expanded` on `+` stays false while the menu is visible for the same
 * reason.)
 *
 * Outside-dismiss also skips the composer card, so tapping `+` inside the
 * card never closes via that path. `shell.dismissPopup()` targets popupSelect,
 * not this MenuView (`data-trigger-menu`).
 *
 * Fix: on capture, note whether the menu was open before the tap; on bubble
 * (after host handlers), if it is still open, dispatch Escape on the Lexical
 * root (`[data-composer-input]`) — the host's own close path. Leave the
 * open-from-closed path alone.
 */

/** Host `+` button class fragment; model/permission triggers use `_trigger`. */
const ADD_SELECTOR = '[class*="_add"]'
/** Slash/command menu root: MenuView's stable marker (safer than style hashes). */
const MENU_SELECTOR = '[data-trigger-menu]'
/** Lexical editable root: host maps Escape to close only when keydown lands here. */
const EDITOR_SELECTOR = '[data-composer-input]'

/** After dismiss React removes the node; require a non-zero box to treat as open. */
const isVisible = (el: Element): boolean => {
  const box = el.getBoundingClientRect()
  return box.width > 0 && box.height > 0 && el.getClientRects().length > 0
}

const openMenu = (): Element | null => {
  for (const el of document.querySelectorAll(MENU_SELECTOR)) if (isVisible(el)) return el
  return null
}

const editorEl = (): HTMLElement | null => {
  const el = document.querySelector(EDITOR_SELECTOR)
  return el instanceof HTMLElement ? el : null
}

/**
 * Command menu does not need the soft keyboard.
 *
 * Before tapping `+`, the editor often still has DOM focus (keyboard dismissed
 * by scroll). Host `keepFocus` preventDefaults button mousedown, so the tap
 * does not blur; Android then re-raises the IME. The focus shadow only blocks
 * programmatic `focus()`, not this path — blur the editor on capture so IME
 * has no surface to attach to.
 */
const dropEditorFocus = (): void => {
  const editor = editorEl()
  if (editor !== null && document.activeElement === editor) editor.blur()
}

/** Host close path; no-op when the menu is closed (`arbitrate` returns 'pass'). */
const escapeEditor = (): void => {
  const editor = editorEl()
  if (editor === null) return
  editor.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true,
    }),
  )
}

export function installComposerPlusToggle(ctx: ClientContext): void {
  installMobileEffect(ctx, 'dsh-web-mobile: composer plus toggle', () => {
    /** Whether the menu was open before this click (capture, before host onClick). */
    let openBeforeClick = false
    /** Deferred keyboard-collapse timers while the menu is open; cancelled on editor tap. */
    let collapseTimers: number[] = []

    const cancelCollapse = (): void => {
      for (const id of collapseTimers) window.clearTimeout(id)
      collapseTimers = []
    }

    const onClickCapture = (event: Event): void => {
      const target = event.target
      openBeforeClick =
        target instanceof Element && target.closest(ADD_SELECTOR) !== null && openMenu() !== null
    }

    const onPointerDown = (event: Event): void => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest(ADD_SELECTOR) === null) return
      // Detach IME from the editor (see dropEditorFocus).
      dropEditorFocus()
    }

    const onClickBubble = (event: Event): void => {
      const wasOpen = openBeforeClick
      openBeforeClick = false
      const target = event.target
      if (!(target instanceof Element) || target.closest(ADD_SELECTOR) === null) return
      // Host focus → track(clearLauncher) → toggle has finished: still open means
      // its dismiss branch was skipped again — close for it; already closed, no-op.
      if (wasOpen && openMenu() !== null) escapeEditor()
      // Fallback: host may refocus in a post-open effect and re-raise the keyboard.
      // Only while the menu is open; cancelled when the user taps the editor.
      cancelCollapse()
      for (const delay of [120, 320, 640]) {
        collapseTimers.push(
          window.setTimeout(() => {
            if (openMenu() !== null) dropEditorFocus()
          }, delay),
        )
      }
    }

    /** Editor tap means the user wants to type — cancel deferred keyboard collapse. */
    const onEditorPointerDown = (event: Event): void => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest(EDITOR_SELECTOR) === null) return
      cancelCollapse()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointerdown', onEditorPointerDown, true)
    document.addEventListener('click', onClickCapture, true)
    document.addEventListener('click', onClickBubble, false)
    return () => {
      cancelCollapse()
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointerdown', onEditorPointerDown, true)
      document.removeEventListener('click', onClickCapture, true)
      document.removeEventListener('click', onClickBubble, false)
    }
  })
}
