import type { ReactElement } from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'

/**
 * Host `@deepseek-ai/dsh-client-ui-primitives` icon names differ by generation:
 *
 *   - lockfile / CI (`0.1.0-rc.6`): `IconXxxOutline16`
 *   - newer hosts (`0.1.7+`): `IconXxxOutlineRegular`
 *
 * Peer range covers both, but the export names do not overlap — hardcoding
 * either leaves the other as `undefined` and React throws "Element type is
 * invalid". Resolve at runtime; add a candidate when naming changes again.
 *
 * Design notes:
 * 1. `HostIcon` is defined locally — host type surfaces differ by generation
 *    and importing them destabilizes emitted `.d.ts` across environments.
 * 2. If no candidate exists, render null rather than crashing the tree.
 */

/** Host icon shape (size / className across generations). */
export type HostIcon = (props: { size?: number; className?: string }) => ReactElement | null

/** Fallback when no candidate export exists. */
const missingIcon: HostIcon = () => null

/** First matching export from the host primitives module. */
const pickIcon = (names: readonly string[]): HostIcon => {
  const table = primitives as unknown as Record<string, HostIcon | undefined>
  for (const name of names) {
    const found = table[name]
    if (found !== undefined) return found
  }
  return missingIcon
}

/** Composer file entry (paperclip). */
export const IconPaperclip: HostIcon = pickIcon(['IconPaperclipOutlineRegular', 'IconPaperclipOutline16'])

/** Drawer footer session-log export. */
export const IconDownload: HostIcon = pickIcon(['IconDownloadOutlineRegular', 'IconDownloadOutline16'])

/** Session-header directory drawer toggle. */
export const IconPanelLeft: HostIcon = pickIcon(['IconPanelLeftOutlineRegular', 'IconPanelLeftOutline16'])

/** Session-header Files / right-sidebar entry. */
export const IconFolderOpen: HostIcon = pickIcon(['IconFolderOpenOutlineRegular', 'IconFolderOpenOutline16'])
