import type { ClientContext } from '../client-context.ts'
import { installMobileEffect } from './phone-chrome.ts'

/**
 * Mobile guard: the keyboard-shortcut modal must not raise the soft keyboard
 * by itself.
 *
 * `dsh-client-ui-shortcuts` marks its search field with `data-modal-autofocus`,
 * and the primitives Modal focuses that field on mount. On a phone that costs
 * half the screen (the sheet is a shortcut editor; search is secondary) and
 * makes the sheet jump because the modal is sized by `100dvh` — keyboard
 * shrink of the viewport resizes the dialog.
 *
 * Why not the own-property shadow from composer-keyboard-guard: that focus
 * runs during React commit (Modal layout-effect), before a MutationObserver
 * microtask. The guard must be in place before insert, so while either modal
 * of this family is in the DOM we shadow `HTMLInputElement.prototype.focus`
 * and no-op it for the autofocus field; remove the shadow when neither modal
 * is present (and on dispose).
 *
 * Native taps are unaffected (browser focuses without the JS method). Search
 * stays one tap away; the shadow also stops host `modifiedCount` re-focus from
 * stealing the caret from a field in use.
 *
 * DOM: `[data-shortcut-modal="settings"|"shortcuts"]`, `[data-modal-autofocus]`.
 * Re-audit when the host or dsh-client-ui-shortcuts upgrades.
 */
const SETTINGS_MODAL = '[data-shortcut-modal="settings"]'
const SHORTCUT_MODAL = '[data-shortcut-modal="shortcuts"]'
/** The field the Modal's mount-time focus must not reach, on phones only. */
const AUTOFOCUS_FIELD = SHORTCUT_MODAL + ' [data-modal-autofocus]'

/**
 * Keep the shortcut modal's search field from grabbing focus (and the soft
 * keyboard) by itself, on the mobile breakpoint only.
 * @param ctx - client root context.
 */
export function installShortcutModalKeyboardGuard(ctx: ClientContext): void {
  installMobileEffect(ctx, 'dsh-web-mobile: shortcut modal keyboard guard', () => {
    const proto = HTMLInputElement.prototype
    // Captured once per arming so restore always puts the real method back.
    let original: ((this: HTMLInputElement, options?: FocusOptions) => void) | null = null

    const arm = (): void => {
      if (original !== null) return
      const previous = proto.focus
      original = previous
      proto.focus = function focus(this: HTMLInputElement, options?: FocusOptions): void {
        if (this.matches(AUTOFOCUS_FIELD)) return
        previous.call(this, options)
      }
    }

    const disarm = (): void => {
      if (original === null) return
      proto.focus = original
      original = null
    }

    const sync = (): void => {
      const present =
        document.querySelector(SETTINGS_MODAL) !== null ||
        document.querySelector(SHORTCUT_MODAL) !== null
      if (present) arm()
      else disarm()
    }

    // childList only (no subtree): both modal roots are portaled to body as
    // direct children; a subtree observer would run on every app mutation.
    // Settings is present before the shortcut modal mounts, so the shadow is
    // already installed when Modal focuses its field.
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { childList: true })
    sync()

    return () => {
      observer.disconnect()
      disarm()
    }
  })
}
