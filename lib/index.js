import { timingSafeEqual } from "node:crypto";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import { ServerResponse } from "node:http";
import { mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
//#region src/compress.ts
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
/** Only payloads at least this large are worth compressing. */
const MIN_JSON_BYTES = 4096;
/** Brotli quality: 6 balances size and CPU for large JSON (17MB → ~1MB). */
const BROTLI_QUALITY = 6;
/** Per-response state; only present while a JSON response is being deferred. */
const deferred = /* @__PURE__ */ new WeakMap();
/** Strong refs for in-flight deferred responses so dispose can flush them
* (WeakMap alone is not iterable). Cleared on end() or disposer flush. */
const liveDeferred = /* @__PURE__ */ new Set();
/** Choose the codec the client accepts; `br` outranks `gzip`. */
function pickEncoding(res) {
	const accepted = res.req?.headers["accept-encoding"] ?? "";
	if (/\bbr\b/.test(accepted)) return "br";
	if (/\bgzip\b/.test(accepted)) return "gzip";
	return null;
}
/** Header lookup ignoring key casing (raw writeHead args before Node lowercases). */
function headerValue(headers, name) {
	for (const key of Object.keys(headers)) if (key.toLowerCase() === name) return String(headers[key]);
}
/** Whether a response warrants deferred (potentially compressed) handling. */
function isDeferrable(headers) {
	if (headerValue(headers, "content-encoding") !== void 0) return false;
	return (headerValue(headers, "content-type") ?? "").includes("json");
}
/** Append the Accept-Encoding Vary token without clobbering an existing Vary. */
function varyWithAcceptEncoding(headers) {
	const existingKey = Object.keys(headers).find((key) => key.toLowerCase() === "vary");
	if (existingKey === void 0) headers["vary"] = "Accept-Encoding";
	else headers[existingKey] = `${String(headers[existingKey])}, Accept-Encoding`;
}
/** Buffer one body chunk for a deferred response, honoring the caller's encoding. */
function bufferChunk(pending, chunk, encoding) {
	const enc = typeof encoding === "string" ? encoding : void 0;
	if (typeof chunk === "string") pending.chunks.push(Buffer.from(chunk, enc));
	else if (chunk instanceof Uint8Array) pending.chunks.push(Buffer.from(chunk));
	else if (chunk !== null && chunk !== void 0) pending.chunks.push(Buffer.from(String(chunk)));
}
/** Fire the buffered write() callbacks once, in order, after the replay. */
function fireWriteCallbacks(pending) {
	for (const callback of pending.writeCallbacks.splice(0)) callback();
}
/** Replay the stored writeHead args with a replacement headers object. */
function writeHeadWith(res, origWriteHead, pending, headers) {
	const args = pending.writeHeadArgs.slice();
	if (typeof args[1] === "string") args[2] = headers;
	else args[1] = headers;
	return origWriteHead.apply(res, args);
}
/** Drop tracking for one deferred response (end path or dispose flush). */
function clearDeferred(res) {
	const pending = deferred.get(res);
	deferred.delete(res);
	liveDeferred.delete(res);
	return pending;
}
/** Flush one deferred response uncompressed (plugin unload / hot-reload). */
function flushDeferredUncompressed(res, pending, origWriteHead, origEnd) {
	const body = Buffer.concat(pending.chunks);
	const headers = { ...pending.headers };
	for (const key of Object.keys(headers)) if (key.toLowerCase() === "content-length") delete headers[key];
	if (body.byteLength > 0) headers["content-length"] = body.byteLength;
	try {
		writeHeadWith(res, origWriteHead, pending, headers);
		if (body.byteLength === 0) origEnd.apply(res, []);
		else origEnd.apply(res, [body]);
		fireWriteCallbacks(pending);
	} catch {
		try {
			res.destroy();
		} catch {}
	}
}
/**
* Install the compression patch on http.ServerResponse.prototype.
* @returns disposer restoring the original methods (plugin reload safety).
*/
function installResponseCompression() {
	const proto = ServerResponse.prototype;
	const origWriteHead = proto.writeHead;
	const origWrite = proto.write;
	const origEnd = proto.end;
	function patchedWriteHead(...args) {
		const headers = typeof args[1] === "string" ? args[2] : args[1];
		if (headers === void 0 || !isDeferrable(headers)) return origWriteHead.apply(this, args);
		const encoding = pickEncoding(this);
		if (encoding === null) return origWriteHead.apply(this, args);
		deferred.set(this, {
			writeHeadArgs: args,
			headers,
			encoding,
			chunks: [],
			writeCallbacks: []
		});
		liveDeferred.add(this);
		return this;
	}
	function patchedWrite(chunk, ...rest) {
		const pending = deferred.get(this);
		if (pending !== void 0) {
			bufferChunk(pending, chunk, typeof rest[0] === "string" ? rest[0] : void 0);
			for (const arg of rest) if (typeof arg === "function") pending.writeCallbacks.push(arg);
			return true;
		}
		return origWrite.apply(this, [chunk, ...rest]);
	}
	function patchedEnd(chunk, ...rest) {
		const pending = clearDeferred(this);
		if (pending === void 0) return chunk === void 0 ? origEnd.apply(this, rest) : origEnd.apply(this, [chunk, ...rest]);
		const callbacks = (typeof chunk === "function" ? [chunk, ...rest] : rest).filter((arg) => typeof arg === "function");
		if (chunk !== void 0 && typeof chunk !== "function") bufferChunk(pending, chunk, typeof rest[0] === "string" ? rest[0] : void 0);
		const body = Buffer.concat(pending.chunks);
		if (body.byteLength < MIN_JSON_BYTES) {
			writeHeadWith(this, origWriteHead, pending, pending.headers);
			const ended = body.byteLength === 0 ? origEnd.apply(this, callbacks) : origEnd.apply(this, [body, ...callbacks]);
			fireWriteCallbacks(pending);
			return ended;
		}
		const compressed = pending.encoding === "br" ? brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY } }) : gzipSync(body, { level: 6 });
		const headers = { ...pending.headers };
		for (const key of Object.keys(headers)) if (key.toLowerCase() === "content-length") delete headers[key];
		headers["content-encoding"] = pending.encoding;
		headers["content-length"] = compressed.byteLength;
		varyWithAcceptEncoding(headers);
		writeHeadWith(this, origWriteHead, pending, headers);
		origWrite.call(this, compressed);
		const ended = origEnd.apply(this, callbacks);
		fireWriteCallbacks(pending);
		return ended;
	}
	proto.writeHead = patchedWriteHead;
	proto.write = patchedWrite;
	proto.end = patchedEnd;
	return () => {
		const inFlight = [...liveDeferred];
		if (proto.writeHead === patchedWriteHead) proto.writeHead = origWriteHead;
		if (proto.write === patchedWrite) proto.write = origWrite;
		if (proto.end === patchedEnd) proto.end = origEnd;
		for (const res of inFlight) {
			const pending = clearDeferred(res);
			if (pending === void 0) continue;
			flushDeferredUncompressed(res, pending, origWriteHead, origEnd);
		}
	};
}
//#endregion
//#region src/delete-session.ts
/**
* Session deletion for the mobile host route.
*
* Compatible across host generations:
* 1. `persistence.list()` — flat headers (≤0.1.2) or handle entries with
*    `.header` (0.1.3+); `entryHeader()` accepts both.
* 2. Live teardown needs AgentHandle (`cancel` + `whenIdle`); older hosts
*    without that face get 409 session-busy instead of deleting under a live
*    agent.
* 3. `detachSession` is optional per workspace so missing accounting never
*    fails a finished deletion.
*
* Layout under `persistence.config.root`:
*   `<root>/<projectKey(cwd)>/<encodeSegment(id)>/`
* Deletion moves the directory to `.sessions-trash/` (payloads renamed with
* `.trash`, best-effort `manifest.json`); entries older than 24h are purged.
*
* Live sessions: cancel → whenIdle → flush → detach store internals (optional-
* chained). Attachment blobs are content-addressed and not removed.
*/
/** How long to wait for a live agent to converge to idle before refusing. */
const IDLE_TIMEOUT_MS = 2e4;
/** Trash entries older than this are purged (best effort) after a successful move. */
const TRASH_TTL_MS = 864e5;
/** Canonical payload names the host list() scan recognizes
* (session[.vN].jsonl[.zstd] — mirror of the backend's CANONICAL_LOG_FILENAME). */
const PAYLOAD_NAME = /^session(?:\.v[1-9][0-9]*)?\.jsonl(?:\.zstd)?$/;
/** `rename-payloads`: payloads untouched. `stash`: payloads renamed (hidden
* from list) but the directory is still in place. */
var TrashMoveError = class extends Error {
	stage;
	constructor(stage, cause) {
		super(errorMessage(cause));
		this.stage = stage;
	}
};
/** Escape one raw session id into one filesystem-safe path segment (backend layout). */
function encodeSegment(raw) {
	if (raw.length === 0) throw new Error("cannot encode an empty path segment");
	if (raw === ".") return "~002E";
	if (raw === "..") return "~002E~002E";
	let out = "";
	for (let i = 0; i < raw.length; i++) {
		const code = raw.charCodeAt(i);
		const ch = String.fromCharCode(code);
		if (ch !== "~" && /^[A-Za-z0-9._-]$/.test(ch)) out += ch;
		else out += "~" + code.toString(16).toUpperCase().padStart(4, "0");
	}
	return out;
}
/** Build the readable directory key for a project path (backend layout). */
function projectKey(cwd) {
	if (cwd.length === 0) throw new Error("cannot encode an empty project path");
	let readable = "";
	let separatorRun = false;
	for (let i = 0; i < cwd.length; i++) {
		const code = cwd.charCodeAt(i);
		const ch = String.fromCharCode(code);
		if (ch === "/" || ch === "\\" || ch === ":") {
			if (!separatorRun) readable += "-";
			separatorRun = true;
		} else if (ch !== "~" && /^[A-Za-z0-9._-]$/.test(ch)) {
			readable += ch;
			separatorRun = false;
		} else {
			readable += "~" + code.toString(16).toUpperCase().padStart(4, "0");
			separatorRun = false;
		}
	}
	return `--${(readable.replace(/^-+/, "") || "root").slice(0, 251)}--`;
}
/** The directory owned by one session under the backend root. */
function sessionDir(root, cwd, id) {
	const project = cwd === void 0 ? "_no-cwd" : projectKey(cwd);
	return join(root, project, encodeSegment(id));
}
/** Whether `target` resolves to a path inside `root` (defense against escapes). */
function isInside(root, target) {
	const rel = relative(root, target);
	return rel !== ".." && !rel.startsWith(".." + sep) && rel !== "";
}
/** Bound a promise with a rejection deadline so a stuck agent never hangs the endpoint. */
function withTimeout(promise, ms, message) {
	return new Promise((resolvePromise, reject) => {
		const timer = setTimeout(() => reject(new Error(message)), ms);
		promise.then((value) => {
			clearTimeout(timer);
			resolvePromise(value);
		}, (error) => {
			clearTimeout(timer);
			reject(error);
		});
	});
}
/** Unregister a live agent via runtime-visible store internals, if present. */
function detachLiveAgent(agents, id) {
	const registry = agents;
	const entry = registry?.store?.get(id);
	if (entry !== void 0) registry?.detachEntered?.(entry);
}
/** Unregister a live session via runtime-visible store internals, if present. */
function detachLiveSession(sessions, id) {
	sessions?.store?.get(id)?.detach?.();
}
/** Detach from every workspace account (idempotent). Skip workspaces without
* `detachSession`. */
async function detachFromWorkspaces(deps, sessionId) {
	if (deps.workspaceRegistry === void 0) return;
	for (const workspace of deps.workspaceRegistry.list()) await workspace.detachSession?.(sessionId);
}
function errorMessage(error) {
	return error instanceof Error ? error.message : String(error);
}
/**
* Move one session's stored directory into the trash (`.sessions-trash/`
* under the persistence root) instead of removing it, replacing the plain
* recursive rm.
*
* Order is load-bearing: payloads are renamed with a `.trash` suffix FIRST —
* non-canonical names are invisible to the host's list() scan — so a
* canonical directory with canonical payload names never appears under the
* trash root (that would make assertStoredIdentity throw a plain Error which
* listArtifacts does not filter, failing the ENTIRE session list). The
* directory rename then removes the canonical directory within milliseconds.
* `manifest.json` (a `.json` name is safe) records the restore mapping, best
* effort: the from→to rule is deterministic even without it (drop the
* `.trash` suffix). Stale entries older than TRASH_TTL_MS are purged after
* each successful move; every purge failure is swallowed (pure core, no
* logger) and no long-lived timer is ever created.
*/
async function moveToTrash(root, dir, cwd, sessionId) {
	const project = cwd === void 0 ? "_no-cwd" : projectKey(cwd);
	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch (error) {
		throw new TrashMoveError("rename-payloads", error);
	}
	const renamed = [];
	for (const entry of entries) {
		if (!entry.isFile() || !PAYLOAD_NAME.test(entry.name)) continue;
		const to = `${entry.name}.trash`;
		try {
			await rename(join(dir, entry.name), join(dir, to));
		} catch (error) {
			throw new TrashMoveError("rename-payloads", error);
		}
		renamed.push({
			from: entry.name,
			to
		});
	}
	const trashRoot = join(root, ".sessions-trash");
	const trashName = `${(/* @__PURE__ */ new Date()).toISOString().replaceAll(":", "-")}-${project}-${encodeSegment(sessionId)}`;
	const trashDir = join(trashRoot, trashName);
	try {
		await mkdir(trashRoot, { recursive: true });
		await rename(dir, trashDir);
	} catch (error) {
		throw new TrashMoveError("stash", error);
	}
	try {
		const manifest = {
			id: sessionId,
			cwd,
			deletedAt: (/* @__PURE__ */ new Date()).toISOString(),
			files: renamed
		};
		await writeFile(join(trashDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
	} catch {}
	await purgeStaleTrash(trashRoot);
}
/** Remove trash entries older than TRASH_TTL_MS; every failure is swallowed. */
async function purgeStaleTrash(trashRoot) {
	try {
		const cutoff = Date.now() - TRASH_TTL_MS;
		for (const name of await readdir(trashRoot)) try {
			if ((await stat(join(trashRoot, name))).mtimeMs < cutoff) await rm(join(trashRoot, name), {
				recursive: true,
				force: true
			});
		} catch {}
	} catch {}
}
/** Normalize one `persistence.list()` entry across host generations: prefer
* the 0.1.3 snapshot's `.header`, fall back to the flat 0.1.2 header.
* Entries without a usable id are skipped. */
function entryHeader(entry) {
	const header = entry.header ?? entry;
	if (typeof header.id !== "string" || header.id === "") return void 0;
	return {
		id: header.id,
		cwd: typeof header.cwd === "string" ? header.cwd : void 0
	};
}
/**
* Delete one session: stop it if live, remove its persisted directory, and
* detach it from every workspace account.
* @param deps - Injected services; the deletion flow never imports the harness.
* @param sessionId - The session to delete.
* @returns A structured result the caller maps to an HTTP response.
*/
async function deleteSession(deps, sessionId) {
	const root = deps.persistence.config?.root;
	if (root === void 0 || root === "") return {
		status: 503,
		ok: false,
		error: {
			code: "persistence-unavailable",
			message: "session persistence is not configured with a storage root"
		}
	};
	let snapshot;
	try {
		snapshot = (await deps.persistence.list()).map(entryHeader).find((header) => header !== void 0 && header.id === sessionId);
	} catch (error) {
		return {
			status: 500,
			ok: false,
			error: {
				code: "delete-lookup-failed",
				message: `failed to look up the session: ${errorMessage(error)}`
			}
		};
	}
	if (snapshot === void 0) return {
		status: 404,
		ok: false,
		error: {
			code: "session-not-found",
			message: `no such session '${sessionId}'`
		}
	};
	const live = deps.sessions?.get(sessionId);
	if (live !== void 0 && deps.sessions !== void 0) {
		const agent = deps.agents?.get(sessionId);
		const handle = agent !== void 0 && typeof agent.cancel === "function" && typeof agent.whenIdle === "function" ? agent : void 0;
		if (agent !== void 0 && handle === void 0) return {
			status: 409,
			ok: false,
			error: {
				code: "session-busy",
				message: `session '${sessionId}' is live on a host generation that exposes no agent disposal face; stop it first, then retry`
			}
		};
		try {
			if (handle !== void 0) {
				handle.cancel({ kind: "disposed" });
				await withTimeout(handle.whenIdle(), IDLE_TIMEOUT_MS, `agent for session '${sessionId}' did not converge to idle within ${IDLE_TIMEOUT_MS}ms`);
			}
			await deps.sessions.flush(live);
			detachLiveAgent(deps.agents, sessionId);
			detachLiveSession(deps.sessions, sessionId);
		} catch (error) {
			return {
				status: 409,
				ok: false,
				error: {
					code: "session-busy",
					message: `cannot delete session '${sessionId}': it is running and could not be stopped: ${errorMessage(error)}`
				}
			};
		}
	}
	const resolvedRoot = resolve(root);
	const dir = sessionDir(resolvedRoot, snapshot.cwd, sessionId);
	if (!isInside(resolvedRoot, dir)) return {
		status: 500,
		ok: false,
		error: {
			code: "delete-failed",
			message: `refusing to remove '${dir}': it resolves outside the session storage root`
		}
	};
	try {
		await moveToTrash(resolvedRoot, dir, snapshot.cwd, sessionId);
	} catch (error) {
		const stage = error instanceof TrashMoveError ? error.stage : "stash";
		if (live !== void 0) {
			try {
				await detachFromWorkspaces(deps, sessionId);
			} catch {}
			return {
				status: 500,
				ok: false,
				deletedLiveSession: true,
				error: {
					code: "cleanup-failed",
					message: stage === "rename-payloads" ? `session '${sessionId}' was stopped and unregistered, but its log directory could not be moved to the trash and remains untouched in place: ${errorMessage(error)}; the session will not resume — retry the delete to clean up the leftover files` : `session '${sessionId}' was stopped and unregistered, but its log directory could only be partially stashed (payloads renamed, directory still in place): ${errorMessage(error)}; the session will not resume — its payloads were renamed with a ".trash" suffix and the session is hidden from the list: restore the original file names (strip the suffix) and delete again to finish the move, or remove the directory manually`
				}
			};
		}
		return {
			status: 500,
			ok: false,
			error: {
				code: "delete-failed",
				message: stage === "rename-payloads" ? `failed to move the session log to the trash: ${errorMessage(error)} (the directory is untouched)` : `failed to stash the session log directory: ${errorMessage(error)} (payloads were renamed, so the session is hidden from the list until restored)`
			}
		};
	}
	await detachFromWorkspaces(deps, sessionId);
	return {
		status: 200,
		ok: true,
		deleted: sessionId
	};
}
//#endregion
//#region src/index.ts
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
/** Maximum accepted request body size (1 MiB — the delete body is one id). */
const MAX_BODY_BYTES = 1048576;
/** Sentinel: the request body grew past MAX_BODY_BYTES. */
var PayloadTooLargeError = class extends Error {};
/** Drain the request body as UTF-8; reject with PayloadTooLargeError past
* MAX_BODY_BYTES. Past the limit, release the buffer and discard further
* chunks (leave the socket to drain so the 413 can be delivered). */
function readBody(req) {
	return new Promise((resolve, reject) => {
		let data = "";
		let bytes = 0;
		let tooLarge = false;
		req.setEncoding("utf8");
		req.on("data", (chunk) => {
			bytes += Buffer.byteLength(chunk);
			if (bytes > MAX_BODY_BYTES) {
				tooLarge = true;
				data = "";
				return;
			}
			if (!tooLarge) data += chunk;
		});
		req.on("end", () => {
			if (tooLarge) reject(new PayloadTooLargeError());
			else resolve(data);
		});
		req.on("error", reject);
	});
}
/** Same-origin gate: browser Origin must match the request host. Missing
* Origin → non-browser; {@link isMissingOriginAuthorized} decides (loopback /
* session cookie / known token). Host equality covers localhost and LAN. */
function sameOrigin(req) {
	const origin = req.headers.origin;
	if (origin === void 0 || origin === "") return true;
	try {
		return new URL(origin).host === req.headers.host;
	} catch {
		return false;
	}
}
function isLoopbackAddress(addr) {
	return addr === "127.0.0.1" || addr === "::1" || addr === ":ffff:127.0.0.1" || addr === "::ffff:127.0.0.1" || addr.endsWith("127.0.0.1");
}
function timingSafeStringEqual(actual, expected) {
	const a = Buffer.from(actual, "utf8");
	const b = Buffer.from(expected, "utf8");
	if (a.byteLength !== b.byteLength) {
		timingSafeEqual(a, a);
		return false;
	}
	return timingSafeEqual(a, b);
}
function knownAuthTokens() {
	return [
		process.env.DSH_WEB_TOKEN,
		process.env.DSH_TOKEN,
		process.env.DSH_BROWSER_LAUNCH_TOKEN
	].filter((t) => typeof t === "string" && t.length > 0);
}
function matchesKnownToken(value) {
	return knownAuthTokens().some((token) => timingSafeStringEqual(value, token));
}
function hasStructuredSessionCookie(req) {
	const cookie = String(req.headers.cookie || "");
	if (!cookie) return false;
	for (const segment of cookie.split(";")) {
		const at = segment.indexOf("=");
		if (at === -1) continue;
		const name = segment.slice(0, at).trim();
		const value = segment.slice(at + 1).trim();
		if (!name.startsWith("dsh-auth-")) continue;
		if (/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) return true;
	}
	return false;
}
function hasRequestToken(req) {
	const header = req.headers["x-dsh-web-token"];
	if (typeof header === "string" && matchesKnownToken(header)) return true;
	const auth = req.headers.authorization;
	if (typeof auth === "string") {
		const m = /^Bearer\s+(\S+)$/i.exec(auth.trim());
		if (m?.[1] && matchesKnownToken(m[1])) return true;
	}
	return false;
}
/** Non-browser delete clients (no Origin): loopback, session cookie, or token. */
function isMissingOriginAuthorized(req) {
	if (isLoopbackAddress(req.socket.remoteAddress || "")) return true;
	if (hasStructuredSessionCookie(req)) return true;
	if (hasRequestToken(req)) return true;
	return false;
}
/** Write one JSON response with a fixed content type. */
function respond(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		"Content-Type": "application/json; charset=utf-8",
		"Content-Length": Buffer.byteLength(payload)
	});
	res.end(payload);
}
/** Early failure before `readBody`: discard any unread body so keep-alive
* sockets are not left half-open after the JSON error reply. */
function respondFailure(req, res, status, body) {
	req.resume();
	respond(res, status, body);
}
/** Plugin id (`name` + `apply`); keep in sync with package.json. */
const name = "dsh-web-mobile";
function apply(ctx) {
	ctx.effect(() => installResponseCompression(), "dsh-web-mobile: response compression");
	ctx.inject(["webServer"], (webCtx) => {
		webCtx.effect(() => webCtx.webServer.register({
			kind: "exact",
			path: "/api/mobile-nav.session.delete",
			handler: async (req, res) => {
				if (req.method !== "POST") {
					respondFailure(req, res, 405, { error: {
						code: "method-not-allowed",
						message: "POST required"
					} });
					return;
				}
				if (!sameOrigin(req)) {
					respondFailure(req, res, 403, { error: {
						code: "cross-origin",
						message: "cross-origin request rejected: Origin host does not match the request host"
					} });
					return;
				}
				const origin = req.headers.origin;
				if ((origin === void 0 || origin === "") && !isMissingOriginAuthorized(req)) {
					respondFailure(req, res, 401, { error: {
						code: "unauthorized",
						message: "missing Origin requires loopback, a DSH session cookie, or a known token"
					} });
					return;
				}
				let body;
				try {
					body = JSON.parse(await readBody(req));
				} catch (error) {
					if (error instanceof PayloadTooLargeError) {
						respond(res, 413, { error: {
							code: "payload-too-large",
							message: `request body exceeds the ${MAX_BODY_BYTES}-byte limit`
						} });
						return;
					}
					respond(res, 400, { error: {
						code: "invalid-body",
						message: "expected a JSON body of the form { \"sessionId\": string }"
					} });
					return;
				}
				const { sessionId } = body;
				if (typeof sessionId !== "string" || sessionId === "") {
					respond(res, 400, { error: {
						code: "invalid-session-id",
						message: "sessionId must be a non-empty string"
					} });
					return;
				}
				const persistence = ctx.get("sessionPersistence");
				if (persistence === void 0) {
					respond(res, 503, { error: {
						code: "persistence-unavailable",
						message: "session persistence is not configured"
					} });
					return;
				}
				const result = await deleteSession({
					persistence,
					sessions: ctx.get("sessions"),
					agents: ctx.get("agents"),
					workspaceRegistry: ctx.get("workspaceRegistry")
				}, sessionId);
				if (result.ok) {
					respond(res, 200, {
						ok: true,
						deleted: result.deleted
					});
					return;
				}
				ctx.logger.warn(`dsh-web-mobile: session-delete failed for '${sessionId}' (${result.error.code}): ${result.error.message}`);
				respond(res, result.status, { error: result.error });
			}
		}), "dsh-web-mobile: session-delete route");
	});
}
//#endregion
export { apply, name };
