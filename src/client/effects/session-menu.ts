/**
 * Session-row action-menu injection: on touch-primary devices, adds a
 * "delete session" item to the host's per-row ⋯ menu and drives the delete
 * flow (row → session id, confirm dialog, delete endpoint, list refresh).
 *
 * The host menu has no extension slot, so the item is injected into the
 * portaled `[role="menu"]` by cloning host item markup (hashed classes keep
 * styling identical) and re-injected whenever React recreates the menu.
 * Supports nested icon/label spans and flat label-in-button shapes.
 *
 * Row → session id: titles match `displayTitle`; duplicates are disambiguated
 * by position within the workspace group section. Blank rows stay host-native
 * (localized "New session" title cannot resolve).
 *
 * Touch-gated via TOUCH_QUERY. Disposer removes listeners, observer, injected
 * nodes, and the confirm dialog.
 */
import type { ClientContext } from '../client-context.ts'
import { MOBILE_QUERY, TOUCH_QUERY, installMobileEffect, toggleDrawer } from './phone-chrome.ts'
import { currentSessionIdOf, sessionById, sessionsCanClear } from '../core/sessions-compat.ts'

// Mirrored from src/client/locales.ts: the custom client bundler cannot
// resolve `../` requires from effects/. Keep in sync.
const NS = 'mobileNav'
/** The ui-workspace dictionary namespace the host session menu labels come from. */
const WORKSPACE_NS = 'workspace'

/** Marker on the injected menu item (idempotence across React re-renders). */
const DELETE_ITEM_MARKER = 'data-mobile-nav="session-delete"'

/** Danger accent read from the theme, with a fixed fallback. */
const DANGER_COLOR = 'var(--dsw-alias-state-error-primary, #b91c1c)'

/** 16px outline trash glyph (IconTrashOutline16 path), currentColor-filled. */
const TRASH_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">'
  + '<path d="M14.4782 4.84067L14.2138 10.1152C14.1102 12.1872 14.067 13.0115 13.3866 13.9607C13.1044 14.3546 12.7498 14.6912 12.3424 14.9535C11.8239 15.2872 11.2415 15.4316 10.5585 15.4998C9.88727 15.5668 9.04946 15.5656 7.99998 15.5656C6.95051 15.5656 6.1127 15.5668 5.44142 15.4998C4.75851 15.4316 4.17602 15.2872 3.65753 14.9535C3.25012 14.6912 2.89559 14.3546 2.61332 13.9607C1.93296 13.0115 1.88979 12.1872 1.78619 10.1152L1.52179 4.84067L2.89006 4.77277L3.15343 10.0463C3.26221 12.2218 3.32452 12.6015 3.72646 13.1624C3.90825 13.4161 4.13686 13.6334 4.39927 13.8023C4.66204 13.9714 5.00263 14.0792 5.57825 14.1367C6.16562 14.1953 6.92298 14.1963 7.99998 14.1963C9.07699 14.1963 9.83434 14.1953 10.4217 14.1367C10.9973 14.0792 11.3379 14.1367 11.6007 13.8023C11.8631 13.6334 12.0917 13.4161 12.2735 13.1624C12.6755 12.6015 12.7378 12.2218 12.8465 10.0463L13.1099 4.77277L14.4782 4.84067ZM5.43011 6.22849H6.7994V11.3909H5.43011V6.22849ZM9.20056 6.22849H10.5699V11.3909H9.20056V6.22849ZM8.53597 0.434431C9.17976 0.434431 9.6522 0.426926 10.0966 0.571258C10.2357 0.616451 10.3717 0.672554 10.502 0.738948C10.9182 0.951107 11.2464 1.29099 11.7015 1.74612L12.4978 2.54136H15.3742V3.91169H0.625732V2.54136H3.50218L4.29845 1.74612C4.75358 1.29099 5.08174 0.951107 5.49801 0.738948C5.62831 0.672554 5.76425 0.616451 5.90334 0.571258C6.34776 0.426926 6.82021 0.434431 7.46399 0.434431H8.53597ZM7.46399 1.80476C6.73208 1.80476 6.51641 1.81187 6.32617 1.87369C6.25545 1.89667 6.18668 1.92533 6.12041 1.95907C5.96398 2.03878 5.82348 2.16253 5.44142 2.54136H10.5585C10.1765 2.16253 10.036 2.03878 9.87955 1.95907C9.81329 1.92533 9.74452 1.89667 9.6738 1.87369C9.48356 1.81187 9.26789 1.80476 8.53597 1.80476H7.46399Z" fill="currentColor" /></svg>'

/** One captured session-row menu anchor. */
interface MenuAnchor {
  /** The ⋯ button that opened the menu (used to close it). */
  button: HTMLButtonElement
  /** The session row the button lives in. */
  row: HTMLElement
  /** The row's displayed session title. */
  title: string
}

/** Host delete-endpoint response shape. */
interface DeleteResponse {
  ok?: true
  deleted?: string
  error?: { code?: string; message?: string }
}

/** Escape text destined for innerHTML (session titles are user content). */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * Install the mobile session-delete menu. Touch-gated under TOUCH_QUERY so
 * large tablets keep the desktop layout but still get the delete item;
 * mouse-driven or pointer-less windows are a no-op. Disposer removes every
 * listener, observer, injected node, and the confirm dialog.
 */
export function installSessionMenuDelete(ctx: ClientContext): void {
  installMobileEffect(ctx, 'dsh-web-mobile: session-menu delete', () => {
    const navT = ctx.locale.bind(NS)
    // Host workspace-browser dictionary for menu-signature detection. Bound
    // lazily so a later-registered dictionary is picked up.
    const wsT = (key: string, params?: Record<string, unknown>): string =>
      // Host dictionaries vary by generation; keep signature detection resilient.
      (ctx.locale.bind(WORKSPACE_NS) as (k: string, p?: Record<string, unknown>) => string)(key, params)

    let anchor: MenuAnchor | null = null
    let injectRaf = 0
    let dialogHost: { backdrop: HTMLElement; card: HTMLElement } | null = null
    let closeDialogOnKey: ((event: KeyboardEvent) => void) | null = null

    /** Resolve one session id for a row: title match, group position tiebreak. */
    const resolveSessionId = (row: HTMLElement, title: string): string | undefined => {
      const sessions = ctx.sessions.list.getSnapshot()
      const workspaces = ctx.workspaces.list.getSnapshot()
      const archived = new Set((workspaces.archivedSessionIds as readonly string[]))
      const candidates = (sessions.ids as readonly string[]).filter((id) => {
        const summary = sessionById(sessions, id)
        return summary !== undefined && !summary.blank && summary.displayTitle === title && !archived.has(id)
      })
      if (candidates.length === 1) return candidates[0]
      if (candidates.length === 0) return undefined
      // Duplicate titles: row position among same-title rows maps onto
      // same-title ids of that group's account.
      const group = row.closest<HTMLElement>('[class*="_groupSection"]')
      if (group === null) return undefined
      const headerTitle = group
        .querySelector<HTMLElement>(':scope > [class*="_projectRow"] [class*="_title"]')
        ?.textContent?.trim()
      const owned = new Set(workspaces.items.flatMap((workspace: { sessionIds: readonly string[] }) => workspace.sessionIds as readonly string[]))
      const workspace = headerTitle === undefined
        ? undefined
        : workspaces.items.find((candidate: { title: string; sessionIds: readonly string[] }) => candidate.title === headerTitle)
      const workspaceIds: readonly string[] = workspace === undefined ? [] : (workspace.sessionIds as readonly string[])
      const groupIds: readonly string[] = workspace === undefined
        ? (sessions.ids as readonly string[]).filter((id) => !owned.has(id) && !archived.has(id) && sessionById(sessions, id) !== undefined)
        : workspaceIds.filter(id => !archived.has(id) && sessionById(sessions, id) !== undefined)
      const sameTitleGroupIds = groupIds.filter(id => sessionById(sessions, id)?.displayTitle === title)
      const rows = [...group.querySelectorAll<HTMLElement>(':scope > [class*="_sessionRow"]')]
      const rowIndex = rows.indexOf(row)
      const sameTitleBefore = rowIndex === -1
        ? 0
        : rows.slice(0, rowIndex).filter(candidate =>
          candidate.querySelector<HTMLElement>('[class*="_title"]')?.textContent?.trim() === title,
        ).length
      return sameTitleGroupIds[sameTitleBefore]
    }

    /**
     * Read one menu item's visible label across host generations: nested
     * `_itemLabel` span beside an icon, or text directly in the button.
     * Falling back to the item's own textContent covers both — svg icons
     * contribute no text.
     */
    const itemLabel = (item: HTMLElement): string => {
      const label = item.querySelector<HTMLElement>('[class*="_itemLabel"]')
      return (label ?? item).textContent?.trim() ?? ''
    }

    /**
     * Whether a menu list is the host's per-session row menu. Containment
     * style, never an exact item count (hosts may add pin / other items).
     * rename + fork + archiveSession is the discriminating triple. Archived
     * rows swap archive for unarchive and get no delete item — resolution
     * excludes archived ids anyway.
     */
    const isSessionMenu = (menu: HTMLElement): boolean => {
      const labels = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')]
        .map(itemLabel)
      const rename = wsT('rename')
      const fork = wsT('menu.fork')
      return labels.includes(rename) && labels.includes(fork)
        && labels.includes(wsT('menu.archiveSession'))
    }

    const closeDialog = (): void => {
      if (closeDialogOnKey !== null) {
        document.removeEventListener('keydown', closeDialogOnKey, true)
        closeDialogOnKey = null
      }
      if (dialogHost !== null) {
        dialogHost.backdrop.remove()
        dialogHost.card.remove()
        dialogHost = null
      }
    }

    /**
     * Delete confirmation as a centered frosted-glass modal. Mounted on
     * `<body>`, not the frame: the third-party mobile shim captures clicks
     * inside the frame outside `[data-pane="sidebar"]` and would kill card
     * buttons. Body-level matches host portaled menus; backdrop flex centers
     * the card (base.css).
     */
    const showDeleteDialog = (sessionId: string, title: string): void => {
      closeDialog()
      const host = document.body
      const backdrop = document.createElement('div')
      backdrop.dataset.mobileNav = 'delete-dialog-backdrop'
      const card = document.createElement('div')
      card.dataset.mobileNav = 'delete-dialog'
      card.setAttribute('role', 'dialog')
      card.setAttribute('aria-modal', 'true')
      card.innerHTML = `
        <div data-mobile-nav="delete-confirm-title">${escapeHtml(navT('deleteConfirmTitle'))}</div>
        <div data-mobile-nav="delete-confirm-desc">${escapeHtml(navT('deleteConfirmDesc', { title }))}</div>
        <div data-mobile-nav="delete-confirm-actions">
          <button type="button" data-mobile-nav="delete-confirm-no">${escapeHtml(navT('deleteConfirmNo'))}</button>
          <button type="button" data-mobile-nav="delete-confirm-yes">${escapeHtml(navT('deleteConfirmYes'))}</button>
        </div>
        <div data-mobile-nav="delete-error" role="alert" hidden></div>`
      const noButton = card.querySelector<HTMLButtonElement>('[data-mobile-nav="delete-confirm-no"]')
      const yesButton = card.querySelector<HTMLButtonElement>('[data-mobile-nav="delete-confirm-yes"]')
      const errorLine = card.querySelector<HTMLElement>('[data-mobile-nav="delete-error"]')
      noButton?.addEventListener('click', closeDialog)
      // Card is a child of the backdrop; close only on genuine backdrop taps
      // so card clicks (including async yes) do not close before fetch settles.
      backdrop.addEventListener('click', (event) => {
        if (event.target !== backdrop) return
        closeDialog()
      })
      const onKey = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') closeDialog()
      }
      document.addEventListener('keydown', onKey, true)
      closeDialogOnKey = onKey

      const resetButtons = (): void => {
        if (yesButton !== null) {
          yesButton.disabled = false
          yesButton.textContent = navT('deleteConfirmYes')
        }
        if (noButton !== null) noButton.disabled = false
      }
      const fail = (message: string): void => {
        if (errorLine !== null) {
          errorLine.textContent = message
          errorLine.hidden = false
        }
        resetButtons()
      }
      const mapError = (payload: DeleteResponse | null, reason: unknown): string => {
        const code = payload?.error?.code
        if (code === 'session-not-found') return navT('deleteErrorNotFound')
        if (code === 'session-busy') return navT('deleteErrorBusy')
        const message = payload?.error?.message ?? (reason instanceof Error ? reason.message : String(reason))
        return navT('deleteErrorGeneric', { message })
      }
      yesButton?.addEventListener('click', async () => {
        yesButton.disabled = true
        if (noButton !== null) noButton.disabled = true
        yesButton.textContent = navT('deletePending')
        if (errorLine !== null) errorLine.hidden = true
        const wasCurrent = currentSessionIdOf(ctx.sessions.list.getSnapshot()) === sessionId
        try {
          const response = await fetch('/api/mobile-nav.session.delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          })
          const payload = await response.json().catch(() => null) as DeleteResponse | null
          if (!response.ok || payload === null || payload.ok !== true) {
            fail(mapError(payload, new Error(`HTTP ${response.status}`)))
            return
          }
        } catch (reason) {
          fail(mapError(null, reason))
          return
        }
        closeDialog()
        if (wasCurrent && sessionsCanClear(ctx.sessions)) {
          ;(ctx.sessions as unknown as { clear: () => void }).clear()
        }
        // Must call refresh as a method on ctx.sessions (reads `this.manager`).
        const sessions = ctx.sessions as { refresh?: () => Promise<void> }
        await sessions.refresh?.()
        // Close the drawer after deleting the current session on the mobile
        // branch only; wide touch keeps the always-visible sidebar. Late
        // commit via toggleDrawer so the marker cannot flip while the column
        // is still painted (popover band raises on backdrop presence).
        if (wasCurrent && window.matchMedia(MOBILE_QUERY).matches) toggleDrawer(ctx)
      })

      host.appendChild(backdrop)
      backdrop.appendChild(card)
      dialogHost = { backdrop, card }
    }

    /** Show a non-destructive error card (session could not be resolved). */
    const showError = (message: string): void => {
      closeDialog()
      const host = document.body
      const backdrop = document.createElement('div')
      backdrop.dataset.mobileNav = 'delete-dialog-backdrop'
      const card = document.createElement('div')
      card.dataset.mobileNav = 'delete-dialog'
      card.setAttribute('role', 'dialog')
      card.setAttribute('aria-modal', 'true')
      card.innerHTML = `
        <div data-mobile-nav="delete-confirm-title">${escapeHtml(navT('deleteSession'))}</div>
        <div data-mobile-nav="delete-error" role="alert">${escapeHtml(message)}</div>
        <div data-mobile-nav="delete-confirm-actions">
          <button type="button" data-mobile-nav="delete-confirm-no">${escapeHtml(navT('deleteConfirmNo'))}</button>
        </div>`
      card.querySelector<HTMLButtonElement>('[data-mobile-nav="delete-confirm-no"]')?.addEventListener('click', closeDialog)
      // Same child-of-backdrop target guard as showDeleteDialog.
      backdrop.addEventListener('click', (event) => {
        if (event.target !== backdrop) return
        closeDialog()
      })
      const onKey = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') closeDialog()
      }
      document.addEventListener('keydown', onKey, true)
      closeDialogOnKey = onKey
      host.appendChild(backdrop)
      backdrop.appendChild(card)
      dialogHost = { backdrop, card }
    }

    /** Inject the delete item into one open session menu (idempotent). */
    const injectInto = (menu: HTMLElement): void => {
      if (menu.querySelector(`[${DELETE_ITEM_MARKER}]`) !== null) return
      const template = menu.querySelector<HTMLElement>('[role="menuitem"]')
      const wrap = template?.parentElement
      const viewport = menu.querySelector<HTMLElement>('[class*="_viewport"]')
      if (template === null || wrap === null || wrap === undefined || viewport === null) return
      const clone = wrap.cloneNode(true) as HTMLElement
      const button = clone.querySelector<HTMLButtonElement>('[role="menuitem"]')
      if (button === null) return
      const icon = button.querySelector<HTMLElement>('[class*="_itemIcon"]')
      if (icon !== null) {
        icon.innerHTML = TRASH_SVG
        icon.style.color = DANGER_COLOR
      }
      const label = button.querySelector<HTMLElement>('[class*="_itemLabel"]')
      if (label !== null) {
        label.textContent = navT('deleteSession')
        label.style.color = DANGER_COLOR
      } else if (button.firstElementChild === null) {
        // Flat menuitem: text on the button itself. Unknown future shapes
        // with element children but no label span are left alone.
        button.textContent = navT('deleteSession')
        button.style.color = DANGER_COLOR
      }
      button.setAttribute('data-mobile-nav', 'session-delete')
      button.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        const captured = anchor
        // Close the host menu by toggling its anchor (React-owned state).
        captured?.button.click()
        try {
          if (captured === null || captured === undefined) {
            showError(navT('deleteErrorResolve'))
            return
          }
          const sessionId = resolveSessionId(captured.row, captured.title)
          if (sessionId === undefined) {
            showError(navT('deleteErrorResolve'))
            return
          }
          showDeleteDialog(sessionId, captured.title)
        } catch (reason) {
          // Surface resolution errors instead of a silent no-op tap.
          console.error('[dsh-web-mobile] session delete failed:', reason)
          showError(navT('deleteErrorGeneric', {
            message: reason instanceof Error ? reason.message : String(reason),
          }))
        }
      })
      viewport.appendChild(clone)
    }

    /**
     * Inject into every open session menu. Blank (new-session) rows are
     * excluded: host title is localized "New session" while `displayTitle`
     * stays empty, so delete could never resolve. Known ceiling: a normal
     * session titled exactly that label is also skipped.
     */
    const injectAll = (): void => {
      const blankLabel = wsT('session.new')
      for (const menu of document.querySelectorAll<HTMLElement>('[role="menu"]')) {
        if (!isSessionMenu(menu)) continue
        if (anchor !== null && anchor.title === blankLabel) continue
        injectInto(menu)
      }
    }
    const scheduleInject = (): void => {
      if (injectRaf !== 0) return
      injectRaf = requestAnimationFrame(() => {
        injectRaf = 0
        injectAll()
      })
    }

    // Capture the ⋯ click before React handles it so row/title are known when
    // the portaled menu appears. Host anchor has no aria-haspopup.
    const onDocumentClick = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null
      if (target === null) return
      const row = target.closest<HTMLElement>('[class*="_sessionRow"]')
      if (row === null) return
      const button = row.querySelector<HTMLButtonElement>('button')
      if (button === null) return
      const title = row.querySelector<HTMLElement>('[class*="_title"]')?.textContent?.trim() ?? ''
      anchor = { button, row, title }
      scheduleInject()
    }
    document.addEventListener('click', onDocumentClick, true)

    // Re-inject whenever a menu list mounts/updates (React recreates on open).
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type !== 'childList') continue
        const target = record.target
        if (target === document.body) { scheduleInject(); break }
        if (target instanceof HTMLElement
          && (target.matches('[role="menu"]') || target.closest('[role="menu"]') !== null)) {
          scheduleInject()
          break
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    injectAll()
    return () => {
      document.removeEventListener('click', onDocumentClick, true)
      observer.disconnect()
      if (injectRaf !== 0) cancelAnimationFrame(injectRaf)
      closeDialog()
      anchor = null
    }
  }, TOUCH_QUERY)
}
