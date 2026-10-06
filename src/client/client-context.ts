/**
 * Client Context type hub for DSH 0.2+.
 *
 * Official 0.2 client plugins use `Context` from `@deepseek-ai/cordis` plus
 * type-only imports that merge services into that Context. The old
 * `@deepseek-ai/dsh-client-runtime` package is gone on the 0.2 line (npm stops
 * at 0.1.x), so this module is the single import site for ClientContext.
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'

import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import type {} from '@deepseek-ai/dsh-api-workspace-controller/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-session-log-export/client'

export type { ClientContext }
