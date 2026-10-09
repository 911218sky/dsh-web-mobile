/**
 * Node half of dsh-web-mobile: `apply()` registers the plugin with the host
 * Loader. Installs transparent gzip/brotli for large JSON responses (patches
 * `http.ServerResponse.prototype`; disposer restores on unload) and a session
 * delete route the host menu lacks (rename / fork / archive only).
 *
 * `POST /api/mobile-nav.session.delete` → `deleteSession()` (`delete-session.ts`).
 * Services are read via `ctx.get()` at request time so missing host services
 * yield a structured error instead of a crash.
 *
 * Browser half: exports["./client"] via package.json `dsh.client`. Host types
 * are structural (no harness type-imports; this repo only has client packages).
 */
import { timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { installResponseCompression } from './compress.js'
import { deleteSession, type DeleteSessionDeps } from './delete-session.js'

/** Minimal structural slice of the host cordis Context that apply() needs. */
export interface HostContext {
  /** Register one disposable installer; its return value disposes on unload. */
  effect(install: () => unknown, label?: string): unknown
  /** Read one optional service by name (undefined when the host omits it). */
  get(service: string): unknown
  /** Run apply once the named services exist (cordis fiber inject). */
  inject(services: readonly string[], apply: (scoped: ScopedContext) => void): void
  /** Host logger service face (warn-level is all this plugin uses). */
  logger: { warn(message: string): void }
}

/** Context shape inside the `webServer` inject scope. */
export interface ScopedContext extends HostContext {
  webServer: {
    register(route: {
      kind: 'exact'
      path: string
      handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
    }): unknown
  }
}

/** Wire contract of the session-delete endpoint. */
interface DeleteSessionBody {
  sessionId?: unknown
}

/** Maximum accepted request body size (1 MiB — the delete body is one id). */
const MAX_BODY_BYTES = 1_048_576

/** Sentinel: the request body grew past MAX_BODY_BYTES. */
class PayloadTooLargeError extends Error {}

/** Drain the request body as UTF-8; reject with PayloadTooLargeError past
 * MAX_BODY_BYTES. Past the limit, release the buffer and discard further
 * chunks (leave the socket to drain so the 413 can be delivered). */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    let bytes = 0
    let tooLarge = false
    req.setEncoding('utf8')
    req.on('data', (chunk: string) => {
      bytes += Buffer.byteLength(chunk)
      if (bytes > MAX_BODY_BYTES) {
        tooLarge = true
        data = ''
        return
      }
      if (!tooLarge) data += chunk
    })
    req.on('end', () => {
      if (tooLarge) reject(new PayloadTooLargeError())
      else resolve(data)
    })
    req.on('error', reject)
  })
}

/** Same-origin gate: browser Origin must match the request host. Missing
 * Origin → non-browser; {@link isMissingOriginAuthorized} decides (loopback /
 * session cookie / known token). Host equality covers localhost and LAN. */
function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin
  if (origin === undefined || origin === '') return true
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

function isLoopbackAddress(addr: string): boolean {
  return (
    addr === '127.0.0.1' ||
    addr === '::1' ||
    addr === ':ffff:127.0.0.1' ||
    addr === '::ffff:127.0.0.1' ||
    addr.endsWith('127.0.0.1')
  )
}

function timingSafeStringEqual(actual: string, expected: string): boolean {
  const a = Buffer.from(actual, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.byteLength !== b.byteLength) {
    timingSafeEqual(a, a)
    return false
  }
  return timingSafeEqual(a, b)
}

function knownAuthTokens(): string[] {
  return [
    process.env.DSH_WEB_TOKEN,
    process.env.DSH_TOKEN,
    process.env.DSH_BROWSER_LAUNCH_TOKEN,
  ].filter((t): t is string => typeof t === 'string' && t.length > 0)
}

function matchesKnownToken(value: string): boolean {
  return knownAuthTokens().some((token) => timingSafeStringEqual(value, token))
}

function hasStructuredSessionCookie(req: IncomingMessage): boolean {
  const cookie = String(req.headers.cookie || '')
  if (!cookie) return false
  for (const segment of cookie.split(';')) {
    const at = segment.indexOf('=')
    if (at === -1) continue
    const name = segment.slice(0, at).trim()
    const value = segment.slice(at + 1).trim()
    if (!name.startsWith('dsh-auth-')) continue
    // DSH signed cookie: v1.<body>.<sig>
    if (/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) return true
  }
  return false
}

function hasRequestToken(req: IncomingMessage): boolean {
  const header = req.headers['x-dsh-web-token']
  if (typeof header === 'string' && matchesKnownToken(header)) return true
  const auth = req.headers.authorization
  if (typeof auth === 'string') {
    const m = /^Bearer\s+(\S+)$/i.exec(auth.trim())
    if (m?.[1] && matchesKnownToken(m[1])) return true
  }
  return false
}

/** Non-browser delete clients (no Origin): loopback, session cookie, or token. */
function isMissingOriginAuthorized(req: IncomingMessage): boolean {
  const addr = req.socket.remoteAddress || ''
  if (isLoopbackAddress(addr)) return true
  if (hasStructuredSessionCookie(req)) return true
  if (hasRequestToken(req)) return true
  return false
}

/** Write one JSON response with a fixed content type. */
function respond(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

/** Early failure before `readBody`: discard any unread body so keep-alive
 * sockets are not left half-open after the JSON error reply. */
function respondFailure(req: IncomingMessage, res: ServerResponse, status: number, body: unknown): void {
  req.resume()
  respond(res, status, body)
}

/** Plugin id (`name` + `apply`); keep in sync with package.json. */
export const name = 'dsh-web-mobile'

export function apply(ctx: HostContext): void {
  // Transparent gzip/brotli; disposer restores ServerResponse.prototype.
  ctx.effect(() => installResponseCompression(), 'dsh-web-mobile: response compression')

  // Session-delete route once webServer exists; services read per request.
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: '/api/mobile-nav.session.delete',
      handler: async (req, res) => {
        if (req.method !== 'POST') {
          respondFailure(req, res, 405, { error: { code: 'method-not-allowed', message: 'POST required' } })
          return
        }
        if (!sameOrigin(req)) {
          respondFailure(req, res, 403, { error: { code: 'cross-origin', message: 'cross-origin request rejected: Origin host does not match the request host' } })
          return
        }
        const origin = req.headers.origin
        if ((origin === undefined || origin === '') && !isMissingOriginAuthorized(req)) {
          respondFailure(req, res, 401, {
            error: {
              code: 'unauthorized',
              message: 'missing Origin requires loopback, a DSH session cookie, or a known token',
            },
          })
          return
        }
        let body: DeleteSessionBody
        try {
          body = JSON.parse(await readBody(req)) as DeleteSessionBody
        } catch (error) {
          if (error instanceof PayloadTooLargeError) {
            respond(res, 413, { error: { code: 'payload-too-large', message: `request body exceeds the ${MAX_BODY_BYTES}-byte limit` } })
            return
          }
          respond(res, 400, {
            error: { code: 'invalid-body', message: 'expected a JSON body of the form { "sessionId": string }' },
          })
          return
        }
        const { sessionId } = body
        if (typeof sessionId !== 'string' || sessionId === '') {
          respond(res, 400, {
            error: { code: 'invalid-session-id', message: 'sessionId must be a non-empty string' },
          })
          return
        }

        const persistence = ctx.get('sessionPersistence')
        if (persistence === undefined) {
          respond(res, 503, {
            error: { code: 'persistence-unavailable', message: 'session persistence is not configured' },
          })
          return
        }
        const result = await deleteSession({
          persistence: persistence as DeleteSessionDeps['persistence'],
          sessions: ctx.get('sessions') as DeleteSessionDeps['sessions'] | undefined,
          agents: ctx.get('agents') as DeleteSessionDeps['agents'] | undefined,
          workspaceRegistry: ctx.get('workspaceRegistry') as DeleteSessionDeps['workspaceRegistry'] | undefined,
        }, sessionId)
        if (result.ok) {
          respond(res, 200, { ok: true, deleted: result.deleted })
          return
        }
        ctx.logger.warn(
          `dsh-web-mobile: session-delete failed for '${sessionId}' (${result.error.code}): ${result.error.message}`,
        )
        respond(res, result.status, { error: result.error })
      },
    }), 'dsh-web-mobile: session-delete route')
  })
}
