/**
 * Transparent gzip/brotli for large JSON responses.
 *
 * Patches `http.ServerResponse.prototype` (process-wide; restored on dispose)
 * so host JSON — including `/api/*` — compresses when the client accepts it:
 * - Codec from `Accept-Encoding`: `br` (quality 6) preferred, else `gzip`.
 * - Only JSON ≥ MIN_JSON_BYTES; other content types pass through unchanged.
 * - `writeHead` is deferred until body size is known so `Content-Length`
 *   matches; non-JSON calls the original `writeHead` immediately.
 *
 * Browser fetch decompresses transparently. SSE is left uncompressed.
 *
 * Limitations (#80): deferred `write()` always returns true (no backpressure);
 * buffered write callbacks fire once, in order, after the real `end()`.
 *
 * On dispose, flush in-flight deferred responses uncompressed (via live Set;
 * WeakMap is not iterable), then restore prototype methods.
 */
import { brotliCompressSync, constants as zlibConstants, gzipSync } from 'node:zlib'
import { ServerResponse as NodeServerResponse } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'

/** Only payloads at least this large are worth compressing. */
const MIN_JSON_BYTES = 4 * 1024

/** Brotli quality: 6 balances size and CPU for large JSON (17MB → ~1MB). */
const BROTLI_QUALITY = 6

/** One deferred response: headers held back until the body size is known. */
interface DeferredResponse {
  /** Original writeHead argument list (status/message/headers) to replay. */
  writeHeadArgs: unknown[]
  /** Original headers object carried by writeHeadArgs. */
  headers: Record<string, string | number | string[]>
  /** Codec chosen from the request's Accept-Encoding. */
  encoding: 'br' | 'gzip'
  /** Buffered body chunks. */
  chunks: Buffer[]
  /** write() completion callbacks buffered during deferral. */
  writeCallbacks: Array<() => void>
}

/** Per-response state; only present while a JSON response is being deferred. */
const deferred = new WeakMap<ServerResponse, DeferredResponse>()

/** Strong refs for in-flight deferred responses so dispose can flush them
 * (WeakMap alone is not iterable). Cleared on end() or disposer flush. */
const liveDeferred = new Set<ServerResponse>()

/** Choose the codec the client accepts; `br` outranks `gzip`. */
function pickEncoding(res: ServerResponse): 'br' | 'gzip' | null {
  const accepted = (res.req as IncomingMessage | undefined)?.headers['accept-encoding'] ?? ''
  if (/\bbr\b/.test(accepted)) return 'br'
  if (/\bgzip\b/.test(accepted)) return 'gzip'
  return null
}

/** Header lookup ignoring key casing (raw writeHead args before Node lowercases). */
export function headerValue(headers: Record<string, string | number | string[]>, name: string): string | undefined {
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === name) return String(headers[key])
  }
  return undefined
}

/** Whether a response warrants deferred (potentially compressed) handling. */
export function isDeferrable(headers: Record<string, string | number | string[]>): boolean {
  if (headerValue(headers, 'content-encoding') !== undefined) return false
  const contentType = headerValue(headers, 'content-type') ?? ''
  return contentType.includes('json')
}

/** Append the Accept-Encoding Vary token without clobbering an existing Vary. */
export function varyWithAcceptEncoding(headers: Record<string, string | number | string[]>): void {
  const existingKey = Object.keys(headers).find((key) => key.toLowerCase() === 'vary')
  if (existingKey === undefined) {
    headers['vary'] = 'Accept-Encoding'
  } else {
    headers[existingKey] = `${String(headers[existingKey])}, Accept-Encoding`
  }
}

/** Buffer one body chunk for a deferred response, honoring the caller's encoding. */
function bufferChunk(pending: DeferredResponse, chunk: unknown, encoding?: unknown): void {
  const enc = typeof encoding === 'string' ? (encoding as BufferEncoding) : undefined
  if (typeof chunk === 'string') pending.chunks.push(Buffer.from(chunk, enc))
  else if (chunk instanceof Uint8Array) pending.chunks.push(Buffer.from(chunk))
  else if (chunk !== null && chunk !== undefined) pending.chunks.push(Buffer.from(String(chunk)))
}

/** Fire the buffered write() callbacks once, in order, after the replay. */
function fireWriteCallbacks(pending: DeferredResponse): void {
  for (const callback of pending.writeCallbacks.splice(0)) callback()
}

/** Replay the stored writeHead args with a replacement headers object. */
function writeHeadWith(res: ServerResponse, origWriteHead: (...args: unknown[]) => ServerResponse, pending: DeferredResponse, headers: Record<string, string | number | string[]>): ServerResponse {
  const args = pending.writeHeadArgs.slice() as unknown[]
  if (typeof args[1] === 'string') args[2] = headers
  else args[1] = headers
  // Keep the receiver: node's writeHead reads this._header etc.
  return origWriteHead.apply(res, args) as ServerResponse
}

/** Drop tracking for one deferred response (end path or dispose flush). */
function clearDeferred(res: ServerResponse): DeferredResponse | undefined {
  const pending = deferred.get(res)
  deferred.delete(res)
  liveDeferred.delete(res)
  return pending
}

/** Flush one deferred response uncompressed (plugin unload / hot-reload). */
function flushDeferredUncompressed(
  res: ServerResponse,
  pending: DeferredResponse,
  origWriteHead: (...args: unknown[]) => ServerResponse,
  origEnd: (chunk?: unknown, ...rest: unknown[]) => ServerResponse,
): void {
  const body = Buffer.concat(pending.chunks)
  const headers = { ...pending.headers }
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === 'content-length') delete headers[key]
  }
  if (body.byteLength > 0) headers['content-length'] = body.byteLength
  try {
    writeHeadWith(res, origWriteHead, pending, headers)
    if (body.byteLength === 0) origEnd.apply(res, [] as never)
    else origEnd.apply(res, [body] as never)
    fireWriteCallbacks(pending)
  } catch {
    try {
      res.destroy()
    } catch {
      // Best-effort: socket may already be gone during unload.
    }
  }
}

/**
 * Install the compression patch on http.ServerResponse.prototype.
 * @returns disposer restoring the original methods (plugin reload safety).
 */
export function installResponseCompression(): () => void {
  const proto = NodeServerResponse.prototype
  // Capture originals; overloaded impls are restored unchanged on dispose.
  const origWriteHead = proto.writeHead as (...args: unknown[]) => ServerResponse
  const origWrite = proto.write as (chunk: unknown, ...rest: unknown[]) => boolean
  const origEnd = proto.end as (chunk?: unknown, ...rest: unknown[]) => ServerResponse

  function patchedWriteHead(this: ServerResponse, ...args: unknown[]): ServerResponse {
    const rawHeaders = typeof args[1] === 'string' ? args[2] : args[1]
    const headers = rawHeaders as Record<string, string | number | string[]> | undefined
    if (headers === undefined || !isDeferrable(headers)) {
      return origWriteHead.apply(this, args as never) as ServerResponse
    }
    const encoding = pickEncoding(this)
    if (encoding === null) {
      return origWriteHead.apply(this, args as never) as ServerResponse
    }
    // Defer header write until body size is known.
    deferred.set(this, { writeHeadArgs: args, headers, encoding, chunks: [], writeCallbacks: [] })
    liveDeferred.add(this)
    return this
  }

  function patchedWrite(this: ServerResponse, chunk: unknown, ...rest: unknown[]): boolean {
    const pending = deferred.get(this)
    if (pending !== undefined) {
      // Preserve encoding with the chunk; queue completion callbacks (#80).
      bufferChunk(pending, chunk, typeof rest[0] === 'string' ? rest[0] : undefined)
      for (const arg of rest) {
        if (typeof arg === 'function') pending.writeCallbacks.push(arg as () => void)
      }
      return true
    }
    return origWrite.apply(this, [chunk, ...rest] as never) as boolean
  }

  function patchedEnd(this: ServerResponse, chunk?: unknown, ...rest: unknown[]): ServerResponse {
    const pending = clearDeferred(this)
    if (pending === undefined) {
      return chunk === undefined
        ? origEnd.apply(this, rest as never) as ServerResponse
        : origEnd.apply(this, [chunk, ...rest] as never) as ServerResponse
    }
    // `end(callback)`: callback only — do not treat as body.
    const callbacks = (typeof chunk === 'function' ? [chunk, ...rest] : rest)
      .filter((arg) => typeof arg === 'function')
    // Buffer data/encoding only; replaying encoding as body would corrupt (#78).
    if (chunk !== undefined && typeof chunk !== 'function') bufferChunk(pending, chunk, typeof rest[0] === 'string' ? rest[0] : undefined)
    const body = Buffer.concat(pending.chunks)

    // Below threshold: original headers and body verbatim.
    if (body.byteLength < MIN_JSON_BYTES) {
      writeHeadWith(this, origWriteHead, pending, pending.headers)
      const ended = body.byteLength === 0
        ? origEnd.apply(this, callbacks as never) as ServerResponse
        : origEnd.apply(this, [body, ...callbacks] as never) as ServerResponse
      fireWriteCallbacks(pending)
      return ended
    }

    // Compress and rewrite length-bearing headers.
    const compressed = pending.encoding === 'br'
      ? brotliCompressSync(body, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY } })
      : gzipSync(body, { level: 6 })
    const headers = { ...pending.headers }
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === 'content-length') delete headers[key]
    }
    headers['content-encoding'] = pending.encoding
    headers['content-length'] = compressed.byteLength
    varyWithAcceptEncoding(headers)
    writeHeadWith(this, origWriteHead, pending, headers)
    origWrite.call(this, compressed)
    const ended = origEnd.apply(this, callbacks as never) as ServerResponse
    fireWriteCallbacks(pending)
    return ended
  }

  proto.writeHead = patchedWriteHead
  proto.write = patchedWrite
  proto.end = patchedEnd

  return () => {
    // Snapshot before restore so concurrent end() cannot race the flush.
    const inFlight = [...liveDeferred]
    if (proto.writeHead === patchedWriteHead) proto.writeHead = origWriteHead
    if (proto.write === patchedWrite) proto.write = origWrite
    if (proto.end === patchedEnd) proto.end = origEnd
    for (const res of inFlight) {
      const pending = clearDeferred(res)
      if (pending === undefined) continue
      flushDeferredUncompressed(res, pending, origWriteHead, origEnd)
    }
  }
}
