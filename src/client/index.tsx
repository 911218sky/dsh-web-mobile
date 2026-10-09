import type { ClientContext } from './client-context.ts'
import { MobileNavToggle } from './components/MobileNavToggle.tsx'
import { MobileDrawerFooter } from './components/MobileDrawerFooter.tsx'
import { ComposerFileButton } from './components/ComposerFileButton.tsx'
import { openFilesPanel } from './components/open-files-panel.ts'
import { MOBILE_CSS } from './styles/index.ts'

import { installFrameController, installOverlayInteractions, installPhoneChrome, installReconciler, registerReconcileTasks, MOBILE_QUERY } from './effects/phone-chrome.ts'
import { installSidebarSwipe } from './effects/sidebar-swipe.ts'
import { installSubagentChipTouch } from './effects/subagent-chip-touch.ts'
import { installSessionMenuDelete } from './effects/session-menu.ts'
import { installComposerKeyboardGuard } from './effects/composer-keyboard-guard.ts'
import { installComposerKeyboardLift } from './effects/composer-keyboard-lift.ts'
import { installComposerPlusToggle } from './effects/composer-plus-toggle.ts'
import { installWorkspaceChipToggle } from './effects/workspace-chip-toggle.ts'
import { installTeamChipToggle } from './effects/team-chip-toggle.ts'
import { installModelMenuAnchor } from './effects/model-menu-anchor.ts'
import { installShortcutModalKeyboardGuard } from './effects/shortcut-modal-keyboard-guard.ts'
import { installSessionFocusGuard } from './effects/session-focus-guard.ts'
import { createPanelExit, installPanelRowExit } from './effects/panel-exit.ts'
import { createRafScheduler } from './core/raf-scheduler.ts'
import { installDebugBadge } from './debug.ts'
import { NS, en, zh } from './i18n/locales.ts'
import type { MobileNavKey } from './i18n/locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Directory-drawer controls copy. */
    'mobileNav': MobileNavKey
  }
}

/** Required services (cordis fiber inject — the loader passes all module exports as an object plugin). */
export const inject = ['slots', 'layout', 'locale', 'sessionLogDownload', 'sessions', 'workspaces']

/**
 * Session-id shape the installed host's sessionLogDownload.download expects.
 * Derived, never imported, so one program type-checks against every host
 * generation: 0.1.1 types the parameter as plain string, 0.1.2-alpha.1 brands
 * it Branded<'SessionId'>. The runtime value is always the host's own id.
 */
type DownloadSessionId = Parameters<ClientContext['sessionLogDownload']['download']>[0]

/**
 * Mobile-adaptive shell, browser half: injects the mobile stylesheet, then
 * contributes the directory toggle to the session header and the backdrop +
 * floating button to the shell overlay.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-web-mobile: dictionaries')

  ctx.effect(() => {
    // Drop any prior copy of this sheet first. Hot reload does not refresh the
    // page, and app self-heal can leave an upstream sheet that would keep
    // winning if we only append.
    for (const stale of document.querySelectorAll('style[data-plugin-css="dsh-web-mobile/mobile.css"]')) {
      stale.remove()
    }
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-web-mobile'
    tag.dataset.pluginCss = 'dsh-web-mobile/mobile.css'
    tag.textContent = MOBILE_CSS
    document.head.appendChild(tag)
    // Keep this stylesheet last in <head> so its overrides win over the
    // host UI's own styles (some host rules also use !important).
    setTimeout(() => {
      if (tag.isConnected) document.head.appendChild(tag)
    }, 0)
    return () => {
      tag.remove()
    }
  }, 'dsh-web-mobile: styles')

  // Hard-fix the installed-plugins list text layout: the host market UI
  // injects its own CSS after this plugin's stylesheet, so CSS overrides can
  // be beaten. Inline !important styles win over every external rule. Keep
  // the selector on outer rows only; irowActions/irowTrailing are nested
  // flex containers and must retain the market's own action geometry.
  ctx.effect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const rowSelector = '[class*="irow"]:not([class*="irowActions"]):not([class*="irowTrailing"])'
    const set = (el: HTMLElement, props: Record<string, string>): void => {
      for (const [key, value] of Object.entries(props)) {
        el.style.setProperty(key, value, 'important')
      }
    }
    const unset = (el: HTMLElement, props: readonly string[]): void => {
      for (const key of props) el.style.removeProperty(key)
    }
    const rowProps = ['flex-wrap', 'align-items', 'gap'] as const
    const firstProps = ['flex', 'max-width', 'min-width'] as const
    const textProps = ['white-space', 'overflow', 'text-overflow', 'max-width'] as const
    const clear = (): void => {
      document.querySelectorAll<HTMLElement>(rowSelector).forEach((row) => {
        unset(row, rowProps)
        const first = row.children[0] as HTMLElement | undefined
        if (first) unset(first, firstProps)
        row.querySelectorAll<HTMLElement>(':scope > button, :scope > [class*="owner"], :scope > [class*="grow"]').forEach((el) => {
          unset(el, ['order'])
        })
        const spec = row.querySelector<HTMLElement>('[class*="spec"]')
        const nm = row.querySelector<HTMLElement>('[class*="nm"]')
        if (spec) unset(spec, textProps)
        if (nm) unset(nm, textProps)
      })
    }
    const apply = (): void => {
      // The market rows only exist while the market UI is mounted (inside a
      // settings dialog). Skip the full-document class-substring scan on every
      // streamed mutation frame with no dialog open; dshmarket keeps the
      // data-dsh-market-root marker (1.20.x), [role="dialog"] covers the
      // settings dialog generically so a marker change degrades to cost, not
      // to a silently dead effect.
      if (document.querySelector('[data-dsh-market-root], [role="dialog"]') === null) return
      document.querySelectorAll<HTMLElement>(rowSelector).forEach((row) => {
        set(row, {
          'flex-wrap': 'wrap',
          'align-items': 'center',
          'gap': '4px 10px',
        })
        const first = row.children[0] as HTMLElement | undefined
        if (first) {
          set(first, {
            'flex': '1 1 100%',
            'max-width': '100%',
            'min-width': '0',
          })
        }
        const spec = row.querySelector<HTMLElement>('[class*="spec"]')
        const nm = row.querySelector<HTMLElement>('[class*="nm"]')
        if (spec) {
          set(spec, {
            'white-space': 'nowrap',
            'overflow': 'hidden',
            'text-overflow': 'ellipsis',
            'max-width': '100%',
          })
        }
        if (nm) {
          set(nm, {
            'white-space': 'nowrap',
            'overflow': 'hidden',
            'text-overflow': 'ellipsis',
            'max-width': '100%',
          })
        }
      })
    }
    const arm = (): void => {
      clear()
      if (mq.matches) apply()
    }
    arm()
    // Streaming floods this observer with document-wide childList batches;
    // coalesce to one apply per frame and re-check the breakpoint at flush
    // time so a queued callback never writes mobile styles on desktop.
    const scheduler = createRafScheduler(
      (cb) => window.requestAnimationFrame(cb),
      (id) => window.cancelAnimationFrame(id),
    )
    const mo = new MutationObserver(() => {
      if (mq.matches) scheduler.schedule(() => { if (mq.matches) apply() })
    })
    mo.observe(document.documentElement, { childList: true, subtree: true })
    mq.addEventListener('change', arm)
    return () => {
      scheduler.cancel()
      mo.disconnect()
      mq.removeEventListener('change', arm)
      clear()
    }
  }, 'dsh-web-mobile: installed-list-inline-styles')


  // Leaving a sidebar panel. The host's panels replace the main area and ship
  // no way back, so every exit route (system back, re-tapping the selected
  // panel row, the FAB) shares this one action.
  const panelExit = createPanelExit(ctx.layout)

  // Shared mobile infrastructure: frame marker ownership and the single
  // full-tree reconciler. Installed inside one effect so a plugin reload in
  // the same JS environment tears the whole reconciler down and rebuilds it.
  ctx.effect(() => {
    const stops = [
      installFrameController(),
      installReconciler(ctx),
      registerReconcileTasks(ctx, panelExit),
    ]
    return () => {
      for (const stop of stops) stop()
    }
  }, 'dsh-web-mobile: reconciler infrastructure')



  // Drawer close interactions: Escape and navigation taps inside the drawer.
  installOverlayInteractions(ctx)

  // Sidebar panel exit: re-tapping the already-selected panel row returns to
  // the conversation (the system-back route is a reconciler task; both call the
  // same action).
  installPanelRowExit(ctx, panelExit.exit)

  // Session deletion, injected into each session row's ⋯ menu (beside
  // rename / fork / archive) with a confirm dialog. Mobile-only.
  installSessionMenuDelete(ctx)

  // Sidebar swipe: edge in opens the drawer, content out closes it. Also owns
  // the right-edge files gesture (leftward opens via openFilesPanel; rightward
  // closes the topmost panel or drawer).
  installSidebarSwipe(ctx, openFilesPanel)

  // Lineage-count chip: reliable open/close on touch pointers (upstream is
  // hover-timer driven and has no onClick on the count variant).
  installSubagentChipTouch(ctx)

  // iOS: tapping the composer's send/stop/+ buttons must not re-raise the
  // dismissed keyboard (upstream keepFocus focuses the editor on mousedown).
  installComposerKeyboardGuard(ctx)
  // iOS: the host Lexical scroll helper mis-scrolls the window on every
  // keystroke (issue #149); pin the composer seat above the keyboard.
  installComposerKeyboardLift(ctx)
  installComposerPlusToggle(ctx)
  // Hero workspace chip: the host's picker portaled its Menu with
  // `anchor={null}`, so its own outside-pointerdown close eats the trigger's
  // tap and the chip's toggle re-opens it. Swallow that one click.
  installWorkspaceChipToggle(ctx)
  // Agent Team chip: the host trigger only opens (its onClick focuses the panel
  // when open, never toggles), so a second tap could not close it. Dispatch the
  // outside pointerdown its own dismiss hook waits for, then swallow the click.
  installTeamChipToggle(ctx)
  // Model/reasoning menu portals to <body>; re-anchor on the trigger so it
  // does not open far left after the CSS centering rule stopped matching.
  installModelMenuAnchor(ctx)
  // Shortcut modal: host autofocuses its search field on open, which raises
  // the soft keyboard and resizes the sheet — suppress that autofocus.
  installShortcutModalKeyboardGuard(ctx)
  // Entering a session (issue #140): the host's InputBar focuses the editor
  // from a [locked, sessionId, editor] passive effect on every switch, which
  // raises the soft keyboard over the history the user wanted to read. A short
  // shadow-focus window per observed session switch swallows that one
  // autofocus; real taps are unaffected.
  installSessionFocusGuard(ctx)

  installPhoneChrome(ctx)

  // Debug badge (?mobile-nav-debug=1): live state overlay for phone-side
  // repros. No-op without the query param (docs: README, AGENTS.md).
  installDebugBadge(ctx)

  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'mobile-nav-toggle',
    order: 10,
    locale: NS,
    inject: () => ({
      toggleSidebar: () => ctx.layout.toggleSidebar(),
    }),
  }, MobileNavToggle))


  // Session log download, relocated from the session header to the drawer
  // footer on mobile (header capsule hidden by CSS). Files entry removed —
  // see docs/specs/2026-09-17-sidebar-files-coexistence-design.md.
  //
  // Order 5 sits under remote-web-ui icons (default 0) and above
  // usage-stats (10) so the pill is not wedged between them.
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'mobile-nav-session-log',
    order: 5,
    locale: NS,
    inject: () => ({
      // The component's internal id is a plain string (slot runtime typing);
      // the host-generation brand boundary lives here and only here, hence
      // the double assertion (string and Branded<'SessionId'> do not overlap).
      downloadSessionLog: (sessionId: string) =>
        ctx.sessionLogDownload.download(sessionId as unknown as DownloadSessionId),
    }),
  }, MobileDrawerFooter))

  // Composer file entry: host removed the paperclip; re-add a permanent
  // control in conversation.input.left that clicks the host's hidden
  // input[type=file] so validation/upload stay host-owned.
  ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
    name: 'conversation.input.left',
    id: 'mobile-nav-file-upload',
    order: 10,
    locale: NS,
    inject: () => ({}),
  }, ComposerFileButton))
}
