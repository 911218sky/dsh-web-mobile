import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import { IconDownload } from '../core/icon-compat.ts'
import { NS } from '../i18n/locales.ts'
import { currentSessionIdOf } from '../core/sessions-compat.ts'

/** Full props for the sidebar footer action entry. */
export interface MobileDrawerFooterProps extends PropsRuntime<'sidebar.footer.action'>, PropsLocale<typeof NS> {
  /** Bound ctx.sessionLogDownload.download() for the current session. */
  downloadSessionLog: (sessionId: string) => void
}

/**
 * Mobile-only drawer footer: session-log export (shared with the desktop
 * dialog). Hidden on wide screens via CSS.
 *
 * Files entry removed — while the drawer is open, neither the host nor the
 * dismiss shim lets a click reach the right-sidebar opener. See
 * docs/specs/2026-09-17-sidebar-files-coexistence-design.md.
 */
export function MobileDrawerFooter({ useSessions, downloadSessionLog, t }: MobileDrawerFooterProps) {
  const sessionId = useSessions((state) => currentSessionIdOf(state))
  return (
    <div data-mobile-nav="drawer-actions">
      <button
        type="button"
        data-mobile-nav="session-log"
        aria-label={t('sessionLog')}
        title={t('sessionLog')}
        disabled={sessionId === undefined}
        onClick={() => {
          if (sessionId !== undefined) downloadSessionLog(sessionId)
        }}
      >
        <IconDownload size={14} />
        <span>{t('sessionLog')}</span>
      </button>
    </div>
  )
}
