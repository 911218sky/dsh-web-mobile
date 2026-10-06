import { getFrame } from '../effects/phone-chrome.ts'

/** The host's own right-sidebar opener (ui-sidebar-right: ExpandButton). */
export const HOST_FILES_OPENER = '[data-sidebar-right-expand]'
/** The host's collapse control, mounted while the right sidebar is open. */
export const HOST_FILES_CLOSER = '[data-sidebar-right-toggle]'

/** Minimal document surface this helper needs (injectable for tests). */
interface FilesPanelDocument {
  querySelector: (selector: string) => unknown
}

/** Minimal frame surface kept for call-site compatibility (unused after aionui drop). */
interface FilesPanelFrame {
  removeAttribute: (name: string) => void
  setAttribute: (name: string, value: string) => void
}

/**
 * Open the file browser from a mobile control via the host's own right sidebar
 * (`data-sidebar-right-expand` / `data-sidebar-right-toggle`).
 *
 * On 0.1.5+ the host renders its opener inside `headerCorner`, which the desktop
 * layout hides with `display: none`, so the control exists and its click handler
 * runs while it has no painted size — acting on it programmatically is the
 * supported path.
 *
 * Returns true when the official sidebar took the action. Returns false when
 * no host control is present (no third-party explorer fallback in this fork).
 */
export function openFilesPanel(
  doc: FilesPanelDocument = document,
  _frame: FilesPanelFrame | null = getFrame(),
): boolean {
  // Toggle semantics, because the host swaps controls with the panel state
  // (measured on 0.1.5): while the panel is CLOSED the only opener is
  // `data-sidebar-right-expand`; once it is OPEN that element is unmounted and
  // only `data-sidebar-right-toggle` (Collapse right sidebar) remains. Acting
  // on the expand button alone was a no-op whenever the panel happened to be
  // already open — the exact "tap does nothing / position looks wrong" report.
  // Closing first also keeps the control reachable: the full-screen panel
  // covers the header, so a second tap could never reach our button.
  const closer = doc.querySelector(HOST_FILES_CLOSER) as { click?: () => void } | null
  const opener = doc.querySelector(HOST_FILES_OPENER) as { click?: () => void } | null
  const hostControl = typeof opener?.click === 'function' ? opener : closer
  // Duck-typed on purpose: any element exposing click() acts as the control.
  if (typeof hostControl?.click === 'function') {
    hostControl.click()
    return true
  }
  return false
}
