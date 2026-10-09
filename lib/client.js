window.__ModuleLoader__.load({
	id: "dsh-web-mobile",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		_deepseek_ai_dsh_client_ui_primitives = __toESM(_deepseek_ai_dsh_client_ui_primitives, 1);
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/core/icon-compat.ts
		/** Fallback when no candidate export exists. */
		const missingIcon = () => null;
		/** First matching export from the host primitives module. */
		const pickIcon = (names) => {
			const table = _deepseek_ai_dsh_client_ui_primitives;
			for (const name of names) {
				const found = table[name];
				if (found !== void 0) return found;
			}
			return missingIcon;
		};
		/** Composer file entry (paperclip). */
		const IconPaperclip = pickIcon(["IconPaperclipOutlineRegular", "IconPaperclipOutline16"]);
		/** Drawer footer session-log export. */
		const IconDownload = pickIcon(["IconDownloadOutlineRegular", "IconDownloadOutline16"]);
		/** Session-header directory drawer toggle. */
		const IconPanelLeft = pickIcon(["IconPanelLeftOutlineRegular", "IconPanelLeftOutline16"]);
		/** Session-header Files / right-sidebar entry. */
		const IconFolderOpen = pickIcon(["IconFolderOpenOutlineRegular", "IconFolderOpenOutline16"]);
		//#endregion
		//#region src/client/effects/gesture-guard.ts
		/**
		* Gesture-consumption contract between the sidebar swipe layer and other
		* document-level listeners that would otherwise treat the release as a tap
		* (drawer-close click/pointerup, FAB / backdrop listeners).
		*
		* Two signals at different times:
		* - axis-lock (`markStrokeLocked` at tryLock / pointermove) tells an earlier
		*   capture-phase handler on the same pointerup that this is a swipe release,
		*   not a tap;
		* - consume marks (`markGestureConsumed` at the gesture layer's pointerup
		*   after classification) cover events that follow the release.
		*
		* After a classified swipe, later `consumeIfGestured(event)` callers bail so
		* the stroke cannot double-toggle the drawer or navigate a session row —
		* including the browser's synthetic click (mark walks ancestors up to `upTo`).
		* Non-gesture taps leave both signals clear.
		*/
		/** Marked targets with their expiry timestamp (monotonic performance.now). */
		const consumed = /* @__PURE__ */ new Map();
		/**
		* True while the live stroke is axis-locked horizontal. Unlike consume marks
		* (written at the gesture layer's own pointerup after classification), this
		* flag is set at tryLock during pointermove — before any pointerup — so a
		* host handler registered earlier in the capture phase can yield on the same
		* release event without racing the consume marks.
		*/
		let strokeLocked = false;
		/** Flag the live stroke as axis-locked horizontal (called by tryLock). */
		function markStrokeLocked() {
			strokeLocked = true;
		}
		/** Clear the axis-lock flag (called by reset and on a new pointer epoch). */
		function clearStrokeLocked() {
			strokeLocked = false;
		}
		/** True while a stroke is axis-locked horizontal (host handlers yield). */
		function isStrokeLocked() {
			return strokeLocked;
		}
		/**
		* True when the value looks like a DOM node that can carry an ancestor
		* chain. Feature-detected (no `instanceof Element`) so the guard stays
		* importable and testable in non-DOM environments (node:test).
		*/
		function isElementLike(value) {
			return typeof value === "object" && value !== null && "parentElement" in value && value.parentElement !== void 0;
		}
		/**
		* Register that the stroke ending on `target` is a gesture. The mark covers
		* `target` itself and every ancestor up to and including `upTo` (when given
		* and present in the chain), so a follow-up synthetic click — whose target
		* is usually an ancestor of the release point — is reported as consumed
		* too. Multiple marks accumulate independently and expire after `windowMs`.
		*/
		function markGestureConsumed(target, windowMs, upTo) {
			const until = performance.now() + windowMs;
			if (!isElementLike(target)) {
				consumed.set(target, until);
				return;
			}
			let el = target;
			while (el !== null) {
				consumed.set(el, until);
				if (el === upTo) break;
				el = isElementLike(el.parentElement) ? el.parentElement : null;
			}
		}
		/**
		* True when the event belongs to a stroke already marked as a gesture.
		* Matches the event target itself or any of its ancestors. Stale marks are
		* dropped lazily.
		*/
		function consumeIfGestured(event) {
			const now = performance.now();
			const target = event.target;
			if (!isElementLike(target)) {
				for (const [t, until] of consumed) if (until <= now) consumed.delete(t);
				return false;
			}
			let el = target;
			while (el !== null) {
				const until = consumed.get(el);
				if (until !== void 0) {
					if (until <= now) consumed.delete(el);
					else return true;
				}
				el = isElementLike(el.parentElement) ? el.parentElement : null;
			}
			return false;
		}
		/** Props keys holding an object with an `.id` (row items, session records). */
		const OBJECT_KEYS = [
			"node",
			"session",
			"summary",
			"result"
		];
		/** Props keys holding the id string directly. */
		const ID_KEYS = ["sessionId", "id"];
		/** React stamps a fiber on a node under a per-renderer random suffix. */
		const FIBER_KEY_PREFIXES = ["__reactFiber$", "__reactInternalInstance$"];
		/** `value.id` when `value` is an object carrying a string id, else null. */
		function objectIdOf(value) {
			if (typeof value !== "object" || value === null) return null;
			const id = value.id;
			return typeof id === "string" ? id : null;
		}
		/** The first id this hop's props offer that `isKnownId` accepts. */
		function acceptedIdInProps(props, isKnownId) {
			if (props === null || props === void 0) return null;
			for (const key of OBJECT_KEYS) {
				const candidate = objectIdOf(props[key]);
				if (candidate !== null && isKnownId(candidate)) return candidate;
			}
			for (const key of ID_KEYS) {
				const candidate = props[key];
				if (typeof candidate === "string" && isKnownId(candidate)) return candidate;
			}
			return null;
		}
		/**
		* Walk from `fiber` towards the root (`.return`) and return the session id of
		* the nearest hop offering one the caller knows. A hop whose candidate is
		* rejected does not stop the walk, so an outer row item fiber still wins over
		* an inner fiber carrying an unrelated or stale id. Returns null when nothing
		* within `limit` hops (the starting fiber counts as the first) is accepted.
		*/
		function findSessionIdInFiber(fiber, isKnownId, limit = 60) {
			let hop = fiber;
			for (let walked = 0; walked < limit && hop !== null && hop !== void 0; walked += 1) {
				const found = acceptedIdInProps(hop.memoizedProps, isKnownId);
				if (found !== null) return found;
				hop = hop.return;
			}
			return null;
		}
		/**
		* The React fiber a DOM node (or any renderer-stamped object) carries: React
		* assigns it under `__reactFiber$<rendererKey>` and keeps the legacy
		* `__reactInternalInstance$<rendererKey>` alias. First stamp wins; null when
		* the value is not a stamped object.
		*/
		function reactFiberOf(instance) {
			if (instance === null || instance === void 0) return null;
			if (typeof instance !== "object") return null;
			const record = instance;
			for (const prefix of FIBER_KEY_PREFIXES) for (const key of Object.keys(record)) {
				if (!key.startsWith(prefix)) continue;
				const fiber = record[key];
				if (typeof fiber === "object" && fiber !== null) return fiber;
			}
			return null;
		}
		/**
		* Whether a pointer release still counts as a tap: it stayed within `slopPx` on
		* both axes (max-norm, not Euclidean). The drawer list scrolls vertically, so a
		* large vertical drift must not navigate.
		*/
		function isTapWithinSlop(from, to, slopPx) {
			return Math.abs(to.x - from.x) <= slopPx && Math.abs(to.y - from.y) <= slopPx;
		}
		//#endregion
		//#region src/client/core/reconciler-core.ts
		function createReconcilerCore(options) {
			const onError = options.onError ?? ((taskName, error, phase) => {
				console.error(`[dsh-web-mobile] reconciler task ${taskName}${phase === "dispose" ? " dispose" : ""} failed`, error);
			});
			const registered = /* @__PURE__ */ new Set();
			let active = null;
			let dirty = /* @__PURE__ */ new Set();
			let forceAll = false;
			let pending = null;
			const runEnsure = (task) => {
				try {
					task.ensure();
				} catch (error) {
					onError(task.name, error, "ensure");
				}
			};
			const runDispose = (task) => {
				try {
					task.dispose();
				} catch (error) {
					onError(task.name, error, "dispose");
				}
			};
			const flush = () => {
				if (pending !== null) {
					pending();
					pending = null;
				}
				if (active === null) {
					dirty.clear();
					forceAll = false;
					return;
				}
				if (forceAll) for (const task of active) runEnsure(task);
				else if (dirty.size > 0) for (const task of active) {
					const scopes = task.scopes;
					if (scopes === void 0 || scopes.some((key) => dirty.has(key))) runEnsure(task);
				}
				dirty.clear();
				forceAll = false;
			};
			const schedule = () => {
				if (pending !== null) return;
				pending = options.requestFrame(() => {
					pending = null;
					flush();
				});
			};
			const register = (task) => {
				registered.add(task);
				if (active !== null) {
					active.add(task);
					runEnsure(task);
				}
				return () => {
					registered.delete(task);
					if (active !== null) {
						active.delete(task);
						runDispose(task);
					}
				};
			};
			const activate = () => {
				if (active !== null) return;
				active = new Set(registered);
				forceAll = true;
				flush();
			};
			const deactivate = () => {
				if (pending !== null) {
					pending();
					pending = null;
				}
				dirty.clear();
				forceAll = false;
				if (active !== null) {
					const snapshot = active;
					active = null;
					for (const task of snapshot) runDispose(task);
				}
			};
			return {
				get size() {
					return registered.size;
				},
				register,
				activate,
				deactivate,
				note: (keys) => {
					for (const key of keys) dirty.add(key);
					schedule();
				},
				flush
			};
		}
		//#endregion
		//#region src/client/core/sessions-compat.ts
		/** The current session id: rc.2's `current` field when present, else the a2
		*  main-view-retained session. Undefined when the shape matches neither. */
		function currentSessionIdOf(list) {
			if (typeof list !== "object" || list === null) return void 0;
			const snapshot = list;
			if (typeof snapshot.current === "string") return snapshot.current;
			for (const key in snapshot.byId) {
				const summary = snapshot.byId[key];
				if (summary === void 0) continue;
				const mainView = summary.retainedBy?.mainView;
				if (typeof mainView === "number" && mainView > 0 && typeof summary.id === "string") return summary.id;
			}
		}
		/** Look up one summary by plain string id (works across branded SessionId maps). */
		function sessionById(list, id) {
			if (typeof list !== "object" || list === null) return void 0;
			const byId = list.byId;
			if (byId === void 0) return void 0;
			return byId[id];
		}
		/** a2 removed `clear()` (selection lifecycle moved to the retain model). */
		function sessionsCanClear(sessions) {
			return typeof sessions?.clear === "function";
		}
		/** a2 removed `open()`; callers must degrade (armNav fallback in
		*  phone-chrome) instead of throwing inside the capture pointerup listener. */
		function sessionsCanOpen(sessions) {
			return typeof sessions?.open === "function";
		}
		/** Open a session by plain string id across branded SessionId host typings. */
		function openSession(sessions, id) {
			const open = sessions?.open;
			open?.(id);
		}
		//#endregion
		//#region src/client/effects/stats-line.ts
		/**
		* Marks the host conversation status row (turns / steps / LLM / TTFT / cache)
		* for a single horizontal scrolling line on narrow screens. The row uses a
		* hashed class, so CSS cannot target it; mark by text inside `_composerStack`
		* without a composer input. Also folds TPS and the context ring via overlays
		* (React nodes stay in place — relocating them breaks unmount, #104).
		* Dispose clears markers, placeholders, and viewport listeners.
		*/
		function statsAnchorAlive(el) {
			if (el === null || !el.isConnected) return false;
			if (el.closest("[data-phase]") === null) return false;
			return el.closest("[class*=\"_composerStack\"]") !== null;
		}
		function createStatsLineTask() {
			const ensurePositioned = (el, marker) => {
				if (getComputedStyle(el).position === "static") el.setAttribute("data-mobile-nav", marker);
			};
			const positionedAncestor = (el) => {
				for (let node = el.parentElement; node !== null; node = node.parentElement) if (getComputedStyle(node).position !== "static") return node;
				return null;
			};
			const placeOverlay = (host, reserve) => {
				const container = positionedAncestor(host);
				if (container === null) return;
				const box = reserve.getBoundingClientRect();
				const base = container.getBoundingClientRect();
				const left = box.left - base.left - container.clientLeft;
				const hostRect = host.getBoundingClientRect();
				const top = box.top - base.top - container.clientTop - (hostRect.height - box.height) / 2;
				const styled = host;
				if (styled.style.left !== `${left}px`) styled.style.left = `${left}px`;
				if (styled.style.top !== `${top}px`) styled.style.top = `${top}px`;
			};
			const moveTps = (stats) => {
				const stack = stats.closest("[class*=\"_composerStack\"]");
				if (stack === null) return;
				let reserve = stats.querySelector(":scope > [data-mobile-nav=\"stats-tps-reserve\"]");
				for (const el of stack.querySelectorAll("div")) {
					const text = (el.textContent ?? "").trim();
					if (!/^TPS\s+\d/.test(text)) continue;
					if (el.children.length > 0) continue;
					if (el.getAttribute("data-mobile-nav") === "stats-tps") continue;
					if (reserve === null) {
						reserve = document.createElement("span");
						reserve.setAttribute("data-mobile-nav", "stats-tps-reserve");
						reserve.setAttribute("aria-hidden", "true");
						stats.appendChild(reserve);
					}
					const live = el.textContent ?? "";
					if (reserve.textContent !== live) reserve.textContent = live;
					el.setAttribute("data-mobile-nav", "stats-tps");
					const tpsRow = el.parentElement;
					if (tpsRow === null) continue;
					ensurePositioned(tpsRow, "stats-tps-row");
					placeOverlay(el, reserve);
					const width = reserve.getBoundingClientRect().width;
					const styled = el;
					if (styled.style.maxWidth !== `${width}px`) styled.style.maxWidth = `${width}px`;
					return;
				}
			};
			const moveRing = (stats) => {
				const holder = stats.parentElement;
				const dock = holder === null ? null : holder.parentElement;
				if (dock === null) return;
				const ring = [...dock.children].find((child) => !child.contains(stats) && /\d\s*%/.test(child.textContent ?? ""));
				if (ring === void 0) return;
				const row = document.querySelector("[data-composer-card] [class*=\"_row\"] [class*=\"_trailing\"]");
				if (row === null) return;
				let reserve = row.querySelector(":scope > [data-mobile-nav=\"stats-ring-reserve\"]");
				const primary = row.querySelector(":scope > [class*=\"_primary\"]");
				if (reserve === null) {
					reserve = document.createElement("span");
					reserve.setAttribute("data-mobile-nav", "stats-ring-reserve");
					row.insertBefore(reserve, primary);
				} else if (primary === null ? row.lastElementChild !== reserve : reserve.nextElementSibling !== primary) row.insertBefore(reserve, primary);
				if (ring.getAttribute("data-mobile-nav") !== "stats-ring") ring.setAttribute("data-mobile-nav", "stats-ring");
				ensurePositioned(dock, "stats-ring-dock");
				placeOverlay(ring, reserve);
			};
			let viewportHandler = null;
			const relayout = () => {
				const anchor = document.querySelector("[data-mobile-nav=\"stats\"]");
				if (anchor === null) return;
				moveTps(anchor);
				moveRing(anchor);
			};
			const mark = () => {
				if (viewportHandler === null) {
					viewportHandler = relayout;
					window.addEventListener("resize", relayout);
					window.visualViewport?.addEventListener("resize", relayout);
				}
				const anchor = document.querySelector("[data-mobile-nav=\"stats\"]");
				if (anchor !== null && statsAnchorAlive(anchor)) {
					moveTps(anchor);
					moveRing(anchor);
					return;
				}
				anchor?.removeAttribute("data-mobile-nav");
				const stack = document.querySelector("[class*=\"_composerStack\"]");
				if (stack === null) return;
				for (const root of stack.querySelectorAll("[class*=\"_root\"]")) {
					if (root.matches("[data-testid=\"todo-panel\"]")) continue;
					const buttons = root.querySelectorAll("button");
					if (buttons.length > 0 && ![...buttons].every((button) => button.getAttribute("aria-haspopup") !== null)) continue;
					const text = root.textContent ?? "";
					if (!/(turns|steps|\bLLM\b|轮|步)/.test(text)) continue;
					if (root.querySelector("textarea, [data-composer-input]") !== null) continue;
					root.setAttribute("data-mobile-nav", "stats");
					moveTps(root);
					moveRing(root);
					return;
				}
			};
			return {
				name: "stats-line",
				scopes: ["*"],
				ensure: mark,
				dispose: () => {
					if (viewportHandler !== null) {
						window.removeEventListener("resize", viewportHandler);
						window.visualViewport?.removeEventListener("resize", viewportHandler);
						viewportHandler = null;
					}
					for (const el of document.querySelectorAll("[data-mobile-nav=\"stats-ring\"], [data-mobile-nav=\"stats-tps\"]")) {
						const styled = el;
						styled.style.left = "";
						styled.style.top = "";
						styled.style.maxWidth = "";
					}
					for (const key of [
						"stats",
						"stats-ring",
						"stats-ring-dock",
						"stats-tps",
						"stats-tps-row"
					]) for (const el of document.querySelectorAll(`[data-mobile-nav="${key}"]`)) el.removeAttribute("data-mobile-nav");
					for (const el of document.querySelectorAll("[data-mobile-nav=\"stats-ring-reserve\"], [data-mobile-nav=\"stats-tps-reserve\"]")) el.remove();
				}
			};
		}
		//#endregion
		//#region src/client/effects/overlay-backdrop-fab.ts
		/** Fade the current backdrop out (pointer-events off + opacity 0). Called by
		* the gesture layer when a close commit starts animating, so the dimming
		* fades with the drawer's slide-out instead of vanishing after it. The
		* element itself is removed later by the task's normal remove path (the
		* marker flip schedules it). */
		function fadeOverlayOut() {
			fadeHook?.();
		}
		let fadeHook = null;
		/** The FAB's second face: an arrow, shown while a sidebar panel owns the main
		* area (see the panelViewOpen note in the task body). */
		const FAB_BACK_ICON = "<svg viewBox=\"0 0 16 16\" fill=\"none\" aria-hidden=\"true\" width=\"18\" height=\"18\"><path d=\"M9.8 3.4 5.2 8l4.6 4.6\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>";
		const FAB_DRAWER_ICON = "<svg viewBox=\"0 0 16 16\" fill=\"none\" aria-hidden=\"true\" width=\"18\" height=\"18\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M9.67272 0.522841C10.8339 0.522841 11.76 0.522714 12.4963 0.602493C13.2453 0.683657 13.8789 0.854248 14.4264 1.25197C14.7504 1.48739 15.0355 1.77247 15.2709 2.0965C15.6686 2.64394 15.8392 3.27758 15.9204 4.02655C16.0002 4.7629 16 5.68895 16 6.85014V9.14986C16 10.3111 16.0002 11.2371 15.9204 11.9735C15.8392 12.7224 15.6686 13.3561 15.2709 13.9035C15.0355 14.2275 14.7504 14.5126 14.4264 14.748C13.8789 15.1458 13.2453 15.3163 12.4963 15.3975C11.76 15.4773 10.8339 15.4772 9.67272 15.4772H6.3273C5.16611 15.4772 4.24006 15.4773 3.50371 15.3975C2.75474 15.3163 2.1211 15.1458 1.57366 14.748C1.24963 14.5126 0.964549 14.2275 0.729131 13.9035C0.331407 13.3561 0.160817 12.7224 0.0796529 11.9735C-0.000126137 11.2371 1.25338e-09 10.3111 1.25338e-09 9.14986V6.85014C1.25329e-09 5.68895 -0.000126137 4.7629 0.0796529 4.02655C0.160817 3.27758 0.331407 2.64394 0.729131 2.0965C0.964549 1.77247 1.24963 1.48739 1.57366 1.25197C2.1211 0.854248 2.75474 0.683657 3.50371 0.602493C4.24006 0.522714 5.16611 0.522841 6.3273 0.522841H9.67272ZM5.54303 1.88715V14.1118C5.78636 14.1128 6.04709 14.1169 6.3273 14.1169H9.67272C10.8639 14.1169 11.7032 14.1164 12.3493 14.0465C12.9824 13.9779 13.3497 13.8494 13.6268 13.6482C13.8354 13.4966 14.0195 13.3125 14.1711 13.1039C14.3723 12.8268 14.5007 12.4595 14.5693 11.8264C14.6393 11.1803 14.6398 10.341 14.6398 9.14986V6.85014C14.6398 5.65896 14.6393 4.81967 14.5693 4.1736C14.5007 3.54048 14.3723 3.17318 14.1711 2.89609C14.0195 2.68747 13.8354 2.50337 13.6268 2.35179C13.3497 2.1506 12.9824 2.02212 12.3493 1.95353C11.7032 1.88358 10.8639 1.88307 9.67272 1.88307H6.3273C6.04709 1.88307 5.78636 1.8862 5.54303 1.88715ZM4.1828 1.91166C3.99125 1.9216 3.8148 1.93577 3.65076 1.95353C3.01764 2.02212 2.65034 2.1506 2.37325 2.35179C2.16463 2.50337 1.98052 2.68747 1.82895 2.89609C1.62776 3.17318 1.49928 3.54048 1.43069 4.1736C1.36074 4.81967 1.36023 5.65896 1.36023 6.85014V9.14986C1.36023 10.341 1.36074 11.1803 1.43069 11.8264C1.49928 12.4595 1.62776 12.8268 1.82895 13.1039C1.98052 13.3125 2.16463 13.4966 2.37325 13.6482C2.65034 13.8494 3.01764 13.9779 3.65076 14.0465C4.29683 14.1164 5.13612 14.1169 6.3273 14.1169H9.67272C10.8639 14.1169 11.7032 14.1164 12.3493 14.0465C12.9824 13.9779 13.3497 13.8494 13.6268 13.6482C13.8354 13.4966 14.0195 13.3125 14.1711 13.1039C14.3723 12.8268 14.5007 12.4595 14.5693 11.8264C14.6393 11.1803 14.6398 10.341 14.6398 9.14986V6.85014C14.6398 5.65896 14.6393 4.81967 14.5693 4.1736C14.5007 3.54048 14.3723 3.17318 14.1711 2.89609C14.0195 2.68747 13.8354 2.50337 13.6268 2.35179C13.3497 2.1506 12.9824 2.02212 12.3493 1.95353C11.7032 1.88358 10.8639 1.88307 9.67272 1.88307H6.3273C5.13612 1.88307 4.29683 1.88358 3.65076 1.95353C3.47672 1.97129 3.30027 1.98546 3.10872 1.9954L4.1828 1.91166Z\" fill=\"currentColor\"/></svg>";
		/**
		* @param t - `mobileNav` dictionary.
		* @param toggleSidebar - opens/closes the drawer.
		* @param panelExit - sidebar-panel exit face (panel-exit.ts). While a panel owns
		*   the main area the FAB is the only on-screen control (header toggle is gone),
		*   so it doubles as back-to-conversation. Null when the host cannot select
		*   panels (rc.6); then it stays a plain drawer button.
		*/
		function createOverlayTask(t, toggleSidebar, panelExit) {
			let backdrop = null;
			let fab = null;
			let backdropRemoveTimer = null;
			/** True while the backdrop carries our inline faded state. Guards the
			* restore branch: while a late close commit is animating, the marker is
			* still open, so a plain open-branch restore would undo the pre-fade. */
			let faded = false;
			const drawerOpen = () => {
				const frame = getFrame();
				if (frame === null) return false;
				return !frame.hasAttribute("data-sidebar-collapsed");
			};
			const heroPhase = () => document.querySelector("[data-phase=\"active\"]") === null;
			/**
			* Two FAB faces: back-to-conversation while a sidebar panel owns the main
			* area; otherwise open the drawer. On the panel view the FAB is the only
			* control (header/drawer toggle are gone; panel chrome has no back path).
			*/
			const onFabClick = (event) => {
				if (panelExit !== null && panelExit.panelOpen()) {
					event.preventDefault();
					event.stopPropagation();
					panelExit.exit();
					return;
				}
				toggleSidebar();
			};
			/** Icon and accessible name follow the view so the button never reads as a
			* mystery control. Idempotent: ensure() runs on every mutation burst. */
			const syncFab = () => {
				if (fab === null) return;
				const exiting = panelExit !== null && panelExit.panelOpen();
				const mode = exiting ? "exit-panel" : "open-drawer";
				if (fab.dataset.mobileNavFabMode === mode) return;
				fab.dataset.mobileNavFabMode = mode;
				const label = t(exiting ? "backToConversation" : "open");
				fab.setAttribute("aria-label", label);
				fab.title = label;
				fab.innerHTML = exiting ? FAB_BACK_ICON : FAB_DRAWER_ICON;
			};
			return {
				name: "overlay-backdrop-fab",
				scopes: [
					"*",
					"data-sidebar-collapsed",
					"data-phase"
				],
				ensure: () => {
					fadeHook = () => {
						if (backdrop === null) return;
						faded = true;
						backdrop.style.pointerEvents = "none";
						backdrop.style.opacity = "0";
					};
					const frame = getFrame();
					if (frame === null) return;
					if (drawerOpen()) {
						if (backdrop === null) {
							backdrop = document.createElement("div");
							backdrop.dataset.mobileNav = "backdrop";
							backdrop.setAttribute("role", "button");
							backdrop.setAttribute("aria-label", t("backdrop"));
							frame.appendChild(backdrop);
							faded = false;
						} else if (faded && backdropRemoveTimer !== null) {
							window.clearTimeout(backdropRemoveTimer);
							backdropRemoveTimer = null;
							faded = false;
							backdrop.style.removeProperty("pointer-events");
							backdrop.style.removeProperty("opacity");
						}
					} else if (backdrop !== null) {
						backdrop.style.pointerEvents = "none";
						backdrop.style.opacity = "0";
						faded = true;
						if (backdropRemoveTimer === null) backdropRemoveTimer = window.setTimeout(() => {
							backdropRemoveTimer = null;
							backdrop?.remove();
							backdrop = null;
						}, 260);
					}
					if (heroPhase() && !drawerOpen() && fab === null) {
						fab = document.createElement("button");
						fab.type = "button";
						fab.dataset.mobileNav = "fab";
						fab.setAttribute("aria-label", t("open"));
						fab.title = t("open");
						fab.addEventListener("click", onFabClick);
						frame.appendChild(fab);
					} else if ((!heroPhase() || drawerOpen()) && fab !== null) {
						fab.remove();
						fab = null;
					}
					syncFab();
				},
				dispose: () => {
					if (backdropRemoveTimer !== null) {
						window.clearTimeout(backdropRemoveTimer);
						backdropRemoveTimer = null;
					}
					fadeHook = null;
					backdrop?.remove();
					backdrop = null;
					fab?.remove();
					fab = null;
				}
			};
		}
		//#endregion
		//#region src/client/effects/sidebar-swipe.ts
		/**
		* Sidebar drawer and files-panel swipe gestures (hybrid follow).
		*
		* Edge swipe-in early-commits host open at axis-lock while the drawer stays
		* pinned off-screen, then follows the finger. Open-drawer leftward drag
		* follows into the slot; rightward close is classify-only (legacy). Release
		* uses classifySwipe (distance OR velocity); commit is
		* `ctx.layout.toggleSidebar()`. Follow rides the host transition: inline
		* `transition:none` + translateX during the stroke, then drop styles and
		* retarget in the same task (no paint between).
		*
		* Backdrop stays binary; mid-stroke modals revert per move; open final state
		* ends at transform:none (containing-block for fixed descendants). Coexists
		* with host overlay handlers via gesture-guard: axis-lock before pointerup,
		* plus consume marks for synthetic clicks. Disposer aborts the live stroke.
		*/
		/**
		* Start-zone width as a fraction of viewport: left (RTL: right) strip counts
		* as "from the edge". Wide enough to clear Chrome Android's ~48dp history-nav
		* edge strip (browser claims those strokes and pointercancels). Widget
		* conflicts yield via data-mobile-nav-dragging / findFloatingWidget instead of
		* shrinking the zone. Release classification still gates commit; vertical
		* strokes reset at axis lock; horizontal scrollers are excluded
		* (findHorizontalScroller — load-bearing at this width).
		*/
		const START_ZONE_RATIO = .45;
		/**
		* Zone width in px for a given viewport (pure, for decision-table tests).
		* Rounded so boundary assertions stay integral.
		*/
		function startZonePxFor(viewportWidthPx, ratio = START_ZONE_RATIO) {
			return Math.round(viewportWidthPx * ratio);
		}
		/**
		* Axis-lock threshold: once the dominant axis moves this far, the axis is
		* decided. Horizontal (|dx| > |dy|) locks to X; vertical abandons to native
		* scroll. 8px tolerates tap jitter while still deciding within ~16ms.
		*/
		const LOCK_PX = 8;
		/** Distance thresholds as a fraction of viewport. Open stays above close so
		*  an accidental reverse swipe cannot re-open. */
		const OPEN_DISTANCE_RATIO = .16;
		const CLOSE_DISTANCE_RATIO = .13;
		/** Velocity window: most-recent-60ms instantaneous speed (end-segment slope). */
		const VELOCITY_WINDOW_MS = 60;
		/** px/ms speed thresholds for open / close. */
		const OPEN_VELOCITY = .45;
		const CLOSE_VELOCITY = .45;
		/** Covers the .28s CSS transition; prevents reverse-gesture double-toggles. */
		const COOLDOWN_MS = 350;
		/**
		* How long a consume mark stays live (covers the synthetic click). Short by
		* design: browsers fire that click within tens of ms; iOS shells suppress it
		* — a long window would swallow the next genuine tap. When `upTo` is absent
		* the walk can reach the document root, so this also bounds tap suppression.
		*/
		const CONSUME_WINDOW_MS = 300;
		/**
		* Open follow arms at axis lock: tryLock already required LOCK_PX of
		* horizontal-dominant travel, so no extra margin — delaying arm left a dead
		* zone before the drawer edge appeared. Release still decides the outcome.
		*/
		const OPEN_FOLLOW_ARM_PX = 8;
		/**
		* Host closed-slot offset as a percentage of the drawer's own width
		* (`translateX(-110%)` — 10% overshoot hides the shadow). Percentage is
		* load-bearing for open follow: width changes when React swaps the rail for
		* the drawer; % re-resolves, a cached px value would not.
		*/
		const CLOSED_SLOT_PCT = 110;
		/** Self-run terminal close animation; matches the host's .28s transition. */
		const COMMIT_ANIM_MS = 280;
		/**
		* Open-follow baseline percentage. Host closed slot is -110%, but following
		* from -110% hides the first ~28px of travel (10% of a ~280px drawer). 101%
		* keeps a small subpixel margin so the edge answers the finger right after
		* axis lock. Terminal states still use CLOSED_SLOT_PCT verbatim.
		*/
		const OPEN_FOLLOW_BASE_PCT = 101;
		/**
		* Files-panel (host right sidebar) gesture — right-edge mirror of the drawer.
		* Zone ratio matches the drawer: a narrow strip hits Chrome Android's ~48dp
		* history-nav edge and pointercancels.
		*/
		const FILES_ZONE_RATIO = .45;
		/**
		* Distance threshold (fraction of viewport) for both files directions.
		* Drawer keeps a separate close ratio because close follows into its slot;
		* files strokes have no follow, so one ratio serves both.
		*/
		const FILES_DISTANCE_RATIO = .16;
		/** px/ms velocity threshold for both files directions (drawer parity). */
		const FILES_VELOCITY = .45;
		/** Pointer id we are tracking (multi-touch is ignored). */
		let trackingPointer = 0;
		/** True once the stroke is axis-locked. */
		let tracking = false;
		/** Stroke samples (x + timestamp) for recent-window velocity. */
		let samples = [];
		/** Stroke origin (for the direction-bias check). */
		let startX = 0;
		let startY = 0;
		/** Drawer visibility at lock time. */
		let lockDrawerOpen = false;
		/** Expiry of the post-release cooldown (performance.now()). */
		let cooldownUntil = 0;
		/** Element whose stroke was marked consumed (null = no live mark). */
		let consumedEl = null;
		/**
		* Follow cache — set once at lock so per-move writes never read layout.
		* followDrawer stays bound for the whole stroke (direction wobble reuses it).
		*/
		let followDrawer = null;
		let strokeClosedTx = 0;
		let strokeRtl = false;
		/**
		* True while an open stroke early-committed the host (drawer mounted, pinned
		* in slot, following). Release must keep open or toggle back.
		*/
		let openFollowArmed = false;
		/**
		* True once open follow was refused this stroke (modal/takeover/missing
		* drawer) so it never retries mid-stroke.
		*/
		let openFollowRefused = false;
		/**
		* Gesture family for the current stroke: 'drawer' or 'files' (no follow;
		* host-panel commit). Written by beginStroke only.
		*/
		let strokeMode = "drawer";
		/** Files-panel visibility at lock time (mirror of lockDrawerOpen). */
		let lockFilesOpen = false;
		/**
		* Files-panel toggle injected at install (open and close share one function).
		* Module-level because endStroke is; default no-op for node:test import.
		*/
		let filesToggleFn = () => false;
		/**
		* Pure decision: what does this stroke do, given the drawer state?
		* `dx`/`dy` are raw pointer deltas (RTL mirrors X via `rtl`), `velX` is
		* recent-window X velocity. Requires horizontal lock; then distance OR
		* velocity wins with the drawer-state-specific threshold.
		*/
		function classifySwipe(t, m, rtl) {
			const dx = rtl ? -m.dx : m.dx;
			if (Math.abs(dx) <= t.lockPx) return "none";
			if (Math.abs(dx) <= Math.abs(m.dy)) return "none";
			if (t.drawerOpen) {
				if (Math.abs(dx) / t.viewportWidthPx >= t.closeDistanceRatio) return "close";
				const velX = rtl ? -m.velX : m.velX;
				if (velX > 0 !== dx > 0) return "none";
				return Math.abs(velX) >= t.closeVelocity ? "close" : "none";
			}
			if (dx <= 0) return "none";
			if (dx / t.viewportWidthPx >= t.openDistanceRatio) return "open";
			return (rtl ? -m.velX : m.velX) >= t.openVelocity ? "open" : "none";
		}
		/**
		* Pure decision for the files gesture (right-edge zone), mirror of
		* classifySwipe. RTL mirrors X the same way. Verdicts add `files`:
		* - leftward opens the panel only when panel and drawer are both closed
		*   (otherwise 'none' — panel would mount under an open drawer and be
		*   invisible; leftward never collapses anything);
		* - rightward closes the visible top: drawer open → 'close' (animated
		*   commitFollowClose, drawer thresholds); else panel open → 'files'.
		*/
		function classifyFilesSwipe(t, m, rtl) {
			const dx = rtl ? -m.dx : m.dx;
			if (Math.abs(dx) <= t.lockPx) return "none";
			if (Math.abs(dx) <= Math.abs(m.dy)) return "none";
			const velX = rtl ? -m.velX : m.velX;
			if (dx < 0) {
				if (t.panelOpen || t.drawerOpen) return "none";
				if (-dx / t.viewportWidthPx >= t.distanceRatio) return "files";
				if (velX > 0 !== dx > 0) return "none";
				return -velX >= t.velocity ? "files" : "none";
			}
			if (t.drawerOpen) {
				const closeRatio = t.drawerCloseDistanceRatio ?? t.distanceRatio;
				if (dx / t.viewportWidthPx >= closeRatio) return "close";
				if (velX <= 0) return "none";
				return velX >= t.velocity ? "close" : "none";
			}
			if (t.panelOpen) {
				if (dx / t.viewportWidthPx >= t.distanceRatio) return "files";
				if (velX > 0 !== dx > 0) return "none";
				return velX >= t.velocity ? "files" : "none";
			}
			return "none";
		}
		/**
		* Recent-window instantaneous velocity (px/ms): slope between the last two
		* in-window samples so a slow drag then a flick reports the flick. Older
		* samples ignored; fewer than two → 0.
		*/
		function slidingVelocity(samples, windowMs, now) {
			const cutoff = now - windowMs;
			const inWindow = samples.filter((s) => s.t >= cutoff);
			if (inWindow.length < 2) return 0;
			const a = inWindow[inWindow.length - 2];
			const b = inWindow[inWindow.length - 1];
			const dt = b.t - a.t;
			if (dt <= 0) return 0;
			return (b.x - a.x) / dt;
		}
		/**
		* Geometric start-hit: pointer down in the left-edge start zone. Pure and
		* viewport-relative (unit-testable); runtime also checks drawer geometry.
		*/
		function hitTestStart(clientX, viewportWidthPx, rtl, t) {
			const edge = rtl ? viewportWidthPx - clientX : clientX;
			return edge >= 0 && edge <= t.startZonePx;
		}
		/**
		* Geometric start-hit for the files gesture: right-edge zone (RTL: left) —
		* mirror of hitTestStart. Pure and viewport-relative.
		*/
		function filesZoneHit(clientX, viewportWidthPx, rtl, zonePx) {
			const edge = rtl ? clientX : viewportWidthPx - clientX;
			return edge >= 0 && edge <= zonePx;
		}
		/**
		* Gesture family for a stroke that begins while the drawer is open. Inside
		* the drawer body the drawer family always wins (own surface must answer
		* leftward drag even where the files zone overlaps). Outside, the right zone
		* keeps files routing and its leftward 'none' verdict.
		*/
		function openStateStartMode(insideDrawer, inFilesZone) {
			return insideDrawer || !inFilesZone ? "drawer" : "files";
		}
		/**
		* Pure follow mapping: translateX (px) for a stroke sample, or null when
		* this sample has no follow. `closedTx` is the signed closed-slot translateX
		* (negative LTR, positive RTL); `dx` is the raw pointer delta; normalization
		* mirrors classifySwipe (rightward-logical = toward open).
		*
		* Close (drawer open): leftward-logical follows toward the slot (clamped);
		* rightward → null (legacy classify-only close). Open (drawer closed): not
		* used at runtime — `followOpenTransform` keeps a percentage baseline across
		* the subtree swap; this px mapping is the tested reference. Degenerate zero
		* slot yields 0 (no-op) rather than inventing travel.
		*/
		function followTranslate(closedTx, dx, rtl, drawerOpen) {
			const dir = closedTx <= 0 ? -1 : 1;
			const slot = Math.abs(closedTx);
			const d = rtl ? -dx : dx;
			if (drawerOpen) {
				if (d >= 0) return null;
				return dir * Math.min(slot, -d) + 0;
			}
			if (d <= 0) return null;
			return dir * (slot - Math.min(slot, d)) + 0;
		}
		/**
		* Pure follow mapping for the open direction after early host commit, or
		* null when pulled back past the stroke origin (leftward-logical).
		*
		* Baseline is the host's percentage slot (`translateX(-110%)`): at arm time
		* the element is still the collapsed rail; a frame later React swaps in the
		* wider drawer. A px baseline captured before the swap would be wrong;
		* percentage re-resolves against current width. `min()`/`max()` clamp so
		* overshoot cannot pass the resting position.
		*/
		function followOpenTransform(travelPx, rtl) {
			const t = rtl ? -travelPx : travelPx;
			if (t <= 0) return null;
			return rtl ? `translateX(max(0px, calc(${OPEN_FOLLOW_BASE_PCT}% - ${t}px)))` : `translateX(min(0px, calc(-${OPEN_FOLLOW_BASE_PCT}% + ${t}px)))`;
		}
		/**
		* Pure walk: innermost chain node that is genuinely horizontally scrollable
		* (overflow-x auto/scroll and scrollWidth > clientWidth + 1 for subpixel).
		* A stroke starting inside one belongs to that scroller — do not compete or
		* preventDefault (would break native pan near the left edge at 45% zone).
		* overflow-x hidden/clip never match; those strokes stay free for gestures.
		*/
		function findHorizontalScroller(node) {
			let cur = node;
			while (cur !== null) {
				if ((cur.overflowX === "auto" || cur.overflowX === "scroll") && cur.scrollWidth > cur.clientWidth + 1) return cur;
				cur = cur.parent;
			}
			return null;
		}
		/** The open drawer element: first child of the plugin frame. */
		function findDrawer() {
			const frame = getFrame();
			return frame !== null && frame.firstElementChild instanceof HTMLElement ? frame.firstElementChild : null;
		}
		/** True when the drawer is currently open (per the collapsed marker). */
		function drawerOpen() {
			const frame = getFrame();
			return frame !== null && !frame.hasAttribute("data-sidebar-collapsed");
		}
		/**
		* True when the host's right sidebar files panel is visible (fullscreen or
		* docked). The panel element is persistent when closed (`visibility: hidden`,
		* rect pushed off-screen), so presence alone is not the state read — check
		* visibility / display / rect. Hosts without the panel return false.
		*/
		function filesPanelOpen() {
			const panel = document.querySelector("[data-sidebar-right-panel]");
			if (panel === null) return false;
			const cs = getComputedStyle(panel);
			if (cs.visibility === "hidden" || cs.display === "none") return false;
			return panel.getBoundingClientRect().left < window.innerWidth;
		}
		/**
		* Map the real DOM ancestor chain (target first, root last) onto the plain
		* SwipeChainNode shape findHorizontalScroller walks. Bounded by the document
		* depth (~15 nodes in this app) and run once per pointerdown, so the
		* getComputedStyle calls are not a per-frame cost.
		*/
		function chainFrom(target) {
			let node = null;
			let el = target;
			while (el !== null) {
				node = {
					parent: node,
					scrollWidth: el.scrollWidth,
					clientWidth: el.clientWidth,
					overflowX: getComputedStyle(el).overflowX
				};
				el = el.parentElement;
			}
			return node;
		}
		/** Whether a modal dialog owns the screen (gestures must yield to it). */
		function modalOpen() {
			return document.querySelector("[aria-modal=\"true\"]") !== null;
		}
		/**
		* True when a full-screen takeover (taskboard / ssh) or a host
		* conversation.view overlay (`data-conversation-composer-overlay`) owns the
		* frame. Edge-swipe yields so content scrolling wins the start zone; FAB
		* still opens the drawer.
		*/
		function takeoverActive() {
			return document.documentElement.hasAttribute("data-dsh-taskboard-active") || document.documentElement.hasAttribute("data-dsh-ssh-active") || document.querySelector("[data-conversation-composer-overlay]") !== null;
		}
		/**
		* Whether a live, non-collapsed text selection owns the pointer stroke.
		* Selection-handle drags are horizontally dominant and indistinguishable from
		* a swipe — the browser must keep them (iPad WebKit). Feature-detected for
		* node:test without a DOM.
		*
		* Two disjoint models: document selection (message text / contenteditable),
		* and text-control selectionStart/End (invisible to getSelection). Reading
		* only the document model let the swipe layer collapse a composer selection
		* being extended. document.activeElement anchors the element model.
		*/
		function selectionOwnsStroke() {
			if (typeof window === "undefined") return false;
			const sel = window.getSelection();
			if (sel !== null && !sel.isCollapsed) return true;
			if (typeof document === "undefined") return false;
			const el = document.activeElement;
			if (el === null) return false;
			const tag = el.tagName;
			if (tag !== "TEXTAREA" && tag !== "INPUT") return false;
			try {
				const { selectionStart: start, selectionEnd: end } = el;
				return typeof start === "number" && typeof end === "number" && start !== end;
			} catch {
				return false;
			}
		}
		/** Whether the swipe layer is on cooldown (animation in flight). */
		function onCooldown() {
			return performance.now() < cooldownUntil;
		}
		/**
		* Yield when a live drag marks `data-mobile-nav-dragging` on the held
		* element (or ancestor), or on documentElement/body as a global mark.
		* Checked at pointerdown and every axis-lock attempt: otherwise both layers
		* answer the same pointer and the drawer opens mid-drag. Once axis-locked,
		* a late mark does not unwind an armed open follow.
		*/
		function dragMarkYields(event) {
			if (document.documentElement.hasAttribute("data-mobile-nav-dragging")) return true;
			if (document.body.hasAttribute("data-mobile-nav-dragging")) return true;
			return event.target instanceof Element && event.target.closest("[data-mobile-nav-dragging]") !== null;
		}
		/**
		* Upper bound (px) for the small floating-widget positional heuristic.
		* Leaves headroom for plugin widgets; full-screen overlays cannot pass.
		*/
		const FLOATING_WIDGET_MAX_PX = 200;
		/**
		* Yield when the press lands in a small fixed/absolute layer (plugin
		* floating widgets with no standard draggable mark). First small positioned
		* ancestor wins. Excludes our frame subtree (FAB / backdrop / drawer have
		* their own semantics). Approximation: a static badge of this size also
		* yields; oversized widgets need data-mobile-nav-dragging or a higher cap.
		*/
		function findFloatingWidget(target) {
			if (target.closest("[data-mobile-nav=\"frame\"]") !== null) return null;
			let el = target;
			while (el !== null) {
				if (el instanceof HTMLElement) {
					const cs = getComputedStyle(el);
					if ((cs.position === "fixed" || cs.position === "absolute") && el.offsetWidth <= FLOATING_WIDGET_MAX_PX && el.offsetHeight <= FLOATING_WIDGET_MAX_PX) return el;
				}
				el = el.parentElement;
			}
			return null;
		}
		function floatingWidgetYields(event) {
			return event.target instanceof Element && findFloatingWidget(event.target) !== null;
		}
		/**
		* Cache follow geometry once per locked stroke; per-move path is write-only.
		*
		* Close strokes follow from a px baseline read here. Open cannot: the host
		* renders two different subtrees in the same column (collapsed rail vs open
		* drawer). Dragging the closed column would only reveal the rail, so open
		* commits first then follows (armOpenFollow) with a percentage baseline.
		*/
		function startFollow() {
			followDrawer = null;
			openFollowArmed = false;
			openFollowRefused = false;
			strokeRtl = frameRtl();
			const drawer = findDrawer();
			if (drawer === null) return;
			if (!lockDrawerOpen) return;
			followDrawer = drawer;
			const slot = drawer.getBoundingClientRect().width * CLOSED_SLOT_PCT / 100;
			strokeClosedTx = strokeRtl ? slot : -slot;
		}
		/**
		* Arm the open follow: pin the drawer in its closed slot with an important
		* inline pair, then flip the host in the same task. React mounts the real
		* drawer while the inline transform holds it off-screen. Pin before flip —
		* otherwise `transform: none` paints at rest for one frame. Backdrop/FAB
		* swap at the flip (binary; no opacity follow).
		*/
		/** True while arm-time content-visibility defers drawer subtree layout+paint. */
		let cvDeferred = false;
		/** Re-materialize drawer contents after the mount-frame split. */
		function revealDrawerContent() {
			if (!cvDeferred) return;
			cvDeferred = false;
			followDrawer?.style.removeProperty("content-visibility");
			const el = findDrawer();
			if (el !== null && el !== followDrawer) el.style.removeProperty("content-visibility");
		}
		function armOpenFollow(ctx) {
			if (openFollowArmed || openFollowRefused) return;
			const drawer = findDrawer();
			if (drawer === null || modalOpen() || takeoverActive()) {
				openFollowRefused = true;
				return;
			}
			followDrawer = drawer;
			drawer.style.setProperty("transition", "none", "important");
			const pinned = followOpenTransform(1e-4, strokeRtl);
			drawer.style.setProperty("transform", pinned ?? `translateX(-${CLOSED_SLOT_PCT}%)`, "important");
			drawer.style.setProperty("content-visibility", "hidden", "important");
			cvDeferred = true;
			openFollowArmed = true;
			ctx.layout.toggleSidebar();
			requestAnimationFrame(() => {
				requestAnimationFrame(revealDrawerContent);
			});
		}
		/**
		* Paint this move sample's follow position. Null mapping (legacy direction
		* or pulled back past origin) pins rather than releasing — releasing would
		* let the host transition fight the finger. Re-engaging rewrites both
		* inline properties (also self-heals React restores mid-stroke).
		*
		* Both properties need `important`: open state is `transform: none
		* !important` (layout.css.ts containing-block rule), which outranks a plain
		* inline — without it the computed transform stays `none`. Assert computed
		* transform, not `element.style.transform`.
		*/
		function applyFollow(ctx, dx) {
			if (!tracking || strokeMode !== "drawer") return;
			if (!lockDrawerOpen) {
				const travel = strokeRtl ? -dx : dx;
				if (!openFollowArmed) {
					if (travel < OPEN_FOLLOW_ARM_PX) return;
					armOpenFollow(ctx);
					if (!openFollowArmed) return;
				}
				const value = followOpenTransform(dx, strokeRtl);
				if (value === null) {
					followDrawer?.style.setProperty("transform", `translateX(-${CLOSED_SLOT_PCT}%)`, "important");
					return;
				}
				followDrawer?.style.setProperty("transform", value, "important");
				return;
			}
			if (followDrawer === null) return;
			const tx = followTranslate(strokeClosedTx, dx, strokeRtl, lockDrawerOpen);
			if (tx === null) {
				followDrawer.style.setProperty("transition", "none", "important");
				followDrawer.style.setProperty("transform", "translateX(0px)", "important");
				return;
			}
			followDrawer.style.setProperty("transition", "none", "important");
			followDrawer.style.setProperty("transform", `translateX(${tx}px)`, "important");
		}
		/**
		* Clear gesture-owned inline transform/transition.
		* Dispose and release paths must call this so a stuck drawer never keeps
		* an `!important` transform after the effect tears down.
		*/
		function clearFollowInlineStyles(el) {
			el.style.removeProperty("transition");
			el.style.removeProperty("transform");
		}
		/**
		* Drop inline follow styles so the host stylesheet retakes control and
		* animates from the finger position to the current host state. Called on
		* every end-stroke branch (revert = spring-back; commit retargets same-task).
		*/
		function releaseFollowStyles() {
			const el = followDrawer;
			if (el === null) return;
			clearFollowInlineStyles(el);
		}
		/**
		* Close commit still animating to the closed slot before the host flips.
		* Flip must wait: the column renders two exclusive subtrees, and React swaps
		* them mid-transition if the marker flips early (width/tx jump). Late commit:
		* animate inline to the slot, flip only when off-screen, then drop styles.
		*/
		let pendingCommit = null;
		function finishPendingCommit() {
			const pending = pendingCommit;
			if (pending === null) return;
			pendingCommit = null;
			window.clearTimeout(pending.timer);
			clearFollowInlineStyles(pending.el);
			const frame = getFrame();
			if (frame !== null && !frame.hasAttribute("data-sidebar-collapsed")) pending.ctx.layout.toggleSidebar();
		}
		/**
		* Animate `el` to `targetTx`, flip the host when it lands. One-shot: a
		* second call settles the previous commit first.
		*/
		function commitWithAnimation(ctx, el, targetTx) {
			finishPendingCommit();
			el.style.setProperty("transition", `transform ${COMMIT_ANIM_MS}ms ease-in-out`, "important");
			el.getBoundingClientRect();
			el.style.setProperty("transform", targetTx, "important");
			fadeOverlayOut();
			cooldownUntil = performance.now() + COOLDOWN_MS;
			pendingCommit = {
				el,
				ctx,
				timer: window.setTimeout(finishPendingCommit, 320)
			};
		}
		/**
		* Terminal close: animate into the closed slot, then flip. Slot must be the
		* host's real closed rule (-110%) so dropping the inline pair is a no-op.
		*/
		function commitFollowClose(ctx) {
			const el = followDrawer;
			followDrawer = null;
			if (el === null) {
				releaseFollowStyles();
				ctx.layout.toggleSidebar();
				cooldownUntil = performance.now() + COOLDOWN_MS;
				return;
			}
			commitWithAnimation(ctx, el, strokeRtl ? `translateX(${CLOSED_SLOT_PCT}%)` : `translateX(-${CLOSED_SLOT_PCT}%)`);
		}
		/**
		* Animate an open drawer into its closed slot, then flip. Non-gesture closers
		* (backdrop, Escape, nav taps) route here so click close matches swipe close:
		* the host swaps the pane subtree and drops its surface at the marker flip,
		* so a plain CSS transition would slide an invisible shell — hence late
		* commit. Open direction needs none of this (host keeps visuals until flip).
		* Returns false when the caller should plain-toggle (already closed, or
		* prefers-reduced-motion).
		*/
		function closeDrawerAnimated(ctx) {
			if (!drawerOpen()) return false;
			if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
			const drawer = findDrawer();
			if (drawer === null) return false;
			commitWithAnimation(ctx, drawer, frameRtl() ? `translateX(${CLOSED_SLOT_PCT}%)` : `translateX(-${CLOSED_SLOT_PCT}%)`);
			return true;
		}
		/**
		* Cancel: styles back to host, pointer idle. Armed open follow already
		* flipped the host — cancel must toggle back; release inline first so the
		* host transition animates home same-task.
		*/
		function abortStroke(ctx, immediate = false) {
			if (pendingCommit !== null) {
				if (immediate) finishPendingCommit();
				return;
			}
			const wasArmed = openFollowArmed;
			openFollowArmed = false;
			openFollowRefused = false;
			revealDrawerContent();
			if (wasArmed && ctx !== null && followDrawer !== null && !immediate) {
				reset();
				commitFollowClose(ctx);
				return;
			}
			releaseFollowStyles();
			reset();
			if (wasArmed && ctx !== null) {
				ctx.layout.toggleSidebar();
				cooldownUntil = performance.now() + COOLDOWN_MS;
			}
		}
		/** Start a stroke; returns true when it may be tracked. */
		function beginStroke(event, rtl, viewportWidthPx) {
			if (onCooldown()) return false;
			if (modalOpen()) return false;
			if (takeoverActive()) return false;
			if (selectionOwnsStroke()) return false;
			if (dragMarkYields(event)) return false;
			if (floatingWidgetYields(event)) return false;
			if (!(event.target instanceof Element)) return false;
			if (findHorizontalScroller(chainFrom(event.target)) !== null) return false;
			const open = drawerOpen();
			const filesZonePx = startZonePxFor(viewportWidthPx, FILES_ZONE_RATIO);
			if (open) {
				const frame = getFrame();
				if (frame === null) return false;
				const rect = frame.getBoundingClientRect();
				if (event.clientX < rect.left || event.clientX > rect.right) return false;
				if (event.clientY < rect.top || event.clientY > rect.bottom) return false;
				if (event.target.closest("[class*=\"sessionRow\"] button") !== null) return false;
				const drawer = findDrawer();
				const drawerRect = drawer === null ? null : drawer.getBoundingClientRect();
				strokeMode = openStateStartMode(drawerRect !== null && event.clientX >= drawerRect.left && event.clientX <= drawerRect.right, filesZoneHit(event.clientX, viewportWidthPx, rtl, filesZonePx));
			} else if (hitTestStart(event.clientX, viewportWidthPx, rtl, { startZonePx: startZonePxFor(viewportWidthPx) })) strokeMode = "drawer";
			else if (filesZoneHit(event.clientX, viewportWidthPx, rtl, filesZonePx)) strokeMode = "files";
			else return false;
			trackingPointer = event.pointerId;
			tracking = false;
			startX = event.clientX;
			startY = event.clientY;
			samples = [{
				t: event.timeStamp,
				x: event.clientX
			}];
			return true;
		}
		/**
		* Axis-lock the stroke once its dominant axis has moved LOCK_PX. Horizontal
		* dominance (|dx| > |dy|) locks to X and is tracked; vertical dominance
		* abandons the stroke back to native scrolling (browser takes over, no
		* further preventDefault). Once locked the axis never re-decides — matching
		* MUI's UNCERTAINTY_THRESHOLD semantics.
		*/
		function tryLock(event) {
			const dx = event.clientX - startX;
			const dy = event.clientY - startY;
			if (Math.max(Math.abs(dx), Math.abs(dy)) < LOCK_PX) return false;
			if (dragMarkYields(event) || floatingWidgetYields(event)) {
				reset();
				return false;
			}
			if (Math.abs(dx) <= Math.abs(dy)) {
				reset();
				return false;
			}
			tracking = true;
			lockDrawerOpen = drawerOpen();
			if (strokeMode === "files") {
				lockFilesOpen = filesPanelOpen();
				if (lockDrawerOpen) startFollow();
				markStrokeLocked();
				return true;
			}
			markStrokeLocked();
			startFollow();
			return true;
		}
		/** Append a sample and prune the window. */
		function pushSample(event) {
			samples.push({
				t: event.timeStamp,
				x: event.clientX
			});
			const cutoff = event.timeStamp - VELOCITY_WINDOW_MS;
			let i = 0;
			while (i < samples.length - 1 && samples[i].t < cutoff) i += 1;
			if (i > 0) samples = samples.slice(i);
		}
		/**
		* Release the stroke: classify, then either commit or spring back.
		*
		* Hybrid-follow order matters: classify first (follow position is dx), then
		* drop inline follow styles (host transition resumes toward the current
		* state), then flip host state in the same task so motion stays continuous.
		* A revert simply animates home.
		*
		* An ARMED OPEN follow inverts the commit: the host state was already
		* flipped at arm time, so a positive verdict must NOT toggle again (that
		* would close the drawer the user just pulled out) and a negative verdict
		* must toggle BACK. Either way the inline release comes first, so the host
		* transition animates from the finger position to whichever state wins.
		*/
		function endStroke(ctx, event, rtl, viewportWidthPx) {
			const wasTracking = tracking;
			const armedOpen = openFollowArmed;
			openFollowArmed = false;
			openFollowRefused = false;
			const filesMode = strokeMode === "files";
			const filesOpenAtLock = lockFilesOpen;
			const vel = slidingVelocity(samples, VELOCITY_WINDOW_MS, event.timeStamp);
			const dx = event.clientX - startX;
			const dy = event.clientY - startY;
			reset();
			if (!wasTracking) {
				if (armedOpen) commitFollowClose(ctx);
				return;
			}
			const verdict = modalOpen() || !armedOpen && onCooldown() ? "none" : filesMode ? classifyFilesSwipe({
				distanceRatio: FILES_DISTANCE_RATIO,
				velocity: FILES_VELOCITY,
				lockPx: LOCK_PX,
				viewportWidthPx,
				panelOpen: filesOpenAtLock,
				drawerOpen: lockDrawerOpen,
				drawerCloseDistanceRatio: CLOSE_DISTANCE_RATIO
			}, {
				dx,
				dy,
				velX: vel
			}, rtl) : classifySwipe({
				openDistanceRatio: OPEN_DISTANCE_RATIO,
				closeDistanceRatio: CLOSE_DISTANCE_RATIO,
				velocityWindowMs: VELOCITY_WINDOW_MS,
				openVelocity: OPEN_VELOCITY,
				closeVelocity: CLOSE_VELOCITY,
				lockPx: LOCK_PX,
				cooldownMs: COOLDOWN_MS,
				startZonePx: startZonePxFor(viewportWidthPx),
				viewportWidthPx,
				drawerOpen: lockDrawerOpen
			}, {
				dx,
				dy,
				velX: vel
			}, rtl);
			revealDrawerContent();
			if (armedOpen) {
				if (verdict === "open") {
					releaseFollowStyles();
					cooldownUntil = performance.now() + COOLDOWN_MS;
				} else commitFollowClose(ctx);
				if (event.target instanceof Element) markStrokeConsumed(event.target);
				return;
			}
			if (!(event.target instanceof Element)) return;
			if (verdict === "close") {
				markStrokeConsumed(event.target);
				commitFollowClose(ctx);
				return;
			}
			releaseFollowStyles();
			if (verdict === "open") {
				markStrokeConsumed(event.target);
				ctx.layout.toggleSidebar();
				cooldownUntil = performance.now() + COOLDOWN_MS;
			}
			if (verdict === "files") {
				filesToggleFn();
				markStrokeConsumed(event.target);
				cooldownUntil = performance.now() + COOLDOWN_MS;
			}
			if (filesMode && verdict === "none") markStrokeConsumed(event.target);
		}
		/**
		* Mark the released stroke so its synthetic click cannot re-toggle the drawer
		* or activate a row.
		*
		* The mark walks the ancestor chain up to the DRAWER when the stroke started
		* inside it: the backdrop is a frame child, so stopping at the frame would
		* make the host treat a genuine backdrop tap within the window as consumed
		* and swallow the close (the "tap twice to close" bug). A stroke that started
		* OUTSIDE the drawer (the left-edge start zone, or — since closing accepts
		* the whole frame — the backdrop itself) has no drawer in its chain, so the
		* walk would otherwise run all the way to the document root and briefly
		* shadow every tap on the page; the frame is the tightest correct stop for
		* those, and it is what must be marked anyway, because a backdrop-started
		* close stroke needs its own overlay click consumed.
		*/
		function markStrokeConsumed(target) {
			const drawer = findDrawer();
			const upTo = drawer !== null && drawer.contains(target) ? drawer : getFrame() ?? null;
			markGestureConsumed(target, CONSUME_WINDOW_MS, upTo);
			consumedEl = target;
		}
		/** Forget stroke state (called on cancel / visibility change / blur). */
		function reset() {
			trackingPointer = 0;
			tracking = false;
			samples = [];
			strokeMode = "drawer";
			lockFilesOpen = false;
			clearStrokeLocked();
		}
		/** The logical reading direction of the frame (RTL support). */
		function frameRtl() {
			const frame = getFrame();
			return frame !== null && getComputedStyle(frame).direction === "rtl";
		}
		/** Install the gesture layer for the current mobile breakpoint. */
		function installSidebarSwipe(ctx, filesToggle) {
			installMobileEffect(ctx, "dsh-web-mobile: sidebar swipe gestures", () => {
				filesToggleFn = filesToggle;
				const viewportWidth = () => window.innerWidth || document.documentElement.clientWidth || 0;
				const onPointerDown = (event) => {
					consumedEl = null;
					clearStrokeLocked();
					if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
					if (trackingPointer !== 0 && trackingPointer !== event.pointerId) {
						abortStroke(ctx);
						return;
					}
					beginStroke(event, frameRtl(), viewportWidth());
				};
				const onPointerMove = (event) => {
					if (event.pointerId !== trackingPointer) return;
					if (modalOpen() || takeoverActive()) {
						abortStroke(ctx);
						return;
					}
					if (!tracking) {
						if (selectionOwnsStroke()) {
							reset();
							return;
						}
						if (tryLock(event)) {
							pushSample(event);
							applyFollow(ctx, event.clientX - startX);
						}
					} else {
						pushSample(event);
						applyFollow(ctx, event.clientX - startX);
					}
				};
				const onPointerUp = (event) => {
					if (event.pointerId !== trackingPointer) return;
					endStroke(ctx, event, frameRtl(), viewportWidth());
				};
				const onPointerCancel = (event) => {
					if (event.pointerId !== trackingPointer) return;
					abortStroke(ctx);
				};
				const onClick = (event) => {
					if (consumedEl === null) return;
					if (!(event.target instanceof Element)) return;
					const overlay = event.target.closest("[data-mobile-nav=\"backdrop\"], [data-mobile-nav=\"fab\"]");
					if (overlay !== null && !overlay.contains(consumedEl)) return;
					if (!consumeIfGestured(event)) return;
					event.stopPropagation();
					event.preventDefault();
					consumedEl = null;
				};
				const onVisibility = () => {
					if (document.hidden) abortStroke(ctx);
				};
				const onTouchMove = (event) => {
					if (trackingPointer === 0) return;
					if (event.touches.length > 1) {
						abortStroke(ctx);
						return;
					}
					event.preventDefault();
				};
				document.addEventListener("pointerdown", onPointerDown, true);
				document.addEventListener("pointermove", onPointerMove, true);
				document.addEventListener("pointerup", onPointerUp, true);
				document.addEventListener("pointercancel", onPointerCancel, true);
				document.addEventListener("click", onClick, true);
				document.addEventListener("touchmove", onTouchMove, {
					capture: true,
					passive: false
				});
				const onBlur = () => abortStroke(ctx);
				document.addEventListener("visibilitychange", onVisibility);
				window.addEventListener("blur", onBlur);
				return () => {
					document.removeEventListener("pointerdown", onPointerDown, true);
					document.removeEventListener("pointermove", onPointerMove, true);
					document.removeEventListener("pointerup", onPointerUp, true);
					document.removeEventListener("pointercancel", onPointerCancel, true);
					document.removeEventListener("click", onClick, true);
					document.removeEventListener("touchmove", onTouchMove, { capture: true });
					document.removeEventListener("visibilitychange", onVisibility);
					window.removeEventListener("blur", onBlur);
					abortStroke(ctx, true);
				};
			});
		}
		//#endregion
		//#region src/client/effects/phone-chrome.ts
		const NS$2 = "mobileNav";
		/** Same width bound as the shell's SIDEBAR_AUTO_COLLAPSE (viewport < 1024),
		*  ANDed with a touch-primary pointer guard. Width alone cannot tell a phone
		*  from a desktop window: split views and OS display scaling push a PC's CSS
		*  viewport below 1024px too, and the whole mobile shell (drawer, header
		*  Files button, gestures) would mount there. (pointer: coarse) keeps the
		*  adaptation on touch-primary devices — phones, tablets, DSHA — while any
		*  mouse-driven window stays desktop at every width. Headless probes have no
		*  pointer at all: arm the mobile branch with Emulation.setTouchEmulation-
		*  Enabled before asserting mobile UI. */
		const MOBILE_QUERY = "(max-width: 1023px) and (pointer: coarse)";
		/** Informational wide-bound for the debug badge. The authoritative desktop
		*  guard is the CSS hide block in misc.css.ts — the exact complement of
		*  MOBILE_QUERY — because slot-rendered controls exist at every width. */
		const DESKTOP_QUERY = "(min-width: 1024px)";
		/** Pointer-only guard for the one feature with no desktop equivalent: the
		*  session-delete menu injection. Armed on touch-primary devices at every
		*  width — a large landscape tablet keeps desktop layout but still gets the
		*  delete-session item. Mouse-driven or pointer-less windows never arm it. */
		const TOUCH_QUERY = "(pointer: coarse)";
		/** Long press on a session row opens its ⋯ menu — the phone equivalent of the
		*  desktop hover that reveals the row actions (the host renders them with
		*  `display: none` until `:hover` or `menuOpen`, neither of which touch ever
		*  reaches). Long enough to be deliberate, short enough to read as a context
		*  menu. */
		const LONG_PRESS_MS = 500;
		/** Pointer travel that cancels a long press (the swipe layer locks at 8px). */
		const LONG_PRESS_MOVE_PX = 10;
		/** How long the lift may not close the menu the press opened: the host menu
		*  closes on pointerleave, and the finger lift itself fires one. */
		const LONG_PRESS_MENU_GUARD_MS = 1200;
		/** Window in which the press's own synthesized click is swallowed, so the lift
		*  neither navigates the row nor collapses the drawer. */
		const LONG_PRESS_CLICK_SWALLOW_MS = 800;
		/** Finger-down to finger-up travel that still counts as a tap on a session row
		*  (#49). Per-axis (`isTapWithinSlop` is max-norm, not Euclidean): the drawer
		*  list scrolls vertically, so a 60px vertical drift must not navigate while a
		*  diagonal wobble still reads as a tap. */
		const TAP_NAV_SLOP_PX = 12;
		/** Where the current touch started (null for a mouse, and between touches).
		*  The no-click row-tap fallback resolves the row's session id at pointerup and
		*  only when the finger stayed put, so every touch pointerdown records this
		*  BEFORE any early return — a missed record silently disables the whole
		*  fallback. Cleared by the effect's disposer. */
		let touchDownAt = null;
		/**
		* Re-arm a mobile-only DOM effect on every query change. Replaces the
		* repeated matchMedia + change-listener scaffold so all breakpoint strings
		* live in one place. `query` defaults to MOBILE_QUERY; effects that arm on a
		* different condition (e.g. TOUCH_QUERY) pass their own string instead of
		* building a private matchMedia scaffold.
		*/
		function installMobileEffect(ctx, label, install, query = MOBILE_QUERY) {
			ctx.effect(() => {
				const narrow = window.matchMedia(query);
				let cleanup;
				const arm = () => {
					cleanup?.();
					cleanup = narrow.matches ? install(narrow) : void 0;
				};
				arm();
				narrow.addEventListener("change", arm);
				return () => {
					narrow.removeEventListener("change", arm);
					cleanup?.();
				};
			}, label);
		}
		/** The AppFrame element: direct parent of the shell overlay layer. */
		function findFrame() {
			return document.querySelector("[data-shell-overlay]")?.parentElement ?? null;
		}
		/** Resolve the plugin-owned frame marker, falling back to the raw shell frame. */
		function getFrame() {
			return document.querySelector("[data-mobile-nav=\"frame\"]") ?? findFrame();
		}
		/** Neutralize `@linxin666/dsh-web-all`'s drawer dismiss: it clicks the first
		*  `[data-dsh-responsive-part="sidebar-toggle"]` on any treeitem tap (no row-
		*  actions exemption), so an earlier inert stamp makes its dismiss a no-op
		*  and this plugin owns close (nav observer / backdrop capture). No-op when
		*  the shim is absent. */
		const HOST_TOGGLE_SELECTOR = "[data-dsh-responsive-part=\"sidebar-toggle\"]:not([data-mobile-nav])";
		const DISMISS_SHADOW_SELECTOR = "[data-mobile-nav=\"dismiss-shadow\"]";
		function ensureDismissShadow() {
			if (typeof document === "undefined") return;
			const shadow = document.querySelector(DISMISS_SHADOW_SELECTOR);
			const real = document.querySelector(HOST_TOGGLE_SELECTOR);
			const pane = real?.closest("[data-pane=\"sidebar\"]") ?? null;
			if (real === null || pane === null) {
				shadow?.remove();
				return;
			}
			if (shadow !== null && shadow.parentElement === pane && pane.firstElementChild === shadow) return;
			const element = shadow ?? document.createElement("span");
			if (shadow === null) {
				element.setAttribute("data-mobile-nav", "dismiss-shadow");
				element.setAttribute("data-dsh-responsive-part", "sidebar-toggle");
				element.setAttribute("aria-hidden", "true");
				element.style.setProperty("display", "none", "important");
			}
			pane.insertBefore(element, pane.firstElementChild);
		}
		/**
		* Frame marker controller: owns `data-mobile-nav="frame"` and every plugin
		* marker that can survive on the shell-owned frame. Installed once at apply
		* time so effects no longer each need to find/set/clear the frame. Returns a
		* disposer that unregisters the task and resets the installed flag, so a
		* same-environment plugin reload can rebuild the reconciler from scratch.
		* (The host-generation probe this controller used to call was dead code —
		* nothing ever read `data-mobile-nav-gen`, and the plugin deliberately does
		* not yield the drawer to the host's one: see docs/maintenance/pitfalls.md
		* §0.1.5 drawer z-index and backdrop.)
		*/
		function installFrameController() {
			if (frameControllerInstalled) return () => {};
			frameControllerInstalled = true;
			let frame = null;
			const removeTask = addReconcilerTask({
				name: "frame-marker",
				scopes: ["*"],
				ensure: () => {
					frame = findFrame();
					if (frame !== null && !frame.hasAttribute("data-mobile-nav")) frame.setAttribute("data-mobile-nav", "frame");
					ensureDismissShadow();
				},
				dispose: () => {
					if (frame !== null) frame.removeAttribute("data-mobile-nav");
					if (typeof document !== "undefined") document.querySelector(DISMISS_SHADOW_SELECTOR)?.remove();
					frame = null;
				}
			});
			return () => {
				removeTask();
				frameControllerInstalled = false;
			};
		}
		let frameControllerInstalled = false;
		let reconcileTasksRegistered = false;
		let reconcilerInstalled = false;
		const core = createReconcilerCore({ requestFrame: (flush) => {
			let id = 0;
			const run = () => {
				id = 0;
				flush();
			};
			id = requestAnimationFrame(run);
			return () => {
				if (id !== 0) cancelAnimationFrame(id);
			};
		} });
		/**
		* One full-tree MutationObserver for every mobile DOM reconciler. Tasks can be
		* registered from React or plain effects; they only run while the mobile
		* breakpoint is active and are re-armed automatically on width changes.
		*/
		function installReconciler(ctx) {
			if (reconcilerInstalled) return () => {};
			reconcilerInstalled = true;
			installMobileEffect(ctx, "dsh-web-mobile: DOM reconciler", () => {
				const observer = new MutationObserver((records) => {
					const keys = /* @__PURE__ */ new Set();
					for (const record of records) keys.add(record.type === "attributes" && record.attributeName !== null ? record.attributeName : "*");
					core.note(keys);
				});
				observer.observe(document.documentElement, {
					childList: true,
					subtree: true,
					attributes: true,
					attributeFilter: [
						"style",
						"class",
						"data-phase",
						"data-sidebar-collapsed"
					]
				});
				core.activate();
				return () => {
					observer.disconnect();
					core.deactivate();
				};
			});
			return () => {
				reconcilerInstalled = false;
			};
		}
		/** Register a reconciler task. The returned disposer removes it immediately. */
		function addReconcilerTask(task) {
			return core.register(task);
		}
		/**
		* Whether the page runs on iOS / iPadOS WebKit, where focusing a text field
		* whose computed font-size is below 16px zooms the whole visual viewport
		* (#45). Every other engine ignores field font-size, so the 16px floor in
		* misc.css.ts is gated on this marker instead of applying to every phone —
		* Android would only get bigger search boxes for no benefit.
		*
		* Pure and injectable so the decision table is unit-testable:
		* - The feature probe is the reliable signal: `font: -apple-system-body` is
		*   Safari-only and `-webkit-touch-callout` is an iOS property, so the pair
		*   is true on iOS WebKit (including Chrome / Edge / Opera on iOS, which are
		*   WebKit and zoom identically) and false on Chromium and on macOS Safari.
		* - The UA fallback covers engines whose CSS.supports is missing or which
		*   parse the probe differently: iPhone / iPad / iPod UAs, plus iPadOS 13+
		*   which reports a Macintosh UA and is told apart by its touch points.
		*/
		function detectIosWebKit(nav, supports) {
			if (supports !== null) try {
				if (supports("(font: -apple-system-body) and (-webkit-touch-callout: none)")) return true;
			} catch {}
			const ua = nav.userAgent;
			if (/iP(hone|ad|od)/.test(ua)) return true;
			return /Macintosh/.test(ua) && nav.maxTouchPoints > 1;
		}
		/** Marker the iOS-only zoom-guard CSS is scoped to (html element). */
		const IOS_MARKER = "data-mobile-nav-ios";
		/**
		* Viewport content the plugin owns while the mobile branch is armed.
		* Deliberately zoom-free: iOS 10+ ignores maximum-scale/user-scalable for
		* user pinch but other engines honor them, so writing them would only take
		* zoom away from Android/DSHA; the iOS focus-zoom fix is the >=16px field
		* floor (data-mobile-nav-ios), not a zoom ban (#45).
		*/
		const VIEWPORT_CONTENT = "width=device-width, initial-scale=1, viewport-fit=cover";
		/**
		* CSS custom property carrying the viewport height WITHOUT the soft keyboard
		* (px), maintained by the viewport effect below. Mobile cards that must not
		* move when the keyboard appears size themselves with it instead of a viewport
		* unit — see the settings sheet / shortcut card rules in layout.css.ts.
		*/
		const STABLE_VIEWPORT_VAR = "--dsh-web-mobile-vh";
		const findViewportMeta = () => document.querySelector("meta[name=\"viewport\"]");
		/**
		* Phone chrome: KEEP the system status bar (no fullscreen) and make it
		* blend into the page. On narrow screens:
		* - The viewport meta is OWNED by the plugin while armed:
		*   width=device-width, initial-scale=1, viewport-fit=cover, re-asserted on
		*   every host rewrite, node replacement, or late injection, so
		*   env(safe-area-inset-top) stays the real status-bar / notch height
		*   instead of silently going stale when the host touches the meta. No zoom
		*   tokens here: iOS 10+ ignores them for user pinch but other engines
		*   honor them, and the focus-zoom fix is the >=16px field floor (#45), not
		*   a zoom ban. Dispose restores the host's own content as observed at arm
		*   time.
		* - A theme-color meta tracks the shell background (the official theme is
		*   toggled by body[data-ds-dark-theme], which flips --dsw-alias-bg-base):
		*   Android then paints the status bar / URL bar with the page's own base
		*   color, so the status bar reads as part of the UI instead of a foreign
		*   strip. The drawer paints the same strip on iOS / notch displays.
		* - documentElement carries data-mobile-nav-ios on iOS WebKit so the
		*   stylesheet can hold every text field at >=16px and Safari never
		*   focus-zooms the viewport (#45). Double-tap zoom is off through
		*   touch-action; pinch zoom stays available on purpose — it is the only way
		*   back out of a zoom the browser applied on its own.
		*/
		function installPhoneChrome(ctx) {
			installMobileEffect(ctx, "dsh-web-mobile: status bar theme + viewport + zoom guard", () => {
				const themeMeta = document.createElement("meta");
				themeMeta.name = "theme-color";
				const bodyBg = () => getComputedStyle(document.body).backgroundColor;
				const root = document.documentElement;
				let originalViewport = null;
				let observedMeta = null;
				let applying = false;
				const assertViewport = () => {
					const viewport = findViewportMeta();
					if (viewport === null) return;
					if (originalViewport === null) originalViewport = viewport.content;
					if (applying || viewport.content === VIEWPORT_CONTENT) return;
					applying = true;
					viewport.content = VIEWPORT_CONTENT;
					applying = false;
				};
				const metaObserver = new MutationObserver(assertViewport);
				const attachMetaObserver = () => {
					const viewport = findViewportMeta();
					if (viewport === observedMeta) return;
					if (observedMeta !== null) metaObserver.disconnect();
					observedMeta = viewport;
					if (viewport !== null) metaObserver.observe(viewport, {
						attributes: true,
						attributeFilter: ["content"]
					});
				};
				const headObserver = new MutationObserver(() => {
					attachMetaObserver();
					assertViewport();
				});
				headObserver.observe(document.head, { childList: true });
				attachMetaObserver();
				assertViewport();
				const observer = new MutationObserver(() => {
					themeMeta.content = bodyBg();
				});
				observer.observe(document.body, {
					attributes: true,
					attributeFilter: ["data-ds-dark-theme"]
				});
				const cssSupports = typeof CSS !== "undefined" && typeof CSS.supports === "function" ? (condition) => CSS.supports(condition) : null;
				if (detectIosWebKit(navigator, cssSupports)) root.setAttribute(IOS_MARKER, "");
				themeMeta.content = bodyBg();
				if (themeMeta.parentElement === null) document.head.appendChild(themeMeta);
				let stableVh = 0;
				let stableWidth = 0;
				const syncStableViewport = () => {
					const height = window.innerHeight;
					const width = window.innerWidth;
					if (stableVh === 0 || height > stableVh || width !== stableWidth) {
						stableVh = height;
						stableWidth = width;
						root.style.setProperty(STABLE_VIEWPORT_VAR, `${height}px`);
					}
				};
				syncStableViewport();
				window.addEventListener("resize", syncStableViewport);
				return () => {
					window.removeEventListener("resize", syncStableViewport);
					root.style.removeProperty(STABLE_VIEWPORT_VAR);
					metaObserver.disconnect();
					headObserver.disconnect();
					observer.disconnect();
					const viewport = findViewportMeta();
					if (viewport !== null && originalViewport !== null && viewport.content === VIEWPORT_CONTENT) viewport.content = originalViewport;
					themeMeta.remove();
					root.removeAttribute(IOS_MARKER);
				};
			});
		}
		/**
		* Drawer close interactions that are plain event listeners, not DOM
		* reconciliation:
		* - Escape closes the drawer (yielding to any open modal dialog, which owns
		*   its own Escape handling).
		* - Tapping a navigation target inside the drawer (session row, sidebar panel
		*   row, task board / ssh takeover entries, search results) closes the drawer
		*   so the content it opened gets the whole screen. Session-row action buttons
		*   (kebab) are excluded — they open a menu that must survive the tap.
		*
		* Touch close always rides the synthesized click. Closing a non-row target
		* from pointerup collapsed the drawer before that click existed, so the
		* browser dispatched no click and the target's onClick never ran (e.g. New
		* session only retracted the drawer).
		*/
		const TAP_CLOSE_NAV_SELECTOR = "button[data-dsh-taskboard-entry], button[data-dsh-ssh-entry], [class*=\"newSession\"], [class*=\"sessionRow\"], [class*=\"searchResultRow\"], [class*=\"searchResultWorkspace\"], [class*=\"panelRow\"]";
		/**
		* Shared drawer toggle for every non-gesture entry: close animates into the
		* closed slot and flips the host marker only after landing
		* (closeDrawerAnimated late commit); open stays a plain toggle so the host's
		* .28s transform plays.
		*
		* Load-bearing for layering: the popover band raises the modal root only while
		* our backdrop is on screen, and the backdrop outlives the marker flip (fade
		* + removal). Flipping the marker while the column is still painted leaves an
		* open modal under the drawer band for the transition — the shortcut-modal
		* jump/flash root cause. Route every closer through here.
		*/
		function toggleDrawer(ctx) {
			if (!closeDrawerAnimated(ctx)) ctx.layout.toggleSidebar();
		}
		function installOverlayInteractions(ctx) {
			installMobileEffect(ctx, "dsh-web-mobile: drawer close (Escape + navigate)", () => {
				const toggleSidebar = () => {
					toggleDrawer(ctx);
				};
				const drawerOpen = () => {
					const frame = getFrame();
					return frame !== null && !frame.hasAttribute("data-sidebar-collapsed");
				};
				const onKeyDown = (event) => {
					if (event.key !== "Escape") return;
					if (document.querySelector("[aria-modal=\"true\"]") !== null) return;
					if (drawerOpen()) toggleSidebar();
				};
				const drawerRoot = () => document.querySelector("[data-mobile-nav=\"frame\"] > :first-child");
				const isDrawerNavTarget = (target) => {
					if (document.querySelector("[aria-modal=\"true\"]") !== null) return false;
					if (!drawerOpen()) return false;
					if (!(target instanceof Element)) return false;
					const drawer = drawerRoot();
					if (drawer === null || !drawer.contains(target)) return false;
					if (target.closest("[class*=\"sessionRow\"] button") !== null) return false;
					return target.closest(TAP_CLOSE_NAV_SELECTOR) !== null;
				};
				const shouldCloseOnTapInsideDrawer = (target) => !(target instanceof Element && target.closest("[data-dsha-session-select]") !== null) && isDrawerNavTarget(target);
				let lastTouchNavAt = 0;
				let navSignatureAtArm = "";
				let navObserver = null;
				let navTimer = null;
				let pressTimer = null;
				let pressOrigin = null;
				let pressRow = null;
				let pressFired = false;
				let menuGuardUntil = 0;
				let swallowClickUntil = 0;
				let swallowClickRow = null;
				const clearPress = () => {
					if (pressTimer !== null) window.clearTimeout(pressTimer);
					pressTimer = null;
					pressOrigin = null;
					pressRow = null;
					pressFired = false;
				};
				const openRowMenu = (row) => {
					if (document.querySelector("[role=\"menu\"]") !== null) return;
					const button = row.querySelector("[class*=\"_rowActions\"] button");
					if (button === null) return;
					menuGuardUntil = performance.now() + LONG_PRESS_MENU_GUARD_MS;
					button.click();
				};
				/** The only `dblclick`s allowed through to the host are the ones we
				*  dispatch ourselves: a real one is the double *tap* that means "open the
				*  session", and letting it reach the title would open the rename dialog on
				*  the same gesture. Identity, not a flag on the event: nothing else can
				*  forge it. */
				const syntheticDoubleClicks = /* @__PURE__ */ new WeakSet();
				/** Long-press rename: redispatch the host title dblclick (rename state
				*  machine is package-private). @returns false if the title is missing. */
				const requestRowRename = (row) => {
					const title = row.querySelector("[class*=\"_title\"]");
					if (title === null) return false;
					const event = new MouseEvent("dblclick", {
						bubbles: true,
						cancelable: true,
						view: window
					});
					syntheticDoubleClicks.add(event);
					title.dispatchEvent(event);
					return true;
				};
				/** Swallow host title-dblclick rename (rename is long-press; double-tap
				*  opens). Capture on document so React never sees it. Mobile-only
				*  (MOBILE_QUERY); desktop keep host behaviour. */
				const onDrawerDoubleClick = (event) => {
					if (syntheticDoubleClicks.has(event)) return;
					const target = event.target;
					if (!(target instanceof Element)) return;
					if (target.closest("[class*=\"sessionRow\"] [class*=\"_title\"]") === null) return;
					event.preventDefault();
					event.stopPropagation();
				};
				const selectedRowSignature = () => {
					return ((drawerRoot()?.querySelector("[role=\"treeitem\"][aria-selected=\"true\"]"))?.querySelector("[class*=\"_title\"]"))?.textContent?.trim() ?? null;
				};
				const disarmNav = () => {
					navObserver?.disconnect();
					navObserver = null;
					if (navTimer !== null) window.clearTimeout(navTimer);
					navTimer = null;
					navSignatureAtArm = "";
				};
				const armNav = () => {
					disarmNav();
					navSignatureAtArm = selectedRowSignature() ?? "";
					const root = drawerRoot();
					if (root === null) return;
					navObserver = new MutationObserver(() => {
						if (!drawerOpen()) {
							disarmNav();
							return;
						}
						const signature = selectedRowSignature();
						if (signature !== null && signature !== navSignatureAtArm) {
							disarmNav();
							toggleSidebar();
						}
					});
					navObserver.observe(root, {
						childList: true,
						subtree: true,
						attributes: true,
						attributeFilter: ["aria-selected"]
					});
					navTimer = window.setTimeout(disarmNav, 2e3);
				};
				/** Whether the session list really knows an id. The fiber walk has no
				*  shape heuristic on purpose: hop 32 of a row's chain is a ScopeProvider
				*  whose `props.scope` is the literal 'session-maybe', and
				*  `ctx.sessions.open` fails loud on unknown ids — membership is the only
				*  filter that can never hand the host a guess. */
				const isKnownSessionId = (id) => {
					return sessionById(ctx.sessions.list.getSnapshot(), id) !== void 0;
				};
				/** The session a finished tap on `row` should open, or null to fall back to
				*  the DOM observer: no finger-down record, a release that travelled (a
				*  scroll or a swipe, not a tap), a fiber chain offering no known id, or a
				*  row that is already the current session. */
				const tappedRowSessionId = (row, event) => {
					if (touchDownAt === null) return null;
					if (!isTapWithinSlop(touchDownAt, {
						x: event.clientX,
						y: event.clientY
					}, TAP_NAV_SLOP_PX)) return null;
					const id = findSessionIdInFiber(reactFiberOf(row), isKnownSessionId);
					if (id === null) return null;
					return currentSessionIdOf(ctx.sessions.list.getSnapshot()) === id ? null : id;
				};
				let closeOnNavUnsub = null;
				let closeOnNavDone = false;
				/** Disarming means spent: mark the close done before dropping the
				*  subscription, so a `fire` a subscription tick already queued cannot
				*  toggle the drawer after the close was handed to the other closer. */
				const disarmCloseOnNav = () => {
					closeOnNavDone = true;
					closeOnNavUnsub?.();
					closeOnNavUnsub = null;
				};
				const closeOnNavigation = (id) => {
					disarmCloseOnNav();
					closeOnNavDone = false;
					const fire = () => {
						if (closeOnNavDone) return;
						disarmCloseOnNav();
						if (drawerOpen()) toggleSidebar();
					};
					closeOnNavUnsub = ctx.sessions.list.subscribe(() => {
						if (currentSessionIdOf(ctx.sessions.list.getSnapshot()) !== id) return;
						window.setTimeout(fire, 0);
					});
				};
				const onDrawerPointerDown = (event) => {
					touchDownAt = event.pointerType === "touch" || event.pointerType === "pen" ? {
						x: event.clientX,
						y: event.clientY
					} : null;
					clearPress();
					if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
					if (isStrokeLocked()) return;
					const target = event.target;
					if (!isDrawerNavTarget(target) || !(target instanceof Element)) return;
					const row = target.closest("[class*=\"_sessionRow\"]");
					if (row === null || target.closest("[class*=\"_rowActions\"]") !== null) return;
					pressOrigin = {
						x: event.clientX,
						y: event.clientY
					};
					pressRow = row;
					pressTimer = window.setTimeout(() => {
						pressTimer = null;
						if (pressRow === null) return;
						pressFired = true;
						if (!requestRowRename(pressRow)) openRowMenu(pressRow);
					}, LONG_PRESS_MS);
				};
				const onDrawerPointerMove = (event) => {
					if (pressOrigin === null) return;
					if (isStrokeLocked()) {
						clearPress();
						return;
					}
					if (Math.abs(event.clientX - pressOrigin.x) > LONG_PRESS_MOVE_PX || Math.abs(event.clientY - pressOrigin.y) > LONG_PRESS_MOVE_PX) clearPress();
				};
				const onDrawerPointerLeave = (event) => {
					if (performance.now() > menuGuardUntil) return;
					const target = event.target;
					if (!(target instanceof Element)) return;
					if (target.closest("[class*=\"_rowActions\"]") === null && target.closest("[class*=\"_sessionRow\"]") === null) return;
					event.stopPropagation();
				};
				const onDrawerClick = (event) => {
					const target = event.target;
					if (swallowClickRow !== null && performance.now() <= swallowClickUntil) {
						if (target instanceof Element && (target === swallowClickRow || swallowClickRow.contains(target))) {
							swallowClickUntil = 0;
							swallowClickRow = null;
							event.preventDefault();
							event.stopPropagation();
							return;
						}
					}
					if (isStrokeLocked() || consumeIfGestured(event)) return;
					if (target instanceof Element && target.closest("[data-mobile-nav=\"backdrop\"]") !== null) {
						if (drawerOpen()) toggleSidebar();
						return;
					}
					if (performance.now() - lastTouchNavAt < 500) return;
					if (shouldCloseOnTapInsideDrawer(target)) toggleSidebar();
				};
				const onDrawerPointerUp = (event) => {
					if (isStrokeLocked() || consumeIfGestured(event)) return;
					if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
					const pressed = pressFired;
					const pressedRow = pressRow;
					clearPress();
					if (pressed && pressedRow !== null) {
						swallowClickUntil = performance.now() + LONG_PRESS_CLICK_SWALLOW_MS;
						swallowClickRow = pressedRow;
						return;
					}
					const target = event.target;
					if (!(target instanceof Element)) return;
					if (!shouldCloseOnTapInsideDrawer(target)) return;
					const row = target.closest("[role=\"treeitem\"]");
					if (row !== null) {
						lastTouchNavAt = performance.now();
						if (row.getAttribute("aria-selected") === "true") toggleSidebar();
						else {
							const tappedId = tappedRowSessionId(row, event);
							if (tappedId === null) {
								disarmCloseOnNav();
								armNav();
							} else {
								disarmNav();
								if (sessionsCanOpen(ctx.sessions)) {
									closeOnNavigation(tappedId);
									openSession(ctx.sessions, tappedId);
								} else {
									disarmCloseOnNav();
									armNav();
								}
							}
						}
						return;
					}
				};
				const onDshaSessionOpen = () => {
					if (drawerOpen()) toggleSidebar();
				};
				document.addEventListener("dsha-session-open", onDshaSessionOpen);
				document.addEventListener("dblclick", onDrawerDoubleClick, true);
				document.addEventListener("keydown", onKeyDown, true);
				document.addEventListener("click", onDrawerClick, true);
				document.addEventListener("pointerdown", onDrawerPointerDown, true);
				document.addEventListener("pointermove", onDrawerPointerMove, true);
				document.addEventListener("pointerleave", onDrawerPointerLeave, true);
				document.addEventListener("pointerup", onDrawerPointerUp, true);
				return () => {
					disarmNav();
					disarmCloseOnNav();
					touchDownAt = null;
					clearPress();
					document.removeEventListener("dsha-session-open", onDshaSessionOpen);
					document.removeEventListener("dblclick", onDrawerDoubleClick, true);
					document.removeEventListener("keydown", onKeyDown, true);
					document.removeEventListener("click", onDrawerClick, true);
					document.removeEventListener("pointerdown", onDrawerPointerDown, true);
					document.removeEventListener("pointermove", onDrawerPointerMove, true);
					document.removeEventListener("pointerleave", onDrawerPointerLeave, true);
					document.removeEventListener("pointerup", onDrawerPointerUp, true);
				};
			});
		}
		/**
		* Register the shared DOM reconciler tasks. Returns a disposer that
		* unregisters every task and resets the flag, so a same-environment plugin
		* reload can rebuild the reconciler from scratch.
		*
		* @param panelExit - the sidebar-panel exit face (panel-exit.ts): its system-back
		*   route is registered here so it shares this reconciler, and the FAB reads it
		*   to switch its meaning while a panel owns the main area.
		*/
		function registerReconcileTasks(ctx, panelExit) {
			if (reconcileTasksRegistered) return () => {};
			reconcileTasksRegistered = true;
			const t = ctx.locale.bind(NS$2);
			const removeTasks = [
				addReconcilerTask(createStatsLineTask()),
				addReconcilerTask(createOverlayTask(t, () => toggleDrawer(ctx), panelExit)),
				addReconcilerTask(panelExit.task)
			];
			return () => {
				for (const remove of removeTasks) remove();
				reconcileTasksRegistered = false;
			};
		}
		//#endregion
		//#region src/client/components/open-files-panel.ts
		/** The host's own right-sidebar opener (ui-sidebar-right: ExpandButton). */
		const HOST_FILES_OPENER = "[data-sidebar-right-expand]";
		/** The host's collapse control, mounted while the right sidebar is open. */
		const HOST_FILES_CLOSER = "[data-sidebar-right-toggle]";
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
		function openFilesPanel(doc = document, _frame = getFrame()) {
			const closer = doc.querySelector(HOST_FILES_CLOSER);
			const opener = doc.querySelector(HOST_FILES_OPENER);
			const hostControl = typeof opener?.click === "function" ? opener : closer;
			if (typeof hostControl?.click === "function") {
				hostControl.click();
				return true;
			}
			return false;
		}
		//#endregion
		//#region src/client/components/MobileNavToggle.tsx
		/**
		* Mobile-only icon buttons next to the session title:
		* - toggle: opens the directory drawer on narrow screens.
		* - files: opens the file browser directly — one tap, no drawer round-trip.
		*   Which surface that is (host right sidebar vs. the third-party explorer
		*   sheet) is decided in open-files-panel.ts. The hero/blank phases have no
		*   session header, so this control is absent there; the files entry in those
		*   phases is the right-edge leftward swipe (sidebar-swipe.ts).
		* Hidden entirely on wide screens (CSS media query).
		*/
		function MobileNavToggle({ toggleSidebar, t }) {
			const toggleExplorer = () => {
				openFilesPanel();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				"data-mobile-nav": "toggle",
				"aria-label": t("open"),
				title: t("open"),
				onClick: () => toggleSidebar(),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPanelLeft, { size: 16 })
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				"data-mobile-nav": "files",
				"aria-label": t("files"),
				title: t("files"),
				onClick: toggleExplorer,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconFolderOpen, { size: 16 })
			})] });
		}
		//#endregion
		//#region src/client/components/MobileDrawerFooter.tsx
		/**
		* Mobile-only drawer footer: session-log export (shared with the desktop
		* dialog). Hidden on wide screens via CSS.
		*
		* Files entry removed — while the drawer is open, neither the host nor the
		* dismiss shim lets a click reach the right-sidebar opener. See
		* docs/specs/2026-09-17-sidebar-files-coexistence-design.md.
		*/
		function MobileDrawerFooter({ useSessions, downloadSessionLog, t }) {
			const sessionId = useSessions((state) => currentSessionIdOf(state));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-mobile-nav": "drawer-actions",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					"data-mobile-nav": "session-log",
					"aria-label": t("sessionLog"),
					title: t("sessionLog"),
					disabled: sessionId === void 0,
					onClick: () => {
						if (sessionId !== void 0) downloadSessionLog(sessionId);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconDownload, { size: 14 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("sessionLog") })]
				})
			});
		}
		//#endregion
		//#region src/client/components/ComposerFileButton.tsx
		/**
		* Mobile-only composer file entry, kept visible outside the "+" command menu.
		*
		* The 0.1.6-alpha.2 host deleted the composer's paperclip attach button: the
		* only file entry left is the 「文件」row inside the "+" listbox (the trigger's
		* aria-label is 「添加文件或调用指令」). The host still mounts its own hidden
		* `input[type=file]` in the composer tool row and its own command opens the
		* native dialog with exactly `fileInputRef.current?.click()`, so this control
		* triggers that same input instead of reimplementing intake: file validation,
		* upload and the availability policy all stay host-owned.
		*
		* The control is contributed to the host-declared `conversation.input.left`
		* list slot ("Compact controls at the left of the composer tool row"), which
		* keeps it inside the tools lane beside the plus button without touching
		* host-owned React DOM. The seat is session-scoped, so the hero/blank phase
		* (no session) keeps the "+" menu as its only file entry.
		*
		* Availability mirrors the host's `canAcceptDrop` as far as it is observable:
		* a non-plain input phase (adjudicating/claimed/submitting = the machine is
		* busy) and a subagent session both refuse attachments. The host's own
		* `locked` / `addFiles === undefined` arms are package-private, so a missing
		* session seat also disables the control. Hidden entirely on wide screens
		* (CSS media query, and the shared desktop hide block in misc.css.ts).
		*/
		function ComposerFileButton({ useInput, useSession, t }) {
			const busy = useInput((state) => state.phase !== "plain");
			const subagent = useSession((state) => state.subagent !== null);
			const disabled = busy || subagent;
			const openPicker = (event) => {
				if (disabled) return;
				const card = event.currentTarget.closest("[data-composer-card]");
				const input = card === null ? null : card.querySelector("input[type=file]");
				if (input !== null) input.click();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				"data-mobile-nav": "file-upload",
				"aria-label": t("fileUpload"),
				title: t("fileUpload"),
				disabled,
				onClick: openPicker,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPaperclip, { size: 16 })
			});
		}
		//#endregion
		//#region src/client/styles/index.ts
		/**
		* Mobile styles concatenated in original sheet order (base → layout →
		* compat → misc). Injected as one <style data-plugin> tag; do not reorder.
		*/
		const MOBILE_CSS = [
			`
/* ---------- base control styles (any width; hidden where unused) ---------- */

[data-mobile-nav="toggle"],
[data-mobile-nav="files"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: none;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--dsw-alias-label-secondary, inherit);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="toggle"]:hover,
[data-mobile-nav="files"]:hover,
[data-mobile-nav="toggle"]:active,
[data-mobile-nav="files"]:active {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06));
}
[data-mobile-nav="toggle"]:focus-visible,
[data-mobile-nav="files"]:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, #4f6ef7);
  outline-offset: 1px;
}

/* Drawer footer: session-log download action. */
[data-mobile-nav="drawer-actions"] {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
[data-mobile-nav="session-log"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .12));
  border-radius: 12px;
  background: transparent;
  color: var(--dsw-alias-label-primary, inherit);
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="session-log"]:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06));
}
[data-mobile-nav="session-log"]:disabled {
  color: var(--dsw-alias-label-dimmed, rgba(0, 0, 0, .35));
  cursor: default;
}

[data-mobile-nav="delete-confirm-title"] {
  font-size: 16px;
  font-weight: 500;
  line-height: 24px;
  color: var(--dsw-alias-text-primary, rgb(15, 17, 21));
}
[data-mobile-nav="delete-confirm-desc"] {
  font-size: 12px;
  line-height: 17px;
  color: var(--dsw-alias-label-secondary, inherit);
}
[data-mobile-nav="delete-confirm-actions"] {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 2px;
}
[data-mobile-nav="delete-confirm-actions"] > button {
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .12));
  border-radius: 18px;
  background: transparent;
  color: var(--dsw-alias-label-primary, inherit);
  font-family: inherit;
  font-size: 14px;
  line-height: 20px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="delete-confirm-yes"] {
  border-color: transparent !important;
  background: var(--dsw-alias-state-error-primary, #b91c1c) !important;
  color: #ffffff !important;
}
[data-mobile-nav="delete-confirm-actions"] > button:disabled {
  opacity: .55;
  cursor: default;
}
[data-mobile-nav="delete-error"] {
  width: 100%;
  font-size: 14px;
  line-height: 20px;
  color: var(--dsw-alias-state-error-primary, #b91c1c);
}

/* Delete confirm/error: frosted card centered in a flex backdrop.
   Card is a static child of the backdrop (session-menu.ts appends it there). */
[data-mobile-nav="delete-dialog-backdrop"] {
  position: fixed;
  inset: 0;
  z-index: 55;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, .4);
  animation: dsh-web-mobile-fade .2s var(--ds-ease-in-out, ease-in-out);
}
[data-mobile-nav="delete-dialog"] {
  position: static;
  width: min(420px, calc(100vw - 32px));
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 16px;
  background: rgba(248, 249, 250, .58);
  -webkit-backdrop-filter: blur(40px) saturate(1.5);
  backdrop-filter: blur(40px) saturate(1.5);
  box-shadow: rgba(0, 0, 0, .04) 0 0 0 .5px, rgba(0, 0, 0, .04) 0 3px 8px 0, rgba(0, 0, 0, .05) 0 0 20px 0;
}
@media (prefers-reduced-motion: reduce) {
  [data-mobile-nav="delete-dialog-backdrop"],
  [data-mobile-nav="delete-dialog"] {
    animation: none !important;
  }
}

/* ---------- popover band above the open drawer (mobile) ----------
   Host menus portal to body at z-index 1100; drawer column is 1300 and
   backdrop 1250. Raise menus/dialogs above the drawer while it is open. */
@media (max-width: 1023px) and (pointer: coarse) {
  body:has([data-mobile-nav="frame"]:not([data-sidebar-collapsed])) [role="menu"] {
    z-index: 1400 !important;
  }
  /* Host modal portal root (body > div wrapping [role=dialog][aria-modal]).
     Gate on backdrop presence (not the collapsed marker): marker and paint
     disagree during the close transition, so a marker gate drops z mid-fade. */
  body:has([data-mobile-nav="backdrop"])
    > div:has(> [role="dialog"][aria-modal="true"]) {
    z-index: 1400 !important;
  }
  [data-mobile-nav="delete-dialog-backdrop"] {
    z-index: 1400 !important;
  }
  [data-mobile-nav="delete-dialog"] {
    z-index: 1401 !important;
  }
  /* usage-stats panel portals at z 100; raise above open drawer (1300). */
  body:has([data-mobile-nav="frame"]:not([data-sidebar-collapsed]))
    [data-usage-stats-panel] {
    z-index: 1400 !important;
  }
  /* AppFrame overlayLayer is a stacking context at z 20; raise the layer root
     so sheets portaled into it clear the drawer. */
  body:has([data-mobile-nav="frame"]:not([data-sidebar-collapsed]))
    [class*="_overlayLayer"] {
    z-index: 1400 !important;
  }
  /* Fullscreen sidebar panels use dockkit layer 40, above host overlay (20)
     and FAB (21). Raise FAB/overlay so the phone keeps a way back. */
  body:has([data-sidebar-right-open][data-sidebar-right-panel="fullscreen"]) [data-mobile-nav="fab"] {
    z-index: 55 !important;
  }
  body:has([data-sidebar-right-open][data-sidebar-right-panel="fullscreen"])
    [class*="_overlayLayer"] {
    z-index: 1400 !important;
  }
}

/* Floating fallback button (hero / blank phases without a session header).
   Top aligns with the session header toggle row (+ safe-area when cover). */
[data-mobile-nav="fab"] {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 12px);
  left: 10px;
  z-index: 21;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .12));
  border-radius: 50%;
  background: var(--dsw-alias-button-floating-fill, #ffffff);
  color: var(--dsw-alias-label-primary, inherit);
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, .18);
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="fab"]:hover {
  background: var(--dsw-alias-button-floating-hover, rgba(0, 0, 0, .08));
}
[data-mobile-nav="fab"]:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, #4f6ef7);
  outline-offset: 2px;
}

/* Dimmed backdrop under open drawer; above host stack, below drawer.
   z 1250: host pins sidebarCol at 1100; keep in sync with drawer z in layout.css.ts. */
[data-mobile-nav="backdrop"] {
  position: absolute;
  inset: 0;
  z-index: 1250;
  background: rgba(0, 0, 0, .45);
  cursor: pointer;
  animation: dsh-web-mobile-fade .2s var(--ds-ease-in-out, ease-in-out);
  /* Fade-out twin of the mount animation (inline opacity + delayed remove). */
  transition: opacity .2s var(--ds-ease-in-out, ease-in-out);
  -webkit-tap-highlight-color: transparent;
}
@keyframes dsh-web-mobile-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  [data-mobile-nav="backdrop"] {
    animation: none !important;
    transition: none !important;
  }
}
/* Settings sheet entrance: slight rise/scale (no opacity — avoids drawer bleed). */
@keyframes dsh-web-mobile-sheet-in {
  from {
    transform: translateY(14px) scale(.98);
  }
  to {
    transform: none;
  }
}
`,
			`/* ---------- mobile-only layout (narrow viewport AND touch-primary pointer) ---------- */

@media (max-width: 1023px) and (pointer: coarse) {
  /* --- Phone chrome ---
     The system status bar stays visible (no fullscreen). Three adjustments
     make it behave:
     - touch-action: pan-y pinch-zoom kills double-tap-to-zoom (and the 300ms
       tap delay) while keeping vertical pan. Omitting pan-x (i.e. not using
       the manipulation alias) forbids HORIZONTAL pan on the root: a
       left-edge horizontal drag would otherwise be claimed by the browser as
       a pan (firing pointercancel) before the sidebar swipe layer can
       classify it. touch-action does not inherit and the behavior
       intersection stops at the first scroll container, so only touches
       landing directly on the root background are affected — inner
       horizontal scrolling of content containers is untouched. pinch-zoom is
       listed on purpose (#45): a bare pan-y also drops pinch, and then a
       zoom the browser applied by itself — iOS enlarges the viewport when a
       field under 16px takes focus — can no longer be undone by the user,
       so the app stays magnified until it is reopened or rotated. Two-finger
       zoom is also the WCAG 1.4.4 escape hatch and costs the gesture layer
       nothing: pinch is not a horizontal pan.
     - overscroll-behavior-x: none suppresses the browser's edge history
       navigation on the root scroller — Android Chrome claims a horizontal
       stroke that STARTS within its edge band (EDGE_WIDTH_DP=48dp,
       NavigationHandler.java) and navigates BACK, the exact gesture that
       opens the drawer. Only html/body count for this (Chromium issue
       41483088: inner containers are ignored by the navigation path).
       iOS Safari's edge back-swipe has no CSS opt-out (WebKit bug 240183)
       — there the widened gesture start zone (START_ZONE_RATIO 0.45 of the
       viewport width, ~176px at 390px, past every browser's edge-claim strip)
       is the mitigation.
     - With the client's viewport-fit=cover, env(safe-area-inset-top) is the
       status bar / notch height; the rules below push the app content below
       it so the status bar never covers anything. Off notched phones (or in
       a normal browser tab where the layout viewport already sits below the
       status bar) the inset is 0 and nothing shifts. */
  html,
  body {
    touch-action: pan-y pinch-zoom !important;
    overscroll-behavior-x: none !important;
  }

  /* AppFrame: the drawer takes the sidebar column out of grid flow, so the
     remaining in-flow items (center, details) land in tracks 1..2: give the
     center every pixel and keep the details track at zero. The top padding
     clears the status bar / notch for every in-flow surface (session header,
     messages, composer); the absolutely-positioned drawer is unaffected (its
     containing block is the frame's padding box, i.e. still the frame top).
     box-sizing MUST be border-box: the official frame is height:100% of a
     100%-height body, and it is content-box by default, so the safe-area
     padding is ADDED on top of the full viewport height. The frame then grows
     to 100% + inset, the document itself becomes scrollable by exactly the
     inset, and the sticky composer seat (bottom:0 of the scroll body) lands
     below the visual viewport. Symptoms on a notched phone: the whole UI can
     be swiped up, the composer lifts off the bottom leaving a blank strip,
     and the newest message sits under the composer because the host's
     at-bottom follow scrolls its own scroll body, not the document. With
     border-box the padding is taken out of the 100% height instead, so the
     frame is exactly one viewport tall and the document never scrolls.

     Leading html raises specificity above @linxin666/dsh-web-all's equal
     !important grid-template-columns under (max-width: 768px), so cascade
     no longer depends on sheet injection order. */
  html [data-mobile-nav="frame"] {
    box-sizing: border-box !important;
    position: relative !important;
    grid-template-columns: minmax(0, 1fr) 0 0 !important;
    padding-top: env(safe-area-inset-top, 0px) !important;
  }

  /* The sidebar column (first grid child) becomes a left drawer. The drawer
     hugs the sidebar content exactly (the wide sidebar carries an inline
     width, ~280px): a fixed 92vw box would leave a white strip where the
     container background shows beside the content.
     Closed state: translateX(-110%) — more than -100% of the max-content
     width — guarantees the whole drawer (and its shadow, had it one) leaves
     the viewport. A mere -100% leaves a sliver on screen; -105% (as used
     before) left 14px of the drawer plus a long 32px-blur shadow gradient
     visible along the left edge of the main UI. No box-shadow at all: the
     dimmed backdrop already separates drawer from content. */
  /* Prefer this plugin drawer over the host overlay (host has no full-screen
     backdrop). z-index 1300 / backdrop 1250 sit above the host sidebarCol
     (1100); lower values left a dimmed frame with an unclickable drawer. */
  [data-mobile-nav="frame"] > :first-child {
    position: absolute !important;
    inset: 0 auto 0 0 !important;
    /* !important: host sets sidebar width min(88vw, 320px) !important.
       Cap at 280px — the inner surface is a fixed 280px box; narrower clips. */
    width: min(88vw, 280px) !important;
    /* Keep in sync with backdrop z in base.css (must stay above host 1100). */
    z-index: 1300 !important;
    transform: translateX(-110%);
    transition: transform .28s var(--ds-ease-in-out, ease-in-out);
    /* Absolute drawer misses the frame's safe-area padding; apply it here. */
    padding-top: env(safe-area-inset-top, 0px) !important;
    border-right: none !important;
    /* Match the 280px inner surface colour so the wider column's right band
       does not show as a white strip. */
    background: var(--dsw-alias-bg-surface, #f9fafb);
    /* Drop pan-x so horizontal pointermove reaches the swipe layer; keep
       pinch-zoom with the root (#45). See sidebar-swipe gestures docs. */
    touch-action: pan-y pinch-zoom !important;
  }

  /* Match host collapsed specificity so width/transform animate; otherwise
     the closed pane stays a 52px shell with transform:none. */
  [data-mobile-nav="frame"][data-sidebar-collapsed] > :first-child {
    width: min(88vw, 280px) !important;
    transform: translateX(-110%) !important;
  }

  /* Expanded state (frame without data-sidebar-collapsed) slides the drawer in.
     The open state must be transform:none — NOT translateX(0): an identity
     transform still makes the drawer the containing block for fixed-position
     descendants (the settings dialog's .VOzbGW_overlay is portaled into the
     sidebar DOM). With the identity transform the wide settings sheet
     (100vw-16) overflows the 280px drawer, the dialog's focus scrolls the
     overflow:hidden drawer to scrollLeft=102, and every static child (plus the
     fixed overlay) shifts 102px off-screen. With transform:none the overlay is
     viewport-anchored: it dims the full screen and the sheet sits at left:8. */
  [data-mobile-nav="frame"]:not([data-sidebar-collapsed]) > :first-child {
    transform: none !important;
  }


  /* The host's own drawer handle. It renders the branded fish glyph (a 24x17
     path in a 23.16x17.04 viewBox) and the phone owner reads it as a stray
     "whale" sitting at the very top-left of the header: measured [10,14,44,44]
     against our own toggle at [8,12,28,28], i.e. the two overlap in the same
     corner. It also duplicates what our toggle already does, so on the mobile
     branch it is removed. The selector keys on the host's own label - the
     element carries no distinguishing class (hHd-Xa_iconButton is shared with
     every other icon button, and the label flips to "Collapse sidebar" when the
     drawer is open, which is why the attribute prefix matches both states and
     both get removed). Nothing in this plugin queries that element; the drawer
     still opens from our toggle, the edge swipe, and closes by tapping the
     backdrop or swiping it away. */
  /* Competing with @linxin666/dsh-web-all's mobile sidebar-toggle show rule
     (same (0,4,0) + !important). Leading html lifts us to (0,4,1) so the
     outcome does not depend on sheet injection order. Hash-class and
     aria-label fallbacks cover hosts without the responsive-part hook. */
  html [data-mobile-nav="frame"][data-sidebar-collapsed] [data-pane="sidebar"] [data-dsh-responsive-part="sidebar-toggle"],
  html [data-mobile-nav="frame"] [data-dsh-responsive-part="sidebar-toggle"],
  html [data-mobile-nav="frame"] [class*="hHd-Xa_toggle"]:is([aria-label*="sidebar" i], [aria-label*="侧边栏"]),
  /* The label-only fallbacks MUST stay scoped to the seats the host's own
     drawer handle can live in. Unscoped they match by aria-label substring,
     and the session row's menu carries a localized "session operations"
     label that includes the title — so any session whose title contains
     the Chinese drawer word (or "sidebar") lost its menu entirely
     (rowActions display:none). Anchor them to the frame's leading seat and
     to the header's leading cell instead. */
  html [data-mobile-nav="frame"] [data-conversation-header-leading] button[aria-label*="sidebar" i],
  html [data-mobile-nav="frame"] [data-conversation-header-leading] button[aria-label*="侧边栏"],
  html [data-mobile-nav="frame"] [data-shell-leading] button[aria-label*="sidebar" i],
  html [data-mobile-nav="frame"] [data-shell-leading] button[aria-label*="侧边栏"] {
    display: none !important;
  }

  /* Fullscreen Files panel is position:fixed; inset:0 with no safe-area of
     its own, so its top tab strip sits under the status bar. Frame padding
     cannot reach a viewport-fixed element — apply safe-area as padding-top
     on the panel only. Skip the docked (push) form: it already lives in the
     frame padding box and would double-pad. */
  [data-sidebar-right-panel="fullscreen"] {
    padding-top: env(safe-area-inset-top, 0px) !important;
  }

  /* prefers-reduced-motion: drop the drawer's .28s slide (same idiom as the
     animation:none blocks below). */
  @media (prefers-reduced-motion: reduce) {
    [data-mobile-nav="frame"] > :first-child {
      transition: none !important;
    }
  }

  /* Drag handles are useless on touch and would float over the drawer. */
  [data-side="sidebar"],
  [data-side="details"] {
    display: none !important;
  }

  /* --- Conversation text on mobile ---
     The official message flow keeps desktop's 32px side gutters and 16px
     type. On a phone: shrink the type a notch and widen the lines by
     trimming the gutters (the sidebar drawer list keeps its size). The
     flow's scroll container holds the markdown <p> paragraphs; since
     DSH 0.1.2-rc.1 the composer is a Lexical contenteditable that also
     renders real <p> paragraphs inside its own _scroll container, so the
     composer must be excluded explicitly via
     :not(:has([data-composer-input])). */
  /* The official main scroll body reserves scrollbar-gutter for desktop
     scrollbars (8px), which shoves every column off-center on a phone.
     Classic desktop scrollbars (Edge/Chrome) also occupy ~8-17px in a
     phone-sized viewport, shifting the column further. Mobile scrolling
     is touch/wheel, so remove the scrollbar entirely on phones: the
     column is then exactly centered in every browser. */
  [data-phase] [class*="_scrollBody"] {
    scrollbar-gutter: auto !important;
    scrollbar-width: none;
  }
  [data-phase] [class*="_scrollBody"]::-webkit-scrollbar {
    display: none !important;
    width: 0;
    height: 0;
  }
  /* Message action rows (copy / run-time badges) can overflow the right
     edge on narrow screens — keep them inside the message width. */
  [data-phase] [class*="_actions"] {
    overflow: hidden;
  }
  [data-phase] [class*="_actions"] [class*="_timeEnd"] {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap !important;
  }

  /* Touch: suppress action-row tooltip bubbles (icons already flip to a
     check). Keep scope on _actions — unscoped _bubble hid user/goal message
     bubbles in _userStack/_row. role="tooltip" stays globally suppressed for
     sticky-residue cleanup. */
  @media (hover: none), (pointer: coarse) {
    [data-phase] [role="tooltip"],
    [data-phase] [class*="_actions"] [class*="_bubble"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  }

  [data-phase]
    [class*="_scroll"]:not([class*="_scrollBody"]):not(:has([data-composer-input])):has(p) {
    padding-left: 20px;
    padding-right: 20px;
    /* Message text follows the host's own font-size axis (Settings → content
       size) instead of a frozen phone constant. The host writes the user's
       choice to <body> as --dsh-content-font-size and derives the longhand
       token --dsw-font-markdown-base-font-size from it; the previous 15px
       !important cut that chain at the container, so settings 12-17 did
       nothing for message text while the host's own markdown blocks still
       moved — two sizes mixed in one column (#52). Read the longhand token
       only: the other token ending in -base is the font shorthand, an
       invalid font-size value that the parser drops and the cascade silently
       falls back on. The fallback chain ends at the host's own default
       axis value. */
    font-size: var(--dsw-font-markdown-base-font-size, var(--dsh-content-font-size, 14px)) !important;
  }
  /* Descendants only inherit: the host already resolves the same token on its
     own markdown blocks (and its styles pin 16px on paragraphs / list items),
     so a rule per p / li / user-message text would cut the axis a second time. */
  [data-phase]
    [class*="_scroll"]:not([class*="_scrollBody"]):not(:has([data-composer-input])):has(p) p,
  [data-phase]
    [class*="_scroll"]:not([class*="_scrollBody"]):not(:has([data-composer-input])):has(p) li,
  [data-phase]
    [class*="_scroll"]:not([class*="_scrollBody"]):not(:has([data-composer-input])):has(p) [
      class*="_text_"
    ] {
    font-size: inherit !important;
  }

  /* Markdown tables: the official table uses width:max-content, so on a phone
     it hugs the content and leaves dead space beside/inside the table. Force
     the table to fill the message column and let the table wrapper handle
     overflow if a cell is genuinely too wide. */
  [data-phase] table {
    width: 100%;
    max-width: 100%;
  }
  [data-phase] th,
  [data-phase] td {
    max-width: none;
    min-width: 0;
  }

  /* Markdown images: the official rule often forces width:100%, which
     upscales small square images to the full message column. Show small
     images at their intrinsic size; large / very wide images still scale
     down to fit the column (max-width:100% keeps horizontal panoramas
     adaptive without overflowing). */
  [data-phase] [class*="_scroll"]:not([class*="_scrollBody"]) img {
    width: auto !important;
    max-width: 100% !important;
    height: auto !important;
    /* Cap square / tall images so a big sticker does not dominate the
       narrow column; landscape images stay governed by max-width only.
       The plain px line is the fallback for engines without dvh. */
    max-height: 220px !important;
    max-height: min(40dvh, 220px) !important;
  }

  /* User bubbles: the official stack is capped at min(525px, 82%), which on a
     phone leaves a large blank strip on the left and pushes the bubble high.
     On mobile let the user message fill the same full width as assistant
     messages (the bubble background then spans the whole message column). */
  [data-phase] [class*="_userStack"],
  [data-phase] [class*="_userStack"] [class*="_bubble"] {
    box-sizing: border-box;
    width: fit-content;
    max-width: 100%;
  }

  /* --- Composer bottom row on mobile ---
     The official row contains two lanes: tools (plus + permission/mode
     controls) and trailing (model + context + send). The previous rules made
     the modes lane flex:none, so its full intrinsic width collided with the
     model selector on narrow phones. Keep fixed hit targets fixed, but let
     text-bearing controls shrink and ellipsize before they paint over the
     trailing lane. */
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) {
    box-sizing: border-box;
    container-type: inline-size;
    container-name: dsh-mobile-composer;
    flex-wrap: nowrap;
    /* Right cluster: tighten lane gap to 3px (control padding — not gap —
       was the main visual spacing; pairs with model-chip padding below). */
    gap: 3px;
    padding-left: 6px;
    padding-right: 6px;
    /* The dropdown menu is absolutely positioned inside this row; any
       overflow: hidden here would clip it. Inner lanes keep their own
       overflow clipping, so the row itself can stay visible. */
    overflow: visible;
  }
  /* Dual-primary form (subagent view: stop + send). The four-control
     cluster [model][meter][stop][send] overflows the single-row lane the
     nowrap rule above enforces; the model pill is the only shrinkable
     item, so it collapses to zero and the fixed trio loses its auto
     margin (all hug the lane's left edge, send may even paint off-view).
     Restore the official wrap for this form only: the trailing lane
     drops to a second full-width row where the four controls always
     fit. Main-session three-control form keeps single-row layout. */
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]):has([class*="_primary"] ~ [class*="_primary"]) {
    flex-wrap: wrap;
  }
  /* Issue #140: in that same dual-primary form the stop key and the send key
     sit one 3px lane-gap apart — two same-shaped 34px pills where a mis-touch
     on the left one interrupts the running reply. The main session's
     [model][send] cluster keeps the 3px weld; only this form (two adjacent
     destructive-adjacent primaries) gets +8px between stop and send.
     Knob: margin-right. */
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]):has([class*="_primary"] ~ [class*="_primary"]) > [class*="_trailing"] > [class*="_primary"]:has(~ [class*="_primary"]) {
    margin-right: 8px;
  }
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > :first-child {
    flex: 0 1 auto;
    min-width: 0;
    /* Tools lane: widen gap to 8px so [+][modes][attach] stay separable after
       modes narrowed ~16px (right cluster stays at 3px). */
    gap: 8px;
    /* The permission dropdown (Menu, side: top) pops upward from inside the
       tools lane; overflow hidden here would crop it, same as the row. Text
       ellipsis is handled by the trigger label itself. */
    overflow: visible;
  }
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_trailing"] {
    flex: 1 1 auto;
    min-width: 0;
    gap: 3px;
    /* Must not clip the model dropdown; the model trigger clips its own label. */
    overflow: visible;
  }
  /* Permission / plan controls share the tools lane inside the a2-style
     'div.modes' container (class survives as 'css.modes'; audit doc §10.1 /
     E-1). The positional anchor '> :first-child > :nth-child(2)' was already
     off-target on rc.2 and dies entirely on a2, so the series re-anchors on
     the tools lane's modes container: '[class*="_tools"] > [class*="_modes"]'
     (live-verified on the rc.2 host: the modes div is a direct child of the
     tools lane, a grandchild of the row — a row-direct-child anchor matches
     nothing on either generation). The permission label uses the remaining
     tools width, while the lower-priority plan slot keeps an icon-sized
     target instead of stealing model width. */
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_tools"] > [class*="_modes"] {
    flex: 0 1 auto;
    min-width: 0;
    max-width: none;
    /* Modes container: drop internal gap (4→0) once the trigger is icon-only. */
    gap: 0;
    /* The permission Menu list (side: top) pops upward out of this lane;
       overflow hidden crops it. The trigger label clips its own text. */
    overflow: visible;
  }
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_tools"] > [class*="_modes"] > [class*="_trigger"] {
    flex: 1 1 auto;
    min-width: 28px;
    max-width: 100%;
    display: flex !important;
    overflow: hidden;
    /* Modes trigger padding/gap are text leftovers; zero them once icon-only
       (~44px box → ~34px). */
    padding: 0 !important;
    gap: 0 !important;
  }
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_tools"] > [class*="_modes"] > [class*="_trigger"] > [class*="_triggerLabel"] {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap !important;
  }
  /* Slot wrappers such as the live plan chip are not trigger elements. Do
     not force them into an icon-sized box: their child button would overflow
     that wrapper and paint over PermissionSelect. Keep the wrapper intrinsic;
     the model lane below is the one that sacrifices width. */
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_tools"] > [class*="_modes"] > :not([class*="_trigger"]) {
    flex: 0 1 auto;
    min-width: 34px;
    max-width: max-content;
    overflow: visible;
  }
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_tools"] > [class*="_modes"] > [class*="_wrap"] > [class*="_chip"] {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap !important;
  }
  @container dsh-mobile-composer (max-width: 359px) {
    [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_tools"] > [class*="_modes"] > [class*="_trigger"] > [class*="_triggerLabel"] {
      display: none !important;
    }
  }
  /* Permission trigger (dsh-client-ui-permission-presets, iWlSmW_ hash) ships
     padding:0 4px 0 8px + gap:4px for a text label. Zero them once icon-only.
     A display:contents wrapper sits between _modes and the root, so a direct
     child (_modes > _trigger) never matches — use a hashed descendant; if the
     hash changes the rule dies cleanly instead of hitting unrelated UI. */
  [data-mobile-nav="frame"] [data-phase] [class*="iWlSmW_trigger"] {
    padding: 0 !important;
    gap: 0 !important;
  }
  /* Permission icon: host locks _triggerIcon svg at 14px; bump to 16px to
     match + / attach. Only the icon wrapper — chevron is outside it.
     Box stays 28×28. NOTE: this file is a JS template string — never put a
     backtick inside a comment (it would split the CSS). */
  [data-mobile-nav="frame"] [data-phase] [class*="iWlSmW_triggerIcon"] svg {
    width: 16px !important;
    height: 16px !important;
  }

  /* Model selector: flexible and shrinkable, but never clipped.
     The root must be overflow:visible so the dropdown menu can render.
     The trigger itself clips the label text. */
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_root"]:has(> [class*="_trigger"][aria-haspopup="menu"]) {
    flex: 0 1 auto;
    min-width: 0;
    overflow: visible;
  }
  @container dsh-mobile-composer (max-width: 359px) {
    [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_root"]:has(> [class*="_trigger"][aria-haspopup="menu"]) {
      flex-basis: auto;
    }
  }
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_root"]:has(> [class*="_trigger"][aria-haspopup="menu"]) > [class*="_trigger"] {
    display: flex !important;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
  }
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_root"]:has(> [class*="_trigger"][aria-haspopup="menu"]) > [class*="_trigger"] > [class*="_triggerLabel"] {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap !important;
  }
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_root"]:has(> [class*="_trigger"]):not(:has(> [class*="_trigger"][aria-haspopup="menu"])) {
    flex: 0 0 auto;
  }

  /* Model menu is portaled to <body>; positioning is in model-menu-anchor.ts.
     Do not re-add a CSS child-chain rule without checking the portal parent. */

  /* --- Fix composer row overflow at narrow widths (320px-360px) ---
     Force every direct child of the tools and trailing lanes to shrink,
     so they can fit within the available space without causing horizontal
     overflow. The fixed-size icon buttons are exempt: officially both are
     flex:none at a fixed size (plus 28x28, send 34x34) and must stay put,
     not participate in adaptation. */
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > :first-child > :not([class*="_add"]) {
    flex-shrink: 1;
    min-width: 0;
  }
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_trailing"] > :not([class*="_primary"]) {
    flex-shrink: 1;
    min-width: 0;
  }
  /* Pin the plus button at the left edge of the tools lane: official
     flex:none 28x28, never squeezed by narrower viewports. */
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > :first-child > [class*="_add"] {
    flex: none;
  }
  /* The context meter in the trailing lane is another fixed-size icon
     control: its trigger is officially width:28px flex:none, but the root
     itself is shrinkable, so a squeezed root lets the trigger paint over
     the pinned send button. Keep the whole meter at its natural size; its
     trigger uses aria-haspopup="dialog", so the model-selector menu rules
     (keyed on "menu") still do not apply.
     On 0.1.7-rc.2+ the meter moved to the dock row (rules below); these
     trailing-lane anchors stay for 0.1.5/0.1.6 hosts. */
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_trailing"] > [class*="_root"] {
    flex: none;
    min-width: 0;
  }
  /* --- Right cluster flush-right (re-anchored after icon-only model chip) ---
     Host parks model seat / mic / send in a growable trailing lane and relies
     on margin-left:auto on a lane member to push the cluster right. The old
     absorber targeted the model root, but 0.1.7 nests root inside
     standardControls (flex item) via display:contents, so auto on root no
     longer absorbs lane slack. Re-anchor to the lane's first flex item, and
     only while the model seat is present (host clears primary's auto then —
     two autos would split the gap). Without the model seat, primary's own
     auto still finishes the row. justify-content:flex-end is the fallback
     when the first child is display:none and auto has nowhere to attach. */
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_trailing"]:has([class*="_trigger"][aria-haspopup="menu"]) {
    justify-content: flex-end;
  }
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_trailing"]:has([class*="_trigger"][aria-haspopup="menu"]) > :first-child {
    margin-left: auto;
  }
  /* ContextMeter spacing before the send key (tune margin-right only).
     Anchor on aria-haspopup="dialog" so hash renames cannot unhook it. */
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_trailing"] > [class*="_root"]:has(> [class*="_trigger"][aria-haspopup="dialog"]) {
    margin-right: 0px;
  }
  /* The model pill joins the same right cluster: its margin-left:auto absorbs
     ALL trailing slack, so the adaptive void sits between the tools lane and
     the pill (visible on wide phones/tablets), while [pill][meter][send] stay
     welded together at the right edge on every width. Descendant combinator
     on purpose: the pill root sits behind a display:contents wrapper, so a
     direct-child combinator silently misses (probe-verified). Within the
     trailing lane aria-haspopup="menu" belongs to the model trigger alone. */
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_trailing"] [class*="_root"]:has(> [class*="_trigger"][aria-haspopup="menu"]) {
    margin-left: auto;
    margin-right: -4px;
  }
  /* Grow only the invisible trigger BOX, never the ring ink: 24x24 -> 28x34.
     The WIDTH is capped at 28 by pure geometry, not by taste: the box is
     centred on the ink, and the primary key's hit box begins 14px right of the
     ink's centre, so 28 is the widest box that can reach that boundary without
     stealing a single pixel from the destructive key (the current 1px sliver
     is the spacing knob on the root rule above); the same arithmetic puts the
     left edge on the model pill's edge. The 34px HEIGHT is free: the primary
     key is already the tallest control in the lane, so the box cannot overlap
     anything vertically and the row height does not move. Hit area 576 -> 952
     square px (+65%) with the ink within 1px of its old spot (probe-asserted),
     and the ring's ink stays at its official 14px -- enlarging it is rejected
     as attention-grabbing. Knob: height can drop to 28 if the tap halo should
     be a circle rather than a stadium. */
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_trailing"] > [class*="_root"]:has(> [class*="_trigger"][aria-haspopup="dialog"]) > [class*="_trigger"] {
    width: 28px;
    height: 34px;
    padding: 0;
  }
  /* Trailing slack: model pill > meter > send. Exactly one margin-left:auto
     so the gap sits before the right cluster. Without a model seat, the meter
     absorbs; send's auto only when neither is present. */
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_trailing"]:not(:has([class*="_trigger"][aria-haspopup="menu"])) > [class*="_root"]:has(> [class*="_trigger"][aria-haspopup="dialog"]) {
    margin-left: auto;
  }
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_trailing"] > [class*="_primary"] {
    flex: none;
    margin-left: auto;
  }
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_trailing"]:has([class*="_trigger"][aria-haspopup="menu"], > [class*="_root"] > [class*="_trigger"][aria-haspopup="dialog"]) > [class*="_primary"] {
    margin-left: 0;
  }

  /* --- ContextMeter hit area on 0.1.7-rc.2+ (issue #140) ---
     Official trigger is undersized for touch; expand with a transparent
     ::after (26×26 via inset -4px). Ring size/track live in compat.css.ts.
     Dock has only this dialog trigger, so the aria-haspopup anchor is safe. */
  [data-phase] [class*="_dock"] [class*="_trigger"][aria-haspopup="dialog"] {
    position: relative;
  }
  [data-phase] [class*="_dock"] [class*="_trigger"][aria-haspopup="dialog"]::after {
    content: '';
    position: absolute;
    inset: -4px;
  }

  /* --- Third-party model seats (issue #60: @hytime/dsh-thinking-effort) ---
     A seat registered on conversation.input.model replaces the official pill,
     so the trailing lane no longer contains an aria-haspopup="menu" trigger:
     the pill absorber rule above never matches, and the meter fallback below
     would split the slack with the seat (two auto margins share it), leaving
     the seat stranded mid-lane. Worse, in the seat's open state the root's
     only child is the absolutely positioned panel, so the root collapses to
     zero width and the panel's right:0 anchor (width min(336px, 100vw - 32px))
     sweeps 336px leftward from wherever the stranded root sits — 230px off
     screen at 393px (reporter-measured: root x=106, panel left=-230; with our
     stylesheet disabled the root sat at x=339 and the panel at +3, which pins
     the blame on our injection). Both repairs anchor on the plugin's own
     stable data-seat-* markers (identical across v0.2.3-v0.3.7) and leave the
     official pill untouched:
     1. the seat root stretches across the trailing lane with its content
        pushed to the right edge, so the closed chip welds onto the
        [meter][send] cluster AND the grown root consumes all free space,
        which zeroes the meter fallback's margin-left:auto (flexible lengths
        resolve before auto margins — no double void). The root is also made
        position:static so the panel below anchors to the composer card
        instead — the root is 0-width while the panel is open, so any
        root-relative offset is meaningless;
     2. while the panel is open its anchor is laid over the composer card
        (left:0/right:0 against the card's padding box + an auto-margin
        centre), so the panel is centred on the card, never rides the
        collapsed root and never leaves the viewport.

     ── 2026-10-04, thinking-effort 0.3.7: the old centring recipe had to go ──
     Repair 2 used to be 'left:50%; right:auto; transform:translateX(-50%)'.
     That recipe only worked while the plugin positioned nothing itself: a
     mobile viewport left the panel hanging off whichever edge the collapsed
     root sat near. 0.3.7 added its own narrow-screen clamp, which writes an
     INLINE 'left' (390px phone, new chat: root x=122, inline left=-106px —
     i.e. 16px, exactly the right place). Inline 'left' wins over the
     stylesheet, so the recipe's 'left' became dead weight while its
     'transform' kept firing, shifting the panel half its width further left:
     x = 122 + (-106) + (-168) = -152px, off screen by 152px — the reproduced
     bug. Two layers each half-applied. The fix keeps repair 1 (the stretch
     is still what welds the closed chip onto the [meter][send] cluster) and
     replaces repair 2 with the card-anchored recipe above; 'transform:none'
     is what neutralises the stray translateX, and 'left:0' is '!important'
     because it must beat that inline value. Panel width stays the plugin's
     own (336px, capped at 100%) so the Off/High/Max ticks keep their
     designed spacing.

     The panel opens bottom:calc(100% + 8px) above the card, but the card is
     only 70-108px tall on a phone while the panel is 208px, so it always
     overflows upward — that is the plugin's own desktop behaviour and is
     kept. What is NOT acceptable is overflowing the VIEWPORT, so three
     guards follow (the inner listbox, the keyboard-short phone, landscape).
     Every guard stays inside this mobile media query: desktop untouched. */
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_trailing"] [data-seat-root] {
    flex: 1 1 auto;
    justify-content: flex-end;
    /* Keep parked here rather than in a second rule: the panel below anchors
       to the card, not to this root. */
    position: static !important;
  }
  [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_trailing"] [data-seat-root] > [data-seat-panel] {
    left: 0 !important;
    right: 0 !important;
    max-width: min(100%, 420px) !important;
    transform: none !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }

  /* Guard 1 — the panel's inner model listbox opens upward (bottom:58px
     inside the panel) with max-height:min(220px, 100vh - 96px). On a short
     screen that ceiling is taller than the room above the panel, so the
     listbox pokes past the viewport top (320x568: menu y=-41). Clamp it to
     half the viewport minus the panel's own 58px offset + padding. */
  @media (max-height: 700px) {
    [data-seat-model-menu] {
      max-height: min(220px, calc(50vh - 110px)) !important;
    }
  }

  /* Guard 2 — with the on-screen keyboard up (portrait, ≤505px tall) there
     is not even 208px of room above the card. Let the whole panel scroll
     inside itself instead of escaping the top; children keep their natural
     height so the slider and its ticks are never squashed. */
  @media (orientation: portrait) and (max-height: 505px) {
    [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_trailing"] [data-seat-root] > [data-seat-panel] {
      max-height: calc(50dvh - 45px) !important;
      overflow-y: auto !important;
      overscroll-behavior: contain !important;
    }
    [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_trailing"] [data-seat-root] > [data-seat-panel] > * {
      flex: 0 0 auto !important;
    }
  }

  /* Guard 3 — landscape: above the card there are only ~156px (the card
     sits low, the panel is 208px), so an upward opening can never fit.
     Detach the panel into a bottom-docked sheet instead; it floats clear
     of the card and the viewport top. */
  @media (orientation: landscape) {
    [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) > [class*="_trailing"] [data-seat-root] > [data-seat-panel] {
      position: fixed !important;
      left: 16px !important;
      right: 16px !important;
      bottom: 12px !important;
      top: auto !important;
      transform: none !important;
      margin: 0 auto !important;
      max-width: min(100%, 420px) !important;
    }
  }

  /* --- Composer file entry (0.1.6 host) ---
     The 0.1.6-alpha.2 host deleted the composer's paperclip attach button, so
     the only built-in file entry left is the Files row inside the "+" listbox.
     This control fills conversation.input.left beside the plus button: fixed
     hit target (never part of adaptive shrink). Click triggers the host's
     hidden input[type=file] so validation/upload stay host-owned. */
  [data-composer-card] [data-mobile-nav="file-upload"] {
    flex: 0 0 auto !important;
    /* Attach hit target 28→34 (aligned to send height); ::after adds ~4px more
       (~42×42). margin-left adjusts so the icon center stays put. */
    width: 34px !important;
    min-width: 34px !important;
    max-width: 34px !important;
    height: 34px !important;
    min-height: 34px !important;
    padding: 0 !important;
    position: relative !important;
    /* Nudge attach left (~10px) and grow icon 14→16 so [+][modes][attach]
       reads as one tools group; margin-left is the only left-nudge knob. */
    margin: 0 0 0 -11px !important;
    display: grid !important;
    place-items: center;
    border: 0 !important;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  /* Pressed/hover capsule: host tools use a grey pill; ours was transparent.
     Use the host hover token for parity. */
  /* Draw the visible 28×28 capsule on ::before only; the button box stays
     34×34 + ::after hit expand — large target, compact look. */
  [data-composer-card] [data-mobile-nav="file-upload"]::before {
    content: '';
    position: absolute;
    inset: 3px;
    border-radius: 999px;
    background: transparent;
    transition: background .12s ease;
  }
  [data-composer-card] [data-mobile-nav="file-upload"]:hover::before,
  [data-composer-card] [data-mobile-nav="file-upload"]:active::before {
    background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06));
  }
  /* Kill the default blue tap highlight on header controls. Host header
     packages lack :active / -webkit-tap-highlight-color; transparent highlight
     lets their :hover/:active tokens provide press feedback (same approach
     as the composer file-upload rules above). */
  /* Cover button, [role=button], and tabindex controls — host is not always
     a native <button>. */
  [data-mobile-nav="frame"] [data-phase] header button,
  [data-mobile-nav="frame"] [data-phase] header [role="tab"],
  [data-mobile-nav="frame"] [data-phase] header [role="menuitem"],
  [data-mobile-nav="frame"] [data-phase] header [role="button"],
  [data-mobile-nav="frame"] [data-phase] header [tabindex],
  [data-composer-card] button,
  [data-composer-card] [role="button"],
  [data-composer-card] [tabindex] {
    -webkit-tap-highlight-color: transparent;
  }
  /* Header press feedback: host packages expose :hover only. Prefer a
     geometry-neutral darken (opacity ~.92) over painting a full-button
     background — the box is wider than the visible chip and a solid fill
     spilled under neighboring chips. Avoid position/pseudos that would
     move the containing block for host popovers. */
  [data-mobile-nav="frame"] [data-phase] header button:active,
  [data-mobile-nav="frame"] [data-phase] header [role="tab"]:active {
    filter: brightness(.92);
  }
  /* Header chevron rotation: the agent-preset chip flips via rules under
     the DSHA preset section (search data-dsha-agent-preset="header"
     svg:last-of-type). Correction note — an earlier claim that WebView
     ignores CSS transform on that svg was wrong: our own
     [data-dsha-agent-preset="header"] > svg { transform: none !important }
     was beating an inline rotate without !important. Subagent chevron is
     host-owned (triggerOpen class). Do not write blanket header svg /
     [class*=chevron] rules — they clobber the subagent open state. */
  /* Do not add press capsules on host-rendered composer tools — they already
     ship :hover fills; stacking ours doubles the grey. Exception: our
     injected attach control ([data-mobile-nav="file-upload"]) has no host
     fill, so its capsule rules above stay. */
  /* Hit-area expand: ::after participates in hit-testing with no visual change. */
  [data-composer-card] [data-mobile-nav="file-upload"]::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 12px;
  }
  /* A busy submit phase or a subagent session refuses attachments. The host
     gates intake on canAcceptDrop (package-private), so this reads the closest
     observable facts — input phase and subagent — and keeps the control from
     opening a dialog the host would then reject. */
  [data-composer-card] [data-mobile-nav="file-upload"]:disabled {
    opacity: 0.38;
    cursor: default;
  }
  /* Hide the file-upload control when the host has no input[type=file]
     (rc hosts are paste/drop only); otherwise the click is a silent no-op. */
  [data-composer-card]:not(:has(input[type=file])) [data-mobile-nav="file-upload"] {
    display: none !important;
  }

  /* --- Composer vertical slack on mobile (0.1.6 host) ---
     The host's own .card padding-top:8px + gap:12px and .row padding leave 29px
     of pure blank space in a 98px single-line card. Only vertical slack is
     trimmed; horizontal padding and both hit targets stay untouched. Scoped
     to the active phase on purpose: the hero composer's input carries the
     host's own min-height floor, and trimming it there re-creates the
     clip/scrollbar defect recorded under Pitfalls (hero input floor). */
  /* Composer card vertical slack: host conversation card/row padding leaves
     ~29px blank in a 98px single-line card. Trim vertical only (card ~98→78,
     editor 36→32, tool row 42→36); keep horizontal padding and 28/34 hit
     targets; multi-line growth (max-height 336px) unchanged. */
  [data-mobile-nav="frame"] [data-phase="active"] [data-composer-card] {
    padding-top: 2px !important;
    gap: 4px !important;
  }
  [data-mobile-nav="frame"] [data-phase="active"] [data-composer-card] [class*="_row"] {
    padding: 0 8px !important;
  }
  [data-mobile-nav="frame"] [data-phase="active"] [data-composer-card] [data-composer-input],
  [data-mobile-nav="frame"] [data-phase="active"] [data-composer-card] [class*="_scroll"] {
    min-height: 28px !important;
    padding-top: 2px !important;
  }
  /* --- Session header on mobile ---
     Keep the host-owned metadata in one responsive row. The conversation
     title, the mode text and the running/subagent status all keep their
     words; the one tenant that yields width when a phone runs out of it is
     the background-job trigger's verbose label ("1 background job running"),
     while Files keeps its hit area. */
  /* !important is required: the host sets conversation-header
     padding-left: 60px !important under ≤768px. Our toggle already owns the
     left seat, so reclaim that dead space with padding-left: 0. */
  [data-mobile-nav="frame"] [data-phase] header {
    padding-left: 0 !important;
    padding-right: 8px !important;
    position: relative !important;
  }
  /* Keep the hero empty header hidden on phones. Host headerHidden loses to
     the session-controller grid re-show at ≤768px; our (0,3,1) re-hide wins
     without !important (sheet loads last) and removes the stray bottom
     border hairline under the status bar. */
  [data-mobile-nav="frame"] [data-phase] header[class*="_headerHidden"] {
    display: none;
  }
  /* 0.1.6-alpha.2 renamed the hero-empty marker: headerHidden -> headerBlank
     (audit §1 row 3), so the rule above is a dead needle on alpha.2 and this
     one is dead on rc hosts — together they cover both generations. Same
     (0,3,1) shape, same no-!important reasoning as above. */
  [data-mobile-nav="frame"] [data-phase] header[class*="headerBlank"] {
    display: none;
  }
  /* Header popovers must resolve against the positioned header, not the
     28px chip root — otherwise the menu clips off-screen / under overflow.
     Force chip roots in headerActions to position:static. Exclude alpha.2
     hosts (:not(:has(_headerLeading))) where the chip is already absolute
     and this higher-specificity rule would fight that. Both halves load-
     bearing: static chip without a positioned header moves the containing
     block to the frame and the menu leaves the viewport. Scoped to
     headerActions so lineage menus in crumbs stay fixed-anchored. */
  [data-mobile-nav="frame"] [data-phase] header:not(:has([class*="_headerLeading"])) [class*="_headerActions"] [class*="_root"]:not([class*="_switcherRoot"]):has(> button[class*="_trigger"]) {
    position: static !important;
  }
  /* The tab strip is a separate grid item from the title row and does not
     inherit the title row's inset, so after the header padding above went to 0
     it sat flush against the bezel (measured: tablist x=0, first tab 0..30
     while the title starts at 40). Give it the same left inset as the toggle so
     the two rows read as one column. */
  /* ---------- Phone-only header chrome tighten (≤767px + coarse) ----------
     Tighten tabs margin/underline and title-row height. Tablet 768–1023
     keeps upstream mobile layout (same split as the DSHA preset block). */
  @media (max-width: 767px) and (pointer: coarse) {
    [data-mobile-nav="frame"] [data-phase] header [class*="wSkVaW_tabs"] {
      padding-left: 8px !important;
      /* Tabs strip: zero margin-top and pin underline to 5px so title↔tabs
         spacing tightens. Use a descendant selector — a display:contents
         wrapper sits between header and tabs, so header > tabs never matched. */
      margin-top: 0 !important;
      margin-bottom: 0 !important;
    }
    [data-mobile-nav="frame"] [data-phase] header [class*="wSkVaW_tabs"] [class*="wSkVaW_tab"] {
      padding-bottom: 5px !important;
    }
    /* Tabs margin-top comes from a cross-origin App sheet (no readable
       cssRules match). Raise specificity with html + header.wSkVaW_header
       (0,5,1) so !important can win. */
    html [data-mobile-nav="frame"] [data-phase] header.wSkVaW_header [class*="wSkVaW_tabs"] {
      margin-top: -4px !important;
    }
    /* Header grid rows were fixed 40px/36px (DSHA sheet); switch to auto so
       each row hugs content. */
    /* Title row was 40px with a 36px preset chip — drop the 4px dead space via
       auto + min-height:0 (do not hardcode 36; taller chips must fit). */
    html [data-mobile-nav="frame"] [data-phase] header.wSkVaW_header [class*="wSkVaW_titleRow"] {
      height: auto !important;
      min-height: 0 !important;
    }
    /* Tab buttons: drop top padding (text was vertically centered with spare
       space); bottom padding stays 5px for the underline. */
    html [data-mobile-nav="frame"] [data-phase] header.wSkVaW_header [class*="wSkVaW_tab"] {
      padding-top: 0 !important;
      align-self: flex-end !important;
    }
  }
  /* Title inset lives only in header padding + the title row's own
     padding-left:40px. Extra negative margin over-corrects past the left edge. */

  [data-mobile-nav="frame"] [data-phase] header > :first-child {
    display: flex !important;
    align-items: center;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    gap: 2px;
    /* Just enough for the toggle (28px at left:8 -> right edge 36) plus 4px of
       breathing room; the host's 60px rail reservation is neutralised above. */
    padding-left: 40px;
  }
  [data-mobile-nav="frame"] [data-phase] header > :first-child > :first-child {
    display: flex !important;
    align-items: center;
    flex: 1 1 auto;
    min-width: 0;
    gap: 2px;
  }
  /* The directory toggle stays at the far left of the header. */
  [data-mobile-nav="toggle"] {
    position: absolute !important;
    left: 8px !important;
    top: 12px !important;
    z-index: 2 !important;
  }
  /* Pin the files opener to the header's right corner (mirror of the left
     toggle). In flow the empty utilities seat keeps it short of that corner;
     absolute positioning reaches right:8 / top:12 and returns its width to
     the title lane. */
  [data-mobile-nav="files"] {
    position: absolute !important;
    right: 8px !important;
    left: auto !important;
    top: 12px !important;
    z-index: 2 !important;
  }
  [data-mobile-nav="frame"] [data-phase] header [class*="_headerActions"] {
    display: flex !important;
    align-items: center;
    box-sizing: border-box;
    flex: 0 1 auto;
    min-width: 0;
    max-width: calc(100% - 32px);
    margin-left: auto;
    justify-content: flex-end;
    gap: 2px;
  }
  /* The title takes the remaining width and never paints outside it; the
     metadata lane's mode text is what shrinks first. */
  /* Floor at 30% so a flex-basis-0 crumb lane keeps a readable title under
     crowded headers (otherwise it can collapse to a single glyph). */
  [data-mobile-nav="frame"] [data-phase] header [class*="_crumbs"] {
    flex: 1 1 0;
    min-width: 30%;
    max-width: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap !important;
  }
  /* Mode label: keep icon and words (only mode switcher on phone). Cap at
     38vw so long preset names stay readable from 320px up and still yield
     to the title on wider screens. */
  [data-mobile-nav="frame"] [data-phase] header [class*="_label"]:has(> svg) {
    order: 1;
    flex: 0 1 auto;
    min-width: 0;
    max-width: min(38vw, 220px);
    display: block;
    position: relative;
    box-sizing: border-box;
    padding-left: 18px;
    padding-right: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap !important;
  }
  [data-mobile-nav="frame"] [data-phase] header [class*="_label"]:has(> svg) > svg {
    position: absolute !important;
    left: 0 !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
  }
  /* Running/subagent controls keep their full status text and hit area; they
     do not give up width to the mode label. NOTE: the real subagent lineage
     root has class="ZKlsPq_root " — a TRAILING SPACE from the plugin's
     template-literal className — so [class$="_root"] never matches it. Use
     [class*="_root"] and exclude the switcher root ([class*="_switcherRoot"])
     so only the count/job roots get pinned (the switcher must stay shrinkable
     so its own title can ellipsize). */
  /* Pin status chips (flex 0 0 auto) with a max-width cap. Shrinkable chips
     clip the count; uncapped max-content eats the flex-basis-0 title.
     Popover containment relies on the positioned header + static chip root
     above — static alone moves the containing block to the frame. */
  [data-mobile-nav="frame"] [data-phase] header [class*="_root"]:not([class*="_switcherRoot"]):has(> button[class*="_trigger"]) {
    order: 2;
    flex: 0 0 auto;
    min-width: 0;
    max-width: min(40vw, 180px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap !important;
  }
  [data-mobile-nav="frame"] [data-phase] header [class*="_root"]:not([class*="_switcherRoot"]):has(> button[class*="_trigger"]) > button {
    min-width: 0;
    max-width: 100%;
  }
  [data-mobile-nav="frame"] [data-phase] header [class*="_root"]:not([class*="_switcherRoot"]):has(> button[class*="_trigger"]) > button > * {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  [data-mobile-nav="frame"] [data-phase] header [class*="_root"]:not([class*="_switcherRoot"]):has(> button[class*="_trigger"]) > button,
  [data-mobile-nav="frame"] [data-phase] header [class*="_root"]:not([class*="_switcherRoot"]):has(> button[class*="_trigger"]) > button * {
    white-space: nowrap !important;
  }
  /* The lineage count's leading "/" (ZKlsPq_separator — official desktop
     chrome rendered only for a root session inside the crumbs) looks like a
     stray extra breadcrumb level on small screens; hide it. The crumbSep "/"
     between ancestry segments (subagent sessions) is a real separator and
     stays. */
  [data-mobile-nav="frame"] [data-phase] header [class*="_crumbs"] [class*="_separator"] {
    display: none !important;
  }
  /* The header's right-hand slot clips its own dropdown away (0.1.5 host bug).
     wSkVaW_headerUtilities is a 44x44 grid cell with overflow:auto, and the host
     mounts its "More actions" menu INSIDE it: the menu is 218x52, so the cell
     clipped it to 44x44 and the menu was never painted and never hit-testable
     (measured: menu rect 156,56 218x52, computed flex/visible/opacity 1, yet
     elementsFromPoint at the item centre returned the view tabs row and nothing
     from the menu). Raising the menu z-index cannot help - the cell's own
     stacking context traps it. Releasing the overflow paints the menu where the
     host positioned it, and the item then works (verified: a real tap opening
     the session-log export dialog, menus 1 -> 0 dialogs 1). Scoped to the mobile
     branch and to this one cell, so desktop keeps the host layout. The section
     is hidden on mobile anyway - the drawer footer carries the same action - but
     the release stays for any plugin that registers a header dropdown here. */
  [data-mobile-nav="frame"] [data-phase] header [class*="wSkVaW_headerUtilities"] {
    overflow: visible !important;
    /* The seat is empty on a phone (its only button is hidden just below) yet
       still 44px tall, which floors the whole title row — see the compact-rows
       block after the tab strip. */
    height: 30px !important;
    min-height: 0 !important;
  }
  [data-mobile-nav="frame"] [data-phase] header [class*="wSkVaW_headerUtilities"] [class*="nL4_yW_moreButton"] {
    display: none !important;
  }
  [data-mobile-nav="frame"] [data-phase] header [data-mobile-nav="files"] {
    width: 28px;
  }
  /* Session log download: gone from the header row on mobile (the utilities
     seat holds only the session-log-export capsule). */
  [data-mobile-nav="frame"] [data-phase] header > :first-child > :last-child {
    display: none !important;
  }
  /* View tabs strip (official [role="tablist"] under the crumbs row).
     Desktop ships a single flex row (gap: 36) sized for the two stock tabs
     (Chat / Trace). Plugins register further views (memory / skill / todo
     panels, per-plugin settings pages), and once the count passes two the
     shrinkable buttons collapse to their min-content: CJK labels stack one
     glyph per line (staircase), latin labels break word-per-line — the
     strip eats a screenful of vertical space (#41). Scroll the strip
     horizontally instead — the standard mobile tab-bar pattern — with every
     label kept whole (flex-shrink: 0 + nowrap). Affordance is the peek: the
     naturally cut-off tab at the right edge says "more this way".
     touch-action: pan-x opts the strip into horizontal panning; the root's
     pan-y intersection stops at this first scroll container.
     overscroll-behavior-x: contain stops a flick from chaining past the
     ends; snap keeps tabs edge-aligned after a fling; scrollbar stays
     hidden like every native tab bar. */
  [data-mobile-nav="frame"] [data-phase] header [role="tablist"] {
    flex-wrap: nowrap;
    gap: 0 16px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
    touch-action: pan-x;
    scrollbar-width: none;
  }
  [data-mobile-nav="frame"] [data-phase] header [role="tablist"]::-webkit-scrollbar {
    display: none;
  }
  [data-mobile-nav="frame"] [data-phase] header [role="tablist"] > button {
    flex-shrink: 0;
    white-space: nowrap;
    scroll-snap-align: start;
  }
  /* Compact session header: host floors both rows at ~44px; cap at 36/32
     (tabs follow). Keep host padding-top so title aligns with corner
     controls. :has(> *) skips the empty hero header. */
  [data-mobile-nav="frame"] [data-phase] header:has(> *) {
    min-height: 0 !important;
    /* Phone: tabs row floor 32→26 (underline still fits at 5px). Keep title
       row floor at 36 so crumb text stays vertically aligned with the
       circular header buttons (lowering title row lifts text above them). */
    grid-template-rows: minmax(36px, auto) minmax(32px, auto) !important;
  }
  [data-mobile-nav="frame"] [data-phase] header [role="tab"] {
    min-height: 32px !important;
  }
  /* Phone-only (≤767px + coarse): tabs floor 32→26. Tablet keeps 32. */
  @media (max-width: 767px) and (pointer: coarse) {
    [data-mobile-nav="frame"] [data-phase] header:has(> *) {
      grid-template-rows: minmax(36px, auto) minmax(26px, auto) !important;
    }
    [data-mobile-nav="frame"] [data-phase] header [role="tab"] {
      min-height: 26px !important;
    }
  }
  /* Keep title-cluster padding-right at 46px so trailing chips clear the
     Files opener's 36px hit box at right:8 (narrower padding overlapped
     and stole taps from chips). */
  [data-mobile-nav="frame"] [data-phase] header [class*="wSkVaW_titleCluster"] {
    padding-right: 46px !important;
  }
  /* Header crowding on narrow phones: yield the job trigger's verbose label
     first (dot/chevron/aria-label + popover still convey state). Keep mode
     words and title; title ellipsizes. Gate on the lineage root in crumbs
     (present for running and idle), not the transient running-state dot.
     Match [class*="_root"] — the live class has a trailing space. */
  @media (max-width: 440px) {
    /* The job label is the single widest tenant of the actions lane and the
       only one whose text is already carried elsewhere (aria-label + popover).
       Truncating it to a number instead would print the wrong count for a
       double-digit job list, so it is dropped whole — dot, chevron and tap
       target stay. */
    [data-mobile-nav="frame"] [data-phase] header [class*="_headerActions"] [class*="_root"]:not([class*="_switcherRoot"]):has(> button[class*="_trigger"]) [class*="_count"] {
      display: none !important;
    }
  }
  /* With the subagent lineage (any state) AND a background job present
     together, 390px cannot hold the title, the mode words, the lineage count
     and the job label at once; the job label goes first, above 440px too. */
  @media (max-width: 559px) {
    [data-mobile-nav="frame"] [data-phase] header [class*="_crumbs"] {
      padding-right: 8px;
    }
    [data-mobile-nav="frame"] [data-phase] header:has([class*="_crumbs"] [class*="_root"]) [class*="_headerActions"] [class*="_root"]:not([class*="_switcherRoot"]):has(> button[class*="_trigger"]) [class*="_count"] {
      display: none !important;
    }
  }
  /* Last resort on 320px-class screens: the title and both status chips cannot
     share the row with the mode words, so the mode chip keeps only its icon. */
  @media (max-width: 359px) {
    [data-mobile-nav="frame"] [data-phase] header:has([class*="_crumbs"] [class*="_root"]):has([class*="_headerActions"] [class*="_root"]) [class*="_label"]:has(> svg) {
      display: none !important;
    }
  }

  /* --- Header popovers on mobile (dsh-client-ui-jobs / dsh-client-ui-subagent) --- */
  /* Both entries sit in the session header and both anchor their panel to the
     trigger's left edge (left:0 inside their own root), so clamp them to the
     viewport. The background-job menu resolves against the header (see the
     containment rules at the top of this section) and the subagent lineage
     menu is position:fixed, so right:8px pins either panel 8px from the
     phone's right edge: measured [46,77,336,73] for the job menu and
     [38,41,336,58] for the lineage menu at 390px, both fully inside the
     viewport. Do NOT clamp with left:8px: measured, that put the panel at
     x=350..686 (off-screen) against a right-anchored x=30..366. */
  [data-mobile-nav="frame"] [data-phase] header [class*="_menu"] {
    left: auto !important;
    right: 8px !important;
    width: min(336px, calc(100vw - 16px));
    max-width: none;
    max-height: min(420px, calc(100dvh - 120px));
  }

  /* --- 0.1.6-alpha.2 session-header adaptation ---
     See docs/upstream/2026-09-19-mobile-header-0.1.6-adaptation.md. Omit
     DSHA-only preset anchors. Gate every selector with
     header:has([class*="_headerLeading"]) so shared class names do not
     re-tune geometry on pre-alpha.2 / rc hosts. */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) {
    /* Drop host header padding-top / title-row pad — they stack on safe-area
       and read as empty chrome. */
    padding-left: 8px !important;
    padding-right: 8px !important;
    padding-top: 0 !important;
    /* Host header min-height:76px with ~69px content pads ~7px under the tabs;
       bottom-pinned status chips then misalign. Hug content height on phone. */
    min-height: 0 !important;
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) > :first-child {
    flex-wrap: nowrap !important;
    align-items: center !important;
    gap: 0 !important;
    padding-left: 32px !important;
    padding-right: 0 !important;
    padding-top: 0 !important;
  }
  /* Keep the directory toggle vertically centered with the title row. */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [data-mobile-nav="toggle"] {
    top: 6px !important;
  }
   /* Collapse reserved padding on empty headerLeading — a2 always mounts a
      display:contents [data-slot] wrapper, so :empty / :not(:has(*)) never
      fire, and display:none would hide a real control on hosts that render
      one. web-all compat mis-tags this seat as session-title-cluster and
      injects padding-inline-end:44px (44px dead width). Zero that padding;
      seats with real content are unaffected. */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="_headerLeading"] {
    /* Do not zero ALL padding on the leading seat — the sibling rule needs
       padding-left:32px for the panel toggle. padding:0 !important is a
       shorthand that would win same-specificity and collapse the seat.
       NOTE: this file is a JS template string — never put a backtick in a
       comment. */
    padding: 0 !important;
    padding-left: 32px !important;
  }
  /* 0.1.6 titleRow's first child is empty headerLeading (macOS chrome;
     null on Android). The 0.1.5 rule flex:1 1 auto on header > first >
     first now grows that empty seat and shoves the title right. Stop it
     from flexing — contentful seats still size normally. */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) > :first-child > :first-child {
    flex: 0 0 auto !important;
    width: auto !important;
    min-width: 0 !important;
    gap: 0 !important;
  }
   /* web-all compat mis-tags titleCluster as session-utilities and injects
      44px min size + flex:none on every button — centers misalign and files
      can overflow headerActions. Host 0.1.6 has no 44px floor; clear the
      foreign mins. Exempt QsffPG/ZKlsPq status chips (:not) so their later
      25px floor (lower specificity) is not wiped. */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="_titleCluster"] :is(button, [role="button"]):not([class*="QsffPG_root"] button):not([class*="ZKlsPq_root"] button) {
    min-width: 0 !important;
    min-height: 0 !important;
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="_titleCluster"] {
    display: flex !important;
    flex-wrap: nowrap !important;
    flex: 1 1 auto !important;
    width: auto !important;
    max-width: none !important;
    min-width: 0 !important;
    min-height: 40px !important;
    /* Cluster gap 6→4: on phone the team chip is icon-only
       (@container width≤480px), so less breathing room reads as one group. */
    gap: 0 4px !important;
    justify-content: flex-start !important;
    align-items: center !important;
    /* Cluster overflow guard: keep residual crumb overflow horizontally
       scrollable under extreme fonts without relying on web-all; inert when
       content fits. */
    overflow-x: auto !important;
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="_titleCluster"] > [class*="_crumbs"] {
    /* Title adapts to leftover width after actions; each crumb segment
       scrolls horizontally when needed. min-width floors ~4 glyphs so a long
       preset name cannot erase the title. */
    flex: 1 1 auto !important;
    width: auto !important;
    min-width: 72px !important;
    max-width: none !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    min-height: 0 !important;
    padding-right: 0 !important;
    overflow: visible !important;
    white-space: nowrap !important;
  }
  /* Title segment: fill leftover crumb width; pan-x claims horizontal
     drags so the left-edge drawer gesture does not steal them. */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="_crumbs"] [class*="_crumbCurrent"] {
    flex: 0 1 auto !important;
    width: auto !important;
    min-width: 0 !important;
    /* Cap ~6 CJK glyphs (6×14px + 16px pad ≈ 100px); longer titles pan inside
       the segment instead of crowding the preset. */
    max-width: 100px !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    text-overflow: clip !important;
    white-space: nowrap !important;
    text-align: left !important;
    justify-content: flex-start !important;
    touch-action: pan-x !important;
    overscroll-behavior-x: contain !important;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="_crumbs"] [class*="_crumbCurrent"]::-webkit-scrollbar {
    display: none;
  }
  /* Parent-session crumb is also a <button>; without a window it overflows
     (subagent sessions). */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="_crumbs"] [class*="_crumbSeg"] > button {
    flex: 0 1 auto !important;
    min-width: 0 !important;
    max-width: 100px !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    text-overflow: clip !important;
    white-space: nowrap !important;
    text-align: left !important;
    touch-action: pan-x !important;
    overscroll-behavior-x: contain !important;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="_crumbs"] [class*="_crumbSeg"] {
    flex: 0 1 auto !important;
    min-width: 0 !important;
    justify-content: flex-start !important;
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="_headerActions"] {
    /* Breakpoint A (all mobile widths): actions lane does not shrink; chips
       keep natural width; crumbs' scroll window is the shock absorber.
       Content is font-relative while the budget is fixed px — headless CJK
       fallbacks run narrow and devices (plus Android fontScale) run wide, so
       flex:0 1 auto used to ellipsize mode labels on device while headless
       looked fine. An earlier min-width:377 gate never painted on real 360px
       viewports; unconditional flex here is the fix. Lane stops shrinking;
       crumbs (flex 1 1 auto, floor 72px, max-width 100px window) absorb;
       residual overflow pans the cluster. Sole flex source for this geometry;
       rc-era rules lose on importance. */
    flex: 0 0 auto !important;
    width: auto !important;
    max-width: none !important;
    min-height: 36px !important;
    margin-left: auto !important;
    padding: 0 !important;
    border-top: 0 !important;
    justify-content: flex-end !important;
    /* Match titleCluster: 4px gap between action-row chips. */
    gap: 4px !important;
    overflow-x: auto !important;
    scrollbar-width: none;
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="_headerActions"]::-webkit-scrollbar {
    display: none;
  }
  /* Stats row: host centers a horizontally scrolling metrics strip; when
     content overflows, justify-content:center clips both ends and the left
     metrics are unreachable (scrollLeft cannot go negative). flex-start puts
     all overflow on the right so the full stream is reachable. Prefer that
     over a permanent missing metric segment. Anchored on the stable
     data-mobile-nav="stats" marker. Outside nested breakpoint blocks so it
     applies at every mobile width. */
  [data-mobile-nav="frame"] [data-phase] [data-mobile-nav="stats"] {
    justify-content: flex-start !important;
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [data-mobile-nav="files"] {
    width: 36px !important;
    height: 36px !important;
    flex: 0 0 36px !important;
    /* Keep the 36px seat the reference phone UI shows (opener box 316..352 at
       360px, icon 326..342): it is the geometry the lane's 46px reservation
       above is tuned against. Mirror the toggle's centre (top:6px for a 28px
       control -> centre y=20) by lifting the taller box to top:2px. */
    top: 2px !important;
  }
  /* Hide titleRow headerCorner's host right-sidebar opener on phone — it
     duplicates our Files control and leaks past the viewport with its
     negative margin. Older hosts where corner is the only entry are
     unaffected (selector is titleRow-scoped). */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="wSkVaW_titleRow"] > [class*="_headerCorner"] {
    display: none !important;
  }
  /* Reveal headerCorner on 0.1.6: the old last-child {display:none} hid
     the session-log capsule on 0.1.5 but now hits corner (right-sidebar
     entry) and blocked Files. Leave room so the overflow menu still fits. */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) > :first-child > :last-child[class*="_headerCorner"] {
    display: flex !important;
    flex: 0 0 auto !important;
    margin-left: 4px !important;
    margin-right: 0 !important;
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="_headerCorner"] button {
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    min-height: 36px !important;
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="_headerUtilities"] {
    display: none !important;
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [role="tablist"] {
    width: 100% !important;
    margin-top: 4px !important;
  }
  /* Status chips on the tabs row: jobs (QsffPG) and subagent lineage
     (ZKlsPq) collide with title/preset/files in the actions flex. Absolute-
     position both into the Chat/Trace row's right free space; reserve width
     so extra tabs can scroll without diving under them. Lineage sits left of
     jobs when both are present. */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) {
    position: relative !important;
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [role="tablist"] {
    padding-right: 8px !important;
    /* Tabs strip is full-width content-box; padding without border-box pushes
       8px past the header edge and steals from the 118px reserve. */
    box-sizing: border-box !important;
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]):has([class*="QsffPG_root"]) [role="tablist"] {
    padding-right: 118px !important;
  }
   /* Agent Team chip was flex:0 0 auto (pinned), so the mode chip was the
      only shrinker and ellipsized on phone. Mode is the only mode switch —
      keep its label; team text lives in its panel. Keep order:2; allow
      shrink with a floor that preserves the icon hit target. Floor 28 =
      14px icon + host trigger padding (icon-only under ≤480px container).
      Specificity beats the pin rule; :has gate skips rc hosts. */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [data-team-action][class*="_root"] {
    flex: 0 1 auto !important;
    min-width: 28px !important;
  }
  /* Nudge the team chip so its icon centers between the mode chip and the
     Files button (phone-only; paint-only translate, layout/reserve unchanged). */
  @media (max-width: 767px) and (pointer: coarse) {
    [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [data-team-action][class*="_root"] {
      left: 3px !important;
    }
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="_headerActions"] [class*="QsffPG_root"] {
    position: absolute !important;
    right: 8px !important;
    /* Same baseline recipe as the subagent chip: bottom:0 + 9px pad = tab text. */
    bottom: 0 !important;
    height: 25px !important;
    min-height: 25px !important;
    /* Jobs root is position:relative block only — align-items is inert on
       block. Force flex so the inner button baselines with the tabs row
       (lineage root is already inline-flex). */
    display: flex !important;
    align-items: stretch !important;
    z-index: 3 !important;
    margin: 0 !important;
    min-width: 0 !important;
    max-width: 118px !important;
    flex: 0 0 auto !important;
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="QsffPG_root"] > button {
    height: 25px !important;
    min-height: 25px !important;
    padding: 0 2px 9px !important;
    line-height: 16px !important;
    align-items: center !important;
  }
  /* Header popovers (jobs / lineage / preset): old left = chip.left+8
     pushed wide panels off-screen once chips moved mid-right. Pin to the
     viewport under the header with 8px side insets; also escapes
     headerActions overflow clipping. */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="_menu"]:not([class*="_menuAnchor"]) {
    position: fixed !important;
    left: 8px !important;
    right: 8px !important;
    top: calc(env(safe-area-inset-top, 0px) + 80px) !important;
    bottom: auto !important;
    width: auto !important;
    max-width: none !important;
    max-height: calc(100dvh - 96px) !important;
  }
  /* Agent-team TeamAction panel (data-team-action / _panel): same overflow
     clip as the _menu family but class lacks _menu — twin the viewport pin.
     Substring _panel + data-team-action keeps the match scoped; gated by
     header:has([class*="_headerLeading"]). */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [data-team-action] [class*="_panel"] {
    position: fixed !important;
    left: 8px !important;
    right: 8px !important;
    top: calc(env(safe-area-inset-top, 0px) + 80px) !important;
    bottom: auto !important;
    width: auto !important;
    max-width: none !important;
    /* Cap panel height so the task list clears the composer (~120px =
       composer block + breathing room); dvh shrinks with the keyboard. */
    max-height: calc(100dvh - 200px) !important;
    /* Panel inherits header nowrap; restore normal wrapping so long task
       titles do not force horizontal overflow. */
    white-space: normal !important;
  }
  /* Subagent lineage chip: 0.1.6 renders it inside crumbs; in a subagent
     session that overcrowds the actions row. Reposition into the Chat/Trace
     row's free space, vertically aligned with tab text. */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="ZKlsPq_root"] {
    position: absolute !important;
    /* Center in the free space right of the stock tabs (~104px inset), not
       the full header width. */
    left: 104px !important;
    right: 8px !important;
    /* Mirror tab box model (16px line + 9px bottom pad, 25px tall, bottom:0)
       so chip text shares the Chat/Trace baseline. */
    bottom: 0 !important;
    height: 25px !important;
    min-height: 25px !important;
    align-items: stretch !important;
    z-index: 3 !important;
    margin: 0 auto !important;
    width: max-content !important;
    min-width: 0 !important;
    max-width: min(32vw, 116px) !important;
    flex: 0 0 auto !important;
  }
  /* When jobs chip is also on the tabs row, shift the lineage aggregate
     left but stay centered. Exclude _switcherRoot — that variant is
     right-anchored below; a shared right:126 would drag it across the tabs. */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]):has([class*="QsffPG_root"]) [class*="ZKlsPq_root"]:not([class*="_switcherRoot"]) {
    right: 126px !important;
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="ZKlsPq_root"] > button {
    height: 25px !important;
    min-height: 25px !important;
    line-height: 16px !important;
    padding: 0 4px 9px !important;
    align-items: center !important;
  }
  /* With ≥3 tabs, stop centering the lineage chip and dock it in the right
     free space (right:8, or 126 when jobs is present) so it does not cover
     the third tab. Two selector variants cover direct-child and wrapped
     tabs; higher specificity than the center rules. */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]):has([role="tablist"] button:nth-of-type(3)) [class*="ZKlsPq_root"]:not([class*="_switcherRoot"]),
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]):has([role="tablist"] > button:nth-child(3)) [class*="ZKlsPq_root"]:not([class*="_switcherRoot"]) {
    left: auto !important;
    right: 8px !important;
    margin: 0 !important;
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]):has([role="tablist"] button:nth-of-type(3)):has([class*="QsffPG_root"]) [class*="ZKlsPq_root"]:not([class*="_switcherRoot"]),
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]):has([role="tablist"] > button:nth-child(3)):has([class*="QsffPG_root"]) [class*="ZKlsPq_root"]:not([class*="_switcherRoot"]) {
    right: 126px !important;
  }
  /* Hide session-header scrollbars (crumb pan windows leave a grey thumb
     on phone). WebView ignores scrollbar-width; ::-webkit-scrollbar does
     the work. Keep pan ability; scope is the whole header — any scrollbar
     at 360px is unwanted. */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]),
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) * {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"])::-webkit-scrollbar,
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) *::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }
  /* Subagent switcher variant (ZKlsPq_root + _switcherRoot): pin rules
     exclude it so it can shrink, but our zero-overflow chain then let the
     host trigger (max-width 244) paint past the root cap — ellipsis landed
     off-screen. Raise root cap, overflow:hidden on root, trigger
     max-width:100% so the host title ellipsis chain closes inside the root.
     Aggregate "N subagents" lacks _switcherRoot and is untouched. */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="_switcherRoot"] {
    max-width: min(46vw, 180px) !important;
    overflow: hidden !important;
  }
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="_switcherRoot"] > button {
    max-width: 100% !important;
    min-width: 0 !important;
  }
  /* Switcher placement: right-anchor + tab baseline (top:48 → 25px chip
     centers on tab text). Base center/yield rules parked the wide switcher
     over Trace/Memory; dual-class anchor pulls it to right:8. bottom:0 is
     ignored when top+height+bottom are all non-auto (top wins). Yield's
     :not(_switcherRoot) keeps a ghost jobs chip from forcing right:126. */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="ZKlsPq_root"][class*="_switcherRoot"] {
    left: auto !important;
    right: 8px !important;
    top: 48px !important;
  }
  /* Aggregate lineage chip: same right-anchor + baseline as switcher.
     :not(_switcherRoot) keeps the sets disjoint. Coexistence with jobs uses
     the existing yield geometry (right:126). */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="ZKlsPq_root"]:not([class*="_switcherRoot"]) {
    left: auto !important;
    right: 8px !important;
    top: 48px !important;
  }
  /* Phone (≤767 + coarse): after tabs floor drops to 26px, top:48 leaves
     chips ~6px low vs tab text. Same specificity + !important as the 48px
     rules — this block must follow them (cascade of equals). top:42 realigns.
     Tablet keeps 48. */
  @media (max-width: 767px) and (pointer: coarse) {
    /* Both selectors must match the 48px rules' specificity — include
       :not([class*=_switcherRoot]) on the aggregate arm ((0,5,1)); a bare
       ZKlsPq_root arm loses and the chip stays misaligned. */
    [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="ZKlsPq_root"]:not([class*="_switcherRoot"]),
    [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="ZKlsPq_root"][class*="_switcherRoot"] {
      top: 42px !important;
    }
  }
  /* Lineage chip text: ellipsis window — no mid-glyph clip, no scroll. */
   /* Exclude _separator so we do not override rc's !important display:none
      that hides the lineage "/" (reads as an extra crumb level on small
      screens). Same specificity without :not would resurrect it. */
  [data-mobile-nav="frame"] [data-phase] header:has([class*="_headerLeading"]) [class*="ZKlsPq_root"] span:not([class*="_separator"]) {
    display: block !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    min-width: 0 !important;
    max-width: 100% !important;
  }
  /* Composer model chip (_7KE1Ra_): on phone (≤767) force icon-only —
     voice control stole width and icon+label blew the actions row. Upstream
     0.1.7 already exposes --dsh-composer-model-*-display via
     data-model-compact; our old triggerLabel {display:inline !important}
     fought that and showed icon+name together. Pin the variables here
     instead of gambling on the host's fit probe. Hash-prefix required so
     bare _triggerLabel does not hit permission-presets / settings. */
  @media (max-width: 767px) {
    [data-mobile-nav="frame"] [data-phase] [class*="_card"]:has(textarea, [data-composer-input]) [class*="_row"]:has([class*="_trailing"]) {
      --dsh-composer-model-text-display: none;
      --dsh-composer-model-icon-display: block;
    }
    /* Icon-only: zero host text padding/gap on ≤767 only (#101: an earlier
       unscoped zero also crushed tablet chips that still show labels). */
    [data-mobile-nav="frame"] [data-phase] [class*="_7KE1Ra_trigger"] {
      padding: 0 !important;
      gap: 0 !important;
    }
    /* Chevron svg has internal ink padding; after gap:0 leave ~2px breathing
       room (no negative margin — inks would fuse). */
    [data-mobile-nav="frame"] [data-phase] [class*="_7KE1Ra_chevron"] {
      margin-left: 0 !important;
    }
  }
  /* Model chip width budget (tablet 768–1023, labels visible): raise host
     max-width to 60cqw so names truncate less; effort shrinks first.
     Phone is icon-only so this rule is inert there. */
  [data-mobile-nav="frame"] [data-phase] [class*="_7KE1Ra_trigger"] {
    max-width: min(360px, 60cqw) !important;
    /* #101: padding/gap/chevron zeros live in the ≤767 block above; tablet
       keeps host padding/gap/chevron margin. */
  }
  /* --- Settings dialog on mobile ---
     Desktop: 800px two-column flex (188px nav + content). Mobile: a
     near-full-width sheet — nav tabs wrap into rows on top, option rows
     stay horizontal (title+description left, control right). Structural
     selectors are scoped to the unique aria-modal dialog; every
     settings-specific rule is gated with
     :has(> :first-child > :last-child > button) — the settings nav tab
     list holds <button> tabs, so the transient export dialog keeps its
     official centered card layout. Requires :has() support
     (Chromium 105+, 2022).

     The directory picker must be excluded too: its footer holds <button>
     children AND its breadcrumb trail (role="navigation") — which the role
     gate relies on — is REPLACED by the path input in edit mode, so without
     the ZuhsRW exclusion the pencil would match this sheet rule and hide the
     path header (issue #12). The picker keeps the official layout in every
     mode.

     The keyboard-shortcut modal needs the same exclusion: its first child
     is the content column (not a nav row) and its footer holds <button>s, so
     the family predicate matched it and sheet rules transposed the dialog
     (search/list/footer side-by-side; title+close swallowed). Gate on
     data-shortcut-modal rather than a hashed class. */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"]) {
    position: absolute !important;
    left: 8px !important;
    /* Fixed top (no translateY): a transform on the panel combined with the
       panel overflowing the max-content drawer shifts the fixed overlay's
       coordinate frame, dragging the whole sidebar content off-screen. The
       safe-area inset keeps the sheet below the status bar / notch. */
    top: calc(env(safe-area-inset-top, 0px) + 12px) !important;
    width: calc(100vw - 16px);
    max-width: calc(100vw - 16px);
    /* Height follows content; cap at the keyboard-less viewport minus 24
       (less safe-area top). Use STABLE_VIEWPORT_VAR, not 100dvh: on Android
       WebView adjustResize, vh/svh/lvh/dvh all track the keyboard and a
       dvh-sized sheet collapses when search focuses. The variable ignores
       the keyboard so the sheet keeps size and the keyboard covers the
       lower half. */
    height: auto;
    max-height: min(800px, calc(100vh - 24px - env(safe-area-inset-top, 0px)));
    max-height: min(800px, calc(var(--dsh-web-mobile-vh, 100dvh) - 24px - env(safe-area-inset-top, 0px)));
    /* Only a real viewport change (rotation / window resize) reaches this now,
       so the short transition reads as a slide instead of a jump. */
    transition: max-height .2s var(--ds-ease-out, ease-in-out);
    flex-direction: column !important;
    border-radius: 14px !important;
    animation: dsh-web-mobile-sheet-in .22s var(--ds-ease-out, ease-in-out);
  }
  /* The settings sheet's dimmed mask fades in with the panel (the mask is
     the first child of the overlay that directly contains the sheet). */
  :has(> [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"])) > :first-child {
    animation: dsh-web-mobile-fade .18s var(--ds-ease-out, ease-in-out);
  }
  @media (prefers-reduced-motion: reduce) {
    [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"]),
    :has(> [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"])) > :first-child {
      animation: none !important;
    }
  }
  /* The export dialog (not the settings sheet) must never overflow the
     viewport: the official centered card can be wider than 390px. */
  [aria-modal="true"]:not(:has(> :first-child > :last-child > button)) {
    max-width: calc(100vw - 32px);
  }
  /* Nav bar: hide the "Settings" caption (redundant on a full-width sheet)
     and wrap the tab list so every tab is visible — a horizontal scroll cut
     the last tab ("Plugins") off with no affordance to scroll. */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"]) > :first-child {
    width: 100%;
    flex-direction: row !important;
    align-items: center;
    gap: 6px;
    padding: 10px 12px 8px;
  }
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"]) > :first-child > :first-child {
    display: none !important;
  }
  /* Settings tab strip: single-row horizontal scroller (nowrap + overflow-x)
     that clears the absolute toolbar on the right. Frame-scoped dialog rules
     die on rc.2+ body-portaled sheets, so pin the scroller here. margin-right
     42px (= 36px toolbar + 6px gap) keeps cells out from under the close
     control. */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"]) > :first-child [class*="_navList"] {
    flex: 1 1 auto;
    min-width: 0;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    gap: 6px;
    margin-right: 42px;
    scrollbar-width: thin;
    -webkit-overflow-scrolling: touch;
  }
  /* Hairline scrollbar for the tab strip: the default WebKit scrollbar
     reads fat on a phone; 2px keeps the scroll affordance without the
     bulk. (Portal-aware copies of the frame-scoped rules in compat.css,
     which died with the rc.2 portal move.) */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"]) > :first-child [class*="_navList"]::-webkit-scrollbar {
    height: 2px !important;
  }
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"]) > :first-child [class*="_navList"]::-webkit-scrollbar-thumb {
    background: var(--dsw-alias-border-l2, rgba(0, 0, 0, .22)) !important;
    border-radius: 1px !important;
  }
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"]) > :first-child [class*="_navList"]::-webkit-scrollbar-track {
    background: transparent !important;
  }
  /* Cells stay whole inside the scroller: no shrink, no wrap, compact
     metrics. (Portal-aware copies of the frame-scoped rules in compat.css,
     which died with the rc.2 portal move.) */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"]) > :first-child [class*="_navCell"] {
    flex: 0 0 auto !important;
    white-space: nowrap !important;
    padding: 6px 8px !important;
    gap: 6px !important;
    font-size: 13px !important;
    justify-content: flex-start !important;
  }
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"]) > :first-child [class*="_navCell"] svg {
    width: 14px !important;
    height: 14px !important;
    flex: none !important;
  }
  /* Content toolbar (close ± config-file): absolute top/right 10/12 over
     the nav row (#105 A′ — stay at React home in the content column).
     Anchor structurally as the panel's :last-child > _header; a bare
     [class*="_header"] also matched plugin card headers in the options
     area and broke their layout. Neutralize child auto-margins that would
     defeat flex-end. */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"]) > :last-child > [class*="_header"]:not([class*="_headerActions"]) {
    position: absolute;
    top: 10px;
    right: 12px;
    /* z-index is load-bearing since 0.1.7-rc.2: the sheet is portaled to
       <body>, and the market page (position:relative, z:auto) paints AFTER
       this header — both z:auto, so the market head stole hit-testing from
       the close control (visible but untappable). Lift the toolbar above
       the market root and sticky list heads, still below market transients
       (.opPanel / .lightbox). On the settings view the toolbar sits over the
       nav row's reserved right end. */
    z-index: 10;
    flex: 0 0 auto;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
    padding: 0 0 0 4px;
    /* Hug the close control only: the host header box is 54px tall, and with
       actions hidden its empty lower half ate the market export button's
       top-right once z-index lifted the toolbar. 32px = close height. */
    height: 32px;
    min-height: 32px;
  }
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"]) > :last-child > [class*="_header"]:not([class*="_headerActions"]) > * {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"]) > :last-child > [class*="_header"]:not([class*="_headerActions"]) > :last-child {
    position: relative;
    width: 32px;
    height: 32px;
    border-radius: 50% !important;
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06)) !important;
  }
  /* 32px is under the ~44px touch minimum and this close shares the corner
     with market version text and export — extend HIT area only (pseudo grows
     up/left/right by 6px, never down where export starts). */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"]) > :last-child > [class*="_header"]:not([class*="_headerActions"]) > :last-child::after {
    content: "";
    position: absolute;
    inset: -6px -6px 0 -6px;
    border-radius: 50%;
  }
  /* Hide the config-file action on phones: rarely needed, and ~94px next to
     the 32px close made the pinned toolbar 138px — wide enough to swallow
     nav cells while the strip still wrapped. Close is a sibling of actions,
     so hiding actions never removes the exit. Desktop keeps the button
     (mobile media wrapper). Portal-aware replacement for the dead
     frame-scoped rule in compat.css. */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"]) > :last-child > [class*="_header"]:not([class*="_headerActions"]) [class*="_actions"] {
    display: none !important;
  }
  /* Appearance mode cards: the official cube row renders three tall
     vertical cards (~268px) that eat half the sheet. Turn them into a
     compact horizontal trio (icon + label inline, equal widths).
     Relies on the official cube-row class name of this version. */
  [aria-modal="true"] [class*="_cubeRow"] {
    gap: 6px;
  }
  [aria-modal="true"] [class*="_cubeRow"] > * {
    flex: 1 1 0;
    flex-direction: row !important;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 8px;
    min-height: 0;
  }
  /* Content: the options scroll area gets bottom breathing room so the last
     row never sits flush against the sheet's rounded corner. */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"]) > :last-child {
    flex: 1 1 auto;
    min-height: 0;
  }
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])):not([data-shortcut-modal="shortcuts"]) > :last-child > :last-child {
    padding: 0 12px 24px;
  }
  /* Plugin manager (section[data-plugin-panel]): FAB stays top-left; give
     list H1 and detail breadcrumbs left inset so they are not under the FAB
     hit target. Offset = FAB right edge + 8px, expressed relative to host
     padding (clamp) so it tracks viewport width. Anchors are host data-*
     markers (stable across css-module hashes); pre-alpha.2 hosts lack them. */
  [data-mobile-nav="frame"] section[data-plugin-panel] {
    --dsh-web-mobile-panel-clearance: calc(56px - clamp(24px, 4vw, 48px));
  }
  /* Page header is width:100% in the host scroll box — use margin + equal
     width shrink so the row does not overflow horizontally; Add Plugin stays
     right-aligned. */
  [data-mobile-nav="frame"] section[data-plugin-panel] [class*="_pageHead"] {
    margin-left: var(--dsh-web-mobile-panel-clearance) !important;
    width: calc(100% - var(--dsh-web-mobile-panel-clearance)) !important;
  }
  /* Detail crumb: keep direct-child rules for older hosts; 0.1.7+ wraps the
     crumb under DetailTop so add descendant [class*="_crumb"] twins.
     Measured clearance moves the crumb past the FAB without horizontal
     overflow. */
  [data-mobile-nav="frame"] section[data-plugin-panel] [data-plugin-detail] > button:first-child,
  [data-mobile-nav="frame"] section[data-plugin-panel] [data-plugin-item-detail] > button:first-child,
  [data-mobile-nav="frame"] section[data-plugin-panel] [data-plugin-row-detail] > button:first-child,
  [data-mobile-nav="frame"] section[data-plugin-panel] [data-plugin-detail] button[class*="_crumb"],
  [data-mobile-nav="frame"] section[data-plugin-panel] [data-plugin-item-detail] button[class*="_crumb"],
  [data-mobile-nav="frame"] section[data-plugin-panel] [data-plugin-row-detail] button[class*="_crumb"] {
    margin-left: var(--dsh-web-mobile-panel-clearance) !important;
  }
  /* Shortcut modal phone chrome: the family exclusion restores official
     internal layout, but the host Modal is viewport-centered and autofocuses
     search — soft keyboard then reflows the card. Pin to the top with the
     same sheet geometry as settings; keep host 600px height so flex:1 list
     can scroll; zero the desktop translateY nudge. */
  [aria-modal="true"][data-shortcut-modal="shortcuts"] {
    position: absolute !important;
    left: 8px !important;
    top: calc(env(safe-area-inset-top, 0px) + 12px) !important;
    width: calc(100vw - 16px) !important;
    max-width: calc(100vw - 16px) !important;
    /* Same stable viewport height as settings — card must not resize when
       search focuses and the keyboard rises. */
    max-height: min(760px, calc(var(--dsh-web-mobile-vh, 100dvh) - 24px - env(safe-area-inset-top, 0px))) !important;
    transition: max-height .2s var(--ds-ease-out, ease-in-out);
    transform: none !important;
    border-radius: 14px !important;
    /* No opacity fade-in: this layer stacks on the same full-bleed white
       settings sheet; a shared opacity animation double-exposed both titles.
       Instant show (writing animation would fall back to host _modalEnter
       fade). Backdrop fade is handled separately below. */
    animation: none !important;
  }
  /* Hide the shortcut search row on phone: host autofocuses it, keyboard
     rises, layout viewport collapses — full-screen flash. CSS-hide only;
     never remove the React node (unmount NotFoundError / empty slot). */
  /* Phone-only hide; tablet 768–1023 and desktop keep search. */
  @media (max-width: 767px) {
    [aria-modal="true"][data-shortcut-modal="shortcuts"] [class*="_searchRow"] {
      display: none !important;
    }
  }
  /* Instantize the host backdrop _modalEnter fade too — a 0.24 opacity
     ramp reads as a full-screen flash. Modal and backdrop appear/disappear
     on the same frame. */
  :has(> [aria-modal="true"][data-shortcut-modal="shortcuts"]) > [class*="_mask"]::after {
    animation: none !important;
    /* Shortcut modal opens only from settings, which already dims at 0.24;
       stacking another backdrop steps 0.24→0.42 (flash). Keep screen
       luminance unchanged; only the card moves. */
    background: transparent !important;
  }
  /* ---------- sidebar panel enter / exit (see effects/panel-exit.ts) ----------
     A sidebar panel REPLACES the main area. Two motions, both short and
     horizontal, matching the drawer's own rail-in (.15s, translate + fade):
       · enter — the panel slides in from the right;
       · exit  — the panel does NOT animate out; the conversation it hands the
         main area back to fades in instead.
     The asymmetry is deliberate. selectPanel(null) remounts the whole
     conversation and that commit blocks the main thread long enough to matter
     (measured on a phone: ~390 ms for a long session), so fading the panel out
     first would leave the screen blank for that whole window — panel already
     transparent, conversation not mounted yet. Keeping the panel opaque until
     the commit means the two swap on one frame.
     The enter rule is a CSS condition on purpose: :has() matches in the same
     commit that swaps the main slot, so the animation is already running at the
     element's first style resolution and there is no full-opacity frame first.
     The exit marker is set by JS before the swap for the same reason. */
  @keyframes dsh-web-mobile-panel-in {
    from { opacity: 0; transform: translateX(16px); }
  }
  /* Deliberately NOT reusing dsh-web-mobile-fade: the exit cleanup listens on
     animationend BY NAME, and that keyframe also runs on the backdrop and the
     dialogs, which are frame descendants too — reusing it would end the
     transition early. */
  @keyframes dsh-web-mobile-panel-reveal {
    from { opacity: 0; }
  }
  [data-mobile-nav="frame"]:has([class*="panelRow"][aria-current="page"]) [class*="_centerCol"] > * > * {
    animation: dsh-web-mobile-panel-in .15s var(--ds-ease-in-out, ease-in-out) backwards;
  }
  [data-mobile-nav="frame"][data-mobile-panel-exit]:not(:has([class*="panelRow"][aria-current="page"])) [class*="_centerCol"] > * > * {
    /* ease-out rather than the shared in-out curve: the panel vanishes and the
       conversation appears on the same frame, so the fade has to come up fast
       or the first frames read as a flash of empty background. */
    animation: dsh-web-mobile-panel-reveal .15s cubic-bezier(0, 0, .2, 1) backwards;
  }
  @media (prefers-reduced-motion: reduce) {
    [data-mobile-nav="frame"]:has([class*="panelRow"][aria-current="page"]) [class*="_centerCol"] > * > *,
    [data-mobile-nav="frame"][data-mobile-panel-exit]:not(:has([class*="panelRow"][aria-current="page"])) [class*="_centerCol"] > * > * {
      animation: none !important;
    }
  }

  /* ---------- DSHA integration: preset chip layout ----------
     Markers: .dsha-preset-header-anchor / [data-dsha-agent-preset].
     (1) Structural: icon and chevron are both position:absolute; left:0 and
         stack on the label — fix at every phone width including tablet.
     (2) Phone-only (≤767) tuning: zero extra left offset; cap preset name
         at ~4 glyphs when the team chip is present.
     Non-DSHA hosts lack the markers — dead rules. */
  [data-mobile-nav="frame"] [data-phase] header .dsha-preset-header-anchor {
    order: 1;
    width: max-content;
    flex: 0 1 auto;
    min-width: 0;
    max-width: min(40vw, 130px);
    margin-left: auto;
  }
  [data-mobile-nav="frame"] [data-phase] header .dsha-preset-header-anchor [data-dsha-agent-preset="header"] {
    display: inline-flex !important;
    align-items: center;
    gap: 4px;
    width: 100%;
    max-width: 100%;
    height: 36px !important;
    min-height: 36px !important;
    /* Chip horizontal padding 6→4 — with the 4px cluster gap, mode / team /
       files read as one group. */
    padding: 0 4px;
    border: 0;
    background: transparent;
    font: inherit;
    font-size: 12px;
  }
  [data-mobile-nav="frame"] [data-phase] header .dsha-preset-header-anchor [data-dsha-agent-preset="header"] > svg {
    position: static !important;
    transform: none !important;
    flex: 0 0 auto;
  }
  [data-mobile-nav="frame"] [data-phase] header .dsha-preset-header-anchor [data-dsha-agent-preset="header"] > span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* Preset chevron open rotation (host/DSHA omit it; subagent has its own).
     (1) Beat the earlier > svg { transform: none !important } with a more
         specific svg:last-of-type + !important — do not delete the general
         rule (it still parks the icon svg).
     (2) Hook aria-expanded on the preset only; never blanket-target header
         svgs or the subagent triggerOpen class.
     Duration .12s matches the subagent chevron. */
  [data-mobile-nav="frame"] [data-phase] header .dsha-preset-header-anchor [data-dsha-agent-preset="header"] > svg:last-of-type {
    transition: transform .12s;
  }
  [data-mobile-nav="frame"] [data-phase] header .dsha-preset-header-anchor [data-dsha-agent-preset="header"][aria-expanded="true"] > svg:last-of-type {
    transform: rotate(180deg) !important;
  }
  @media (prefers-reduced-motion: reduce) {
    [data-mobile-nav="frame"] [data-phase] header .dsha-preset-header-anchor [data-dsha-agent-preset="header"] > svg:last-of-type {
      transition: none !important;
    }
  }
  /* Phone-only (≤767) tuning values. */
  @media (max-width: 767px) and (pointer: coarse) {
    [data-mobile-nav="frame"] [data-phase] header .dsha-preset-header-anchor {
      /* Host menuAnchor ships left:-8px for desktop popover math; zero it on
         phone so it does not overlap the title window. */
      left: 0 !important;
    }
    /* With Agent Team visible, cap the preset label at ~4 glyphs + ellipsis
       so a long name does not crush the team chip / Files control. Full name
       remains in the preset menu. */
    [data-mobile-nav="frame"] [data-phase] header:has([data-team-action]) .dsha-preset-header-anchor [data-dsha-agent-preset="header"] > span {
      max-width: 4em;
    }
  }
  /* ---------- Session-row ⋯ menu always visible on touch ----------
     Host shows _rowActions only on :hover / menuOpen; phones have no hover.
     Long-press now renames (phone-chrome requestRowRename), so keep the
     anchor visible for delete / archive / fork. Title flex:1 + min-width:0
     still ellipsizes; search result rows are untouched. */
  [data-mobile-nav="frame"] [class*="sessionRow"] [class*="_rowActions"] {
    display: inline-flex !important;
  }

  /* ---------- Ask-user question-card header hit targets (#140) ----------
     Host icon buttons are 24×24 with gap 4 — under touch minimum; dismiss
     sits next to collapse and clears the whole draft with no confirm.
     Expand hit via ::after only (ink unchanged) and widen gap so ±4px
     expands do not overlap. Scoped to _headerActions — pager prev/next
     share the iconButton family but only have 6px gap. Hash family
     Mbwy4a_ dies cleanly if the module hash changes. */
  [class*="Mbwy4a_headerActions"] {
    gap: 12px !important;
  }
  [class*="Mbwy4a_iconButton"] {
    position: relative;
  }
  [class*="Mbwy4a_headerActions"] [class*="Mbwy4a_iconButton"]::after {
    content: '';
    position: absolute;
    inset: -4px;
  }
}
`,
			`@media (max-width: 1023px) and (pointer: coarse) {
  /* ---------- dsh-web-ui family compatibility ----------
     Third-party aionui explorer/preview sheets are NOT maintained in this
     fork. Keep only host-adjacent polish for taskboard / ssh entries below. */

  /* dsh-web-ui sidebar entries (task board / ssh) sit flush against each
     other — give the injected rows breathing room. */
  button[data-dsh-taskboard-entry],
  button[data-dsh-ssh-entry] {
    margin-bottom: 8px !important;
  }

  /* Task board: five kanban columns at minmax(0,1fr) crush into ~78px phone
     strips. Give every column a usable minimum and let the row scroll. */
  [data-dsh-taskboard-board] > [class*="_columns"] {
    grid-template-columns: repeat(5, minmax(240px, 1fr)) !important;
    overflow-x: auto !important;
  }
  /* The floating button must not float over a takeover panel (task board /
     ssh own the center column while active). */
  html[data-dsh-taskboard-active] [data-mobile-nav="fab"],
  html[data-dsh-ssh-active] [data-mobile-nav="fab"],
  html[data-dsh-taskboard-active] [data-mobile-nav="backdrop"],
  html[data-dsh-ssh-active] [data-mobile-nav="backdrop"] {
    display: none !important;
  }
  /* Board header: let the search field take the slack instead of squeezing
     the action buttons. */
  [data-dsh-taskboard-board] > [class*="_boardHeader"] [class*="_search"] {
    flex: 1 1 auto !important;
    min-width: 80px !important;
  }

  /* ---------- dsh-web-ui polish: plugin market search ----------
     The market tab row (Discover / Themes / Installed + the plugin search
     box) is a no-wrap flex: at 390px the tabs plus the ~218px search box
     (~475px total) overflow the ~334px sheet and the search box runs off
     the right edge of the screen (it also forces a horizontal scrollbar on
     the sheet's options area). Let the row wrap: the tabs keep the first
     line and the search box gets its own full-width second line. */

  [aria-modal="true"] [class*="_tabs"] {
    flex-wrap: wrap !important;
    row-gap: 8px !important;
  }
  [aria-modal="true"] [class*="_searchInline"] {
    flex: 1 1 100% !important;
    width: 100% !important;
    max-width: 100% !important;
  }
  /* iOS Safari auto-zooms a focused input whose computed font-size is below
     16px. dshmarket's tab search uses the shared primitive Input at 13px;
     raise only this market-owned field on mobile so focusing it keeps the
     current viewport scale. Scoped to the market root to avoid changing
     unrelated settings/search fields; pinch zoom stays available. */
  [data-dsh-market-root] [class*="tabSearch"] input,
  [data-dsh-market-root] input[class*="tabSearch"] {
    font-size: 16px !important;
  }

  /* ---------- dshmarket polish: Tasks operations popup ----------
     Upstream .opPanel pins to its ~54px trigger and reads edge-stuck on
     phones. Use fixed centering against the viewport (left:50% on the
     relative trigger would land further right). Anchor on
     [data-dsh-market-root] — rc.2+ portals the settings sheet to <body>,
     so frame-descendant selectors no longer match. */
  [data-dsh-market-root] [class*="_opPanel"] {
    position: fixed !important;
    top: 50% !important;
    bottom: auto !important;
    left: 50% !important;
    right: auto !important;
    transform: translate(-50%, -50%) !important;
  }

  /* ---------- dshmarket polish: header title row ----------
     The title row (icon + title + repo link + version + optional update
     buttons) is a nowrap flex whose natural width exceeds the sheet. Flex
     then crushes flexible items and labels wrap glyph-by-glyph. Let the row
     wrap: line 1 keeps icon + title + repo + version; update buttons take a
     second line; title stays one ellipsized line. Re-anchored to
     [data-dsh-market-root] because rc.2 portals the settings sheet to
     <body>. flex:0 1 auto on the title (not flex-grow) keeps repo + version
     packed left so they do not crowd the pinned close control. */
  [data-dsh-market-root] [class*="_titleRow"] {
    flex-wrap: wrap !important;
    row-gap: 6px !important;
  }
  [data-dsh-market-root] [class*="_titleRow"] [class*="_title"] {
    flex: 0 1 auto !important;
    min-width: 0 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }
  [data-dsh-market-root] [class*="_titleRow"] button {
    white-space: nowrap !important;
  }

  /* ---------- dshmarket polish: card byline stays on one line ----------
     Upstream lets the byline wrap so the owner name is not crushed; on
     phone card widths the break often orphans the star count on its own
     line. Pin nowrap so the flexible owner absorbs squeeze and counts
     stay intact. Desktop cards are wide enough that wrap never fired. */
  [data-dsh-market-root] [class*="_byline"] {
    flex-wrap: nowrap !important;
  }

  /* ---------- dshmarket polish: top inset ----------
     Market page started flush with the sheet top while close sat ~10px
     under it. Give the page the same 12px top inset as its horizontal
     padding so the title clears the sheet corner, level with close.
     Move page content only — the pinned close stays put. Mobile-only. */
  [data-dsh-market-root] {
    margin-top: 12px !important;
  }
  /* Below ~360px the fixed-width counts plus the owner's 44px min overrun
     the card, so the ellipsis eats most of the name ("omds..."). Trade text
     size for name length on the smallest phones: 11px → 10px text and
     6px → 4px gaps buy the owner roughly a third more room while the row
     stays one line. Tablet/phone tiers above this width are unaffected. */
  @media (max-width: 360px) {
    [data-dsh-market-root] [class*="_byline"] {
      gap: 4px !important;
      font-size: 10px !important;
    }
    [data-dsh-market-root] [class*="_byline"] [class*="_dot"] {
      margin-left: 3px !important;
    }
  }

  /* ---------- dshmarket 1.20+ compat: keep the settings nav visible ----------
     Upstream hides dialog > nav under max-width:560px when the market is
     present. Restore it so the categories row stays above the market page.
     Twin selectors: frame-scoped for in-frame hosts (rc.1), unscoped
     structural for body-portaled sheets (rc.2+). Both stay inside this
     file's mobile media wrapper. */
  @media (max-width: 560px) {
    [data-mobile-nav="frame"] [role="dialog"]:has([data-dsh-market-root]) > nav {
      display: flex !important;
    }
    [role="dialog"]:has([data-dsh-market-root]) > nav {
      display: flex !important;
    }
  }

  /* ---------- dsh-usage-stats polish: usage & balance panel ----------
     The panel's stats row shows three token counters side by side
     (today / month / total). The counters use tabular nowrap figures whose
     min-content width overflows the ~336px panel body on a phone: figures
     clip at the row's edges and the panel grows a horizontal scrollbar.
     Stack the three counters vertically — full-width rows, so the figures
     always fit. */

  [class*="usg_"][class*="_statsRow"] {
    flex-direction: column !important;
  }
  [class*="usg_"][class*="_stat"]:not([class*="_statsRow"]) {
    flex: 0 0 auto !important;
    width: 100% !important;
    min-width: 0 !important;
  }

  /* ---------- settings sheet polish ----------
     Setting rows are compact space-between on current hosts; do not stack.
     Frame-scoped nav/toolbar rules were removed when rc.2 portaled the
     sheet to body — live rules are in layout.css.ts (Settings dialog). */

  /* Hide closed customized-models <details> body: some engines still paint
     the catalog as a ghost layer that steals hits from provider/action rows. */
  [aria-modal="true"] details[class*="_customized"]:not([open]) > [class*="_customizedBody"] {
    display: none !important;
  }
  /* Dialog footers: white-space:normal lets labels wrap inside the fixed
     36px button row under narrow viewports or Android font scaling, and
     the second line clips. Keep labels nowrap; let the footer wrap whole
     buttons to a second row instead. */
  [role="dialog"][aria-modal="true"] [class*="_footer"] {
    flex-wrap: wrap !important;
  }
  [role="dialog"][aria-modal="true"] [class*="_footer"] button[class*="_button"] {
    white-space: nowrap !important;
  }
  /* Appearance mode group: give the cube row a consistent bordered
     segmented look (the official borders differ per state). */
  [aria-modal="true"] [class*="_cubeRow"] > * {
    border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .12)) !important;
  }

  /* ---------- dsh-web-ui polish: drawer footer ----------
     The single injected footer action (the session-log download) becomes a
     full-width pill instead of a text-width capsule. */

  /* The official footerActions row also hosts the remote-web-ui entry
     row (two icon buttons); without wrapping the two groups squeeze each
     other on one line. Wrap so each group gets its own full-width row. */
  [data-mobile-nav="frame"] [class*="_footerActions"] {
    flex-wrap: wrap !important;
    gap: 6px !important;
  }
  [data-mobile-nav="drawer-actions"] {
    width: 100% !important;
  }
  [data-mobile-nav="drawer-actions"] > button {
    flex: 1 1 0 !important;
    padding: 0 8px !important;
    white-space: nowrap !important;
  }

  /* ---------- dsh-web-ui polish: floating pet ----------
     The whale-girl pet (dsh-pet) floats at the viewport corner with a
     persisted, draggable position. On phones the pet is scaled down so
     it does not dominate the screen; the plugin's own drag + persist
     still work (the position itself is left alone — the mobile default
     position is seeded via the pet API to just above the composer). */

  body > [class*="_float"]:has([class*="_sprite"][role="button"]) {
    transform: scale(.66);
    transform-origin: bottom right;
  }
  /* While a modal dialog (settings sheet / export) owns the screen the pet
     floats ABOVE it and covers the dialog content; modal semantics say the
     background is inert, so hide the pet for the modal's lifetime. */
  body:has([aria-modal="true"]) > [class*="_float"]:has([class*="_sprite"][role="button"]) {
    display: none !important;
  }

  /* ---------- dsh-web-ui polish: conversation stats line ----------
     Client marks the row with [data-mobile-nav="stats"]. Fixed 28px strip:
     one line, no horizontal scroll — shrink type/gaps and ellipsize the
     trailing group (dock context % already eats ~75px; full metrics will
     not fit). First group stays intact; last group flex-shrinks with
     ellipsis. Height stays 28px so composer bottom reserve is unchanged. */

  [data-mobile-nav="stats"] {
    display: flex !important;
    flex-flow: row nowrap !important;
    align-items: center !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    height: 28px !important;
    min-height: 28px !important;
    max-height: 28px !important;
    box-sizing: border-box !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    overscroll-behavior-x: none;
    scrollbar-width: none !important;
    padding: 0 !important;
    line-height: 18px !important;
    font-size: 10px !important;
  }
  [data-mobile-nav="stats"]::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }
  [data-mobile-nav="stats"] > * {
    display: flex !important;
    flex-flow: row nowrap !important;
    align-items: center !important;
    white-space: nowrap !important;
    margin-right: 6px !important;
    padding: 0 !important;
  }
  /* First group (turns / steps / tok/s) stays intact. */
  [data-mobile-nav="stats"] > *:first-child {
    flex: 0 0 auto !important;
    width: max-content !important;
    min-width: max-content !important;
    max-width: none !important;
  }
  /* Last group (tok total / cache) absorbs leftover width and ellipsizes.
     Keep flex alignment — an earlier display:block pass misaligned pill
     icons. Only the inner text span shrinks; svg does not. Tighter pill
     padding/gaps reclaim width for this group. */
  [data-mobile-nav="stats"] > *:last-child {
    display: flex !important;
    align-items: center !important;
    flex: 0 1 auto !important;
    width: auto !important;
    min-width: 0 !important;
    max-width: none !important;
    overflow: hidden !important;
    margin-right: 0 !important;
  }
  [data-mobile-nav="stats"] > *:last-child > * {
    display: flex !important;
    align-items: center !important;
    min-width: 0 !important;
    max-width: 100% !important;
    overflow: hidden !important;
  }
  [data-mobile-nav="stats"] > *:last-child svg {
    flex: 0 0 auto !important;
  }
  [data-mobile-nav="stats"] > *:last-child span {
    flex: 0 1 auto !important;
    min-width: 0 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }
  [data-mobile-nav="stats"] button {
    padding: 0 3px !important;
    margin: 0 !important;
    min-width: 0 !important;
    max-width: 100% !important;
  }
  /* Host .pill sets its own font-size; set 10px on the inner tree too so
     the second group actually gains the budgeted width. */
  [data-mobile-nav="stats"] button,
  [data-mobile-nav="stats"] button span,
  [data-mobile-nav="stats"] button svg,
  [data-mobile-nav="stats"] > * {
    font-size: 10px !important;
    line-height: 18px !important;
  }
  [data-mobile-nav="stats"] > *:not(:last-child) {
    margin-right: 3px !important;
  }
  [data-mobile-nav="stats"] * {
    white-space: nowrap !important;
  }
  /* Context ring in the composer right cluster: keep the ring, hide the
     percentage text (font-size:0). Absolutely position over a plugin
     reserve (#104) — do not reparent host nodes. */
  [data-mobile-nav="stats-ring"] {
    position: absolute !important;
    flex: 0 0 auto !important;
    display: inline-flex !important;
    align-items: center !important;
    min-width: 0 !important;
    margin: 0 2px 0 0 !important;
    padding: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    border: 0 !important;
  }
  /* Collapse text inside the pill too (host pill font-size does not
     inherit from the outer 0). Ring svg uses explicit px. */
  [data-mobile-nav="stats-ring"],
  [data-mobile-nav="stats-ring"] * {
    font-size: 0 !important;
  }
  [data-mobile-nav="stats-ring"] button {
    padding: 0 !important;
    margin: 0 !important;
    gap: 0 !important;
    min-width: 0 !important;
    width: auto !important;
    /* Strip host pill chrome (fill/border) — it read larger than the ring. */
    background: transparent !important;
    box-shadow: none !important;
    border: 0 !important;
  }
  [data-mobile-nav="stats-ring"] svg {
    display: inline-block !important;
    /* Ring size 18px (#140): balances tap target vs clutter; matches the
       26×26 hit box in layout.css.ts. Width comes from trailing-lane slack. */
    width: 18px !important;
    height: 18px !important;
    flex: 0 0 auto !important;
  }
  /* Deepen track stroke (#140/#142): host 12% black looked like a broken
     spinner once the ring grew. 25% via color-mix on label-primary tracks
     theme (light≈black, dark≈white); bare rgba(0,0,0,.25) vanishes in dark
     mode. class*=_track matches repo hash-anchor convention. */
  [data-mobile-nav="stats-ring"] [class*="_track"] {
    stroke: color-mix(in srgb, var(--dsw-alias-label-primary, #000) 25%, transparent) !important;
  }
  /* Do not reparent ring/TPS host nodes (#104: removeChild NotFoundError
     emptied the composer slot). Leave React's tree; cover with plugin
     reserves and absolute-position the host nodes onto them. */
  [data-mobile-nav="stats-ring-reserve"],
  [data-mobile-nav="stats-tps-reserve"] {
    visibility: hidden !important;
    pointer-events: none !important;
  }
  [data-mobile-nav="stats-ring-reserve"] {
    flex: 0 0 auto !important;
    display: inline-block !important;
    /* Reserve matches the 18px ring so the landing slot stays put. */
    width: 18px !important;
    height: 18px !important;
    margin: 0 2px 0 0 !important;
    padding: 0 !important;
  }
  [data-mobile-nav="stats-tps"] {
    display: flex !important;
    flex-flow: row nowrap !important;
    align-items: center !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 10px !important;
    line-height: 18px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }
  [data-mobile-nav="stats-tps"] * {
    white-space: nowrap !important;
  }
  [data-mobile-nav="stats-tps"] span {
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    min-width: 0 !important;
  }
  /* Positioning context for overlays when the host parent is unpositioned
     (no !important — host may take over; stats-line measures real ancestors). */
  [data-mobile-nav="stats-ring-dock"],
  [data-mobile-nav="stats-tps-row"] {
    position: relative;
  }

  /* ---------- dsh-genui panel dock ----------
     The genui panel docks above the composer (conversation.input.dock,
     id genui-panel). On a phone its business-blue outline, generous chrome
     and single-line ellipsis read as an unfinished artifact: long titles
     truncate mid-word ("…default b···") with the chevron glued to the
     ellipsis, and the pill crowds the composer. Mobile treatment: neutral
     card border matching the composer, tighter chrome so the full title
     fits, chevron with breathing room. Scoped to the mobile frame marker —
     desktop keeps genui's own styling untouched. */

  [data-mobile-nav="frame"] [data-genui-panel] {
    margin: 6px 12px 4px !important;
    border-color: var(--dsw-alias-border-l1, rgba(0, 0, 0, .12)) !important;
    border-radius: 12px !important;
  }
  [data-mobile-nav="frame"] [data-genui-panel] [class*="_panelToggle"] {
    padding: 7px 12px !important;
    gap: 8px !important;
  }
  [data-mobile-nav="frame"] [data-genui-panel] [class*="_panelBadge"] {
    padding: 0 7px !important;
    border-radius: 5px !important;
    font-size: 10.5px !important;
    line-height: 1.7 !important;
  }
  [data-mobile-nav="frame"] [data-genui-panel] [class*="_panelTitle"] {
    flex: 1 1 auto !important;
    min-width: 0 !important;
    font-size: 12.5px !important;
    line-height: 1.45 !important;
  }
  [data-mobile-nav="frame"] [data-genui-panel] [class*="_panelChevron"] {
    flex: none !important;
    margin-left: 0 !important;
    padding-left: 4px !important;
  }

  /* ---------- git-graph branch chip: CSS re-anchor, no reparent (A′) ----------
     Do not reparent the chip into the composer card (#105 / #104 —
     React unmount then throws NotFoundError). Keep it in the dock subtree
     and absolute-position against composerStack: conversation top/left
     12/28, hero top 134.9 (card offset + corner inset). Neutralize
     right/bottom. 44px stack-level padding-top clears the 28px chip;
     card-level :has() cannot match once the chip is not a card descendant. */
  [data-mobile-nav="frame"] [class*="_composerStack"] {
    position: relative;
  }
  [data-mobile-nav="frame"] [data-gitgraph-chip-anchor] {
    position: absolute !important;
    top: 12px !important;
    left: 28px !important;
    right: auto !important;
    bottom: auto !important;
    z-index: 1 !important;
  }
  [data-mobile-nav="frame"] [data-phase="hero"] [data-gitgraph-chip-anchor] {
    top: 134.9px !important;
  }
  [data-mobile-nav="frame"] [class*="_composerStack"]:has([data-gitgraph-chip-anchor]) [class*="_card"]:has(textarea, [data-composer-input]) {
    padding-top: 44px !important;
  }

  /* ---------- dsh-meme picker: right-edge safe inset ----------
     The meme picker is absolute left:0 with width:min(360px,90vw). 90vw
     resolves against the viewport, so the border-box can exceed the overlay
     anchor and run off the right edge. Stretch to the anchor (left/right 0,
     width auto) and cap at the original border-box so tablets keep the
     intended width. Frame-scoped — desktop untouched. */
  [data-mobile-nav="frame"] .meme-picker {
    left: 0 !important;
    right: 0 !important;
    width: auto !important;
    box-sizing: border-box !important;
    max-width: 386px !important;
  }

  /* Meme grid: responsive auto-fill instead of fixed 76px cells that left
     a dead strip on phone. aspect-ratio:1; keep 8px gap; !important beats
     inline width/height. */
  [data-mobile-nav="frame"] .meme-picker .mp-grid {
    display: grid !important;
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)) !important;
    scrollbar-width: thin !important;
    scrollbar-color: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, .3)) transparent !important;
  }
  [data-mobile-nav="frame"] .meme-picker .mp-cell {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 1 !important;
  }
  /* Meme grid scrollbar: thin 4px WebKit thumb — keep the affordance
     without eating horizontal space. */
  [data-mobile-nav="frame"] .meme-picker .mp-grid::-webkit-scrollbar {
    width: 4px !important;
  }
  [data-mobile-nav="frame"] .meme-picker .mp-grid::-webkit-scrollbar-thumb {
    background: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, .3)) !important;
    border-radius: 999px !important;
  }
  [data-mobile-nav="frame"] .meme-picker .mp-grid::-webkit-scrollbar-track {
    background: transparent !important;
  }

  /* ---------- Agent-preset menu: compact bottom sheet on phone ----------
     Official menu is fixed + max-height:820px + bottom:12px and fills the
     phone. Cap height, center horizontally, drag-handle, softer radius;
     inner viewport still scrolls. Scoped to cubgiG_* items so other menus
     are untouched. */
  /* Agent-preset menu depends on cubgiG_* CSS-module hashes — re-verify after upgrading that package. */
  [role="menu"]:has([class*="cubgiG_item"]) {
    top: auto !important;
    left: 50% !important;
    right: auto !important;
    bottom: 12px !important;
    transform: translateX(-50%) !important;
    width: min(100% - 24px, 360px) !important;
    max-width: 360px !important;
    max-height: min(55dvh, 440px) !important;
    padding: 30px 6px 10px !important;
    border-radius: 16px !important;
  }
  [role="menu"]:has([class*="cubgiG_item"])::before {
    content: '';
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 4px;
    border-radius: 999px;
    background: var(--dsw-alias-border-l2, rgba(0, 0, 0, .22)) !important;
    pointer-events: none;
  }
  /* Menu viewport scrollbar: thin 4px (same as meme grid) so descriptions
     are not squeezed by a fat WebKit thumb. */
  [role="menu"]:has([class*="cubgiG_item"]) [class*="_viewport_"] {
    scrollbar-width: thin !important;
    scrollbar-color: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, .3)) transparent !important;
  }
  [role="menu"]:has([class*="cubgiG_item"]) [class*="_viewport_"]::-webkit-scrollbar {
    width: 4px !important;
  }
  [role="menu"]:has([class*="cubgiG_item"]) [class*="_viewport_"]::-webkit-scrollbar-thumb {
    background: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, .3)) !important;
    border-radius: 999px !important;
  }
  [role="menu"]:has([class*="cubgiG_item"]) [class*="_viewport_"]::-webkit-scrollbar-track {
    background: transparent !important;
  }

/* Market tab search row: extra bottom padding. */
  [aria-modal="true"] [class*="tabSearchRow"] {
  padding: 2px 4px 16px !important;
  }


  /* Installed list: single-line path ellipsis. */
  [class*="irow"]:not([class*="irowActions"]):not([class*="irowTrailing"]) > div > [class*="spec"] {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  max-width: 100% !important;
  font-size: 12px !important;
  }
  [class*="irow"]:not([class*="irowActions"]):not([class*="irowTrailing"]) > div > [class*="nm"] {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  max-width: 100% !important;
  }
  /* Installed list: vertical reflow on phone. */
  [class*="irow"]:not([class*="irowActions"]):not([class*="irowTrailing"]) {
    flex-wrap: wrap !important;
    align-items: center !important;
    gap: 4px 10px !important;
  }
  [class*="irow"]:not([class*="irowActions"]):not([class*="irowTrailing"]) > div:first-child {
    flex: 1 1 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
  }
  [class*="irow"]:not([class*="irowActions"]):not([class*="irowTrailing"]) > [class*="grow"] {
    flex: 1 1 auto !important;
  }
  [class*="irow"]:not([class*="irowActions"]):not([class*="irowTrailing"]) > button {
    flex: 0 0 auto !important;
  }
  [class*="irow"]:not([class*="irowActions"]):not([class*="irowTrailing"]) > button[class*="switch"] {
    order: 3 !important;
  }
  [class*="irow"]:not([class*="irowActions"]):not([class*="irowTrailing"]) > button:not([class*="switch"]) {
    order: 2 !important;
  }
  [class*="irow"]:not([class*="irowActions"]):not([class*="irowTrailing"]) > [class*="owner"] {
    order: 1 !important;
  }
  [class*="irow"]:not([class*="irowActions"]):not([class*="irowTrailing"]) > [class*="grow"] {
    order: 0 !important;
  }
  /* Market card screenshots: horizontal scroll. */
  [data-mobile-nav="frame"] [class*="cardShots"] {
  display: flex !important;
  flex-wrap: nowrap !important;
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch !important;
  scrollbar-width: thin !important;
  min-width: 0 !important;
  width: 100% !important;
  max-width: 100% !important;
  gap: 8px !important;
  padding: 4px 0 !important;
  }
  [data-mobile-nav="frame"] [class*="cardShots"] > [class*="cardShot"] {
  flex: 0 0 min(100%, 420px) !important;
  width: min(100%, 420px) !important;
  max-width: 100% !important;
  height: auto !important;
  display: block !important;
  object-fit: contain !important;
  }
  [data-mobile-nav="frame"] [class*="cardShots"]::-webkit-scrollbar {
  height: 4px !important;
  }
  [data-mobile-nav="frame"] [class*="cardShots"]::-webkit-scrollbar-thumb {
  background: var(--ds-border-color, #ccc) !important;
  border-radius: 4px !important;
}
}

`,
			`@media (max-width: 1023px) and (pointer: coarse) {
  /* ---------- hero composer on mobile ----------
     The official hero card carries a 2-line textarea plus a tall tool row,
     which reads oversized on a phone. Tighten the empty-state rhythm: keep
     the official centered hero, shrink the textarea line box, slim the card
     padding and the tool row, and close the gap under the headline. */

  [data-phase="hero"] [class*="_card"]:has(textarea, [data-composer-input]) {
    gap: 8px !important;
  }
  /* Chip-bearing composer stacks must keep compat.css's 44px top clearance
     (chip re-anchored to the stack under the dock; card-level :has() no
     longer matches). This compact padding would otherwise override that
     clearance after compat loads and paint the chip over the input. Exclude
     chip stacks here; the textarea collapse below still applies to them. */
  [data-phase="hero"] [class*="_composerStack"]:not(:has([data-gitgraph-chip-anchor])) [class*="_card"]:has(textarea, [data-composer-input]) {
    padding-top: 6px !important;
  }
  /* The official composer autosizes the textarea and writes an inline
     height (2 lines on the hero empty state) on the textarea's scroll/grow
     wrappers. :placeholder-shown lets us collapse the EMPTY state to one
     line with !important; as soon as the user types, the pseudo-class no
     longer matches and the autosizer's inline height takes over again — so
     multi-line growth keeps working. */
  [data-phase="hero"] textarea:placeholder-shown {
    height: 28px !important;
  }
  [data-phase="hero"] [class*="_card"]:has(textarea:placeholder-shown) > [class*="_scroll"],
  [data-phase="hero"] [class*="_card"]:has(textarea:placeholder-shown) [class*="_grow"] {
    height: 28px !important;
  }
  /* Do not mirror the one-line collapse onto Lexical hosts (0.1.2+). Those
     pin the hero input at min-height: 52px, which beats an outer 28px height
     and clips the first line plus hint. Textarea hosts have no such floor
     (transparent height:100% over the wrappers), so collapse stays valid. */
  [data-phase="hero"] [class*="_card"]:has(textarea, [data-composer-input]) > [class*="_row"] {
    padding-top: 2px !important;
  }
  [data-phase="hero"] [class*="_headline"] {
    line-height: 1.15 !important;
    margin-bottom: 0 !important;
  }
  [data-phase="hero"] [class*="_stack"] {
    gap: 0 !important;
  }

  /* ---------- composer dock: swap git branch chip with the todo card ----------
     Dock is display:contents, so order on its children reorders the stack.
     Chip order -1 places it above the todo and input cards. Leave the todo
     card at order 0 — raising it past the input would drop it below the
     composer. Queue strip (order 20) stays next to the input. */
  [data-slot="conversation.input.dock"] [data-gitgraph-chip-anchor] {
    order: -1 !important;
  }
  /* Mobile tap target + feedback for the branch chip (git-graph, 24px
     desktop spec). Two real-world problems: ① the chip is tiny and sits
     right above the expandable todo card — mis-taps land on the todo card;
     ② opening the popover waits for the host's /git/branches round-trip
     (~700ms on device) with zero feedback, so users tap again and toggle
     the popover closed. Enlarge the target, kill double-tap zoom delay,
     and give an instant pressed state so a tap reads as registered. */
  [data-slot="conversation.input.dock"] [data-gitgraph-chip-anchor] [data-gitgraph-chip] {
    touch-action: manipulation !important;
    min-height: 34px !important;
    padding: 0 12px !important;
    font-size: 13px !important;
  }
  [data-slot="conversation.input.dock"] [data-gitgraph-chip-anchor] [data-gitgraph-chip]:active {
    transform: scale(.96) !important;
    transition: transform .12s !important;
  }

  /* ---------- ask question composer: prevent iOS Safari focus zoom ----------
     Focused fields under 16px trigger viewport zoom that only reverts on
     blur; the ask modal keeps focus, so zoom would stick. Raise .customInput
     / .customTextarea to 16px on iOS only (Android/desktop keep 14px). Scope
     to [data-question-key]; hashed class suffix match follows harness CSS-
     module naming. The global iOS floor below also covers these fields. */
  html[data-mobile-nav-ios] [data-question-key] [class*="_customInput"],
  html[data-mobile-nav-ios] [data-question-key] [class*="_customTextarea"] {
    font-size: 16px !important;
  }

  /* ---------- iOS WebKit: keep text fields ≥16px to avoid focus zoom (#45) ----------
     iOS Safari zooms when a focused field computes under 16px and only
     reverts on blur; a chat shell keeps the composer focused, so zoom sticks.
     Do not use maximum-scale=1 (breaks Android pinch). Gate on
     html[data-mobile-nav-ios]. Cover portalled fields too; skip button-like
     inputs and select (native picker; would break the 28px access-mode
     control). Keep mirror/backdrop layers in sync with the textarea so the
     caret stays aligned. Match [contenteditable] broadly (Lexical and other
     hosts) but exclude contenteditable="false" decorator nodes. */
  html[data-mobile-nav-ios] textarea,
  html[data-mobile-nav-ios] [contenteditable]:not([contenteditable="false"]),
  html[data-mobile-nav-ios] [data-input-mirror],
  html[data-mobile-nav-ios] [data-input-backdrop],
  html[data-mobile-nav-ios] input:not([type="button"]):not([type="checkbox"]):not([type="color"]):not([type="file"]):not([type="hidden"]):not([type="image"]):not([type="radio"]):not([type="range"]):not([type="reset"]):not([type="submit"]) {
    font-size: 16px !important;
  }

  /* ---------- drawer session tree: skip off-screen rendering ----------
     content-visibility: auto skips layout/paint for off-screen session rows
     during open and streaming; contain-intrinsic-size keeps scroll geometry
     stable. Scope to the drawer tree (frame + first child) so the explorer
     sheet tree is untouched. */
  [data-mobile-nav="frame"] > :first-child [role="tree"] {
    content-visibility: auto;
    contain-intrinsic-size: auto 600px;
  }
}

/* ---------- tablet / wide mobile: keep sheets from becoming full-width ----------
   Below 768px the near-full-width sheets are the right call for a phone.
   On wider but still sub-desktop viewports (foldables, tablet portrait,
   desktop-mode tall windows) the same full-bleed sheet leaves content
   clustered at the left edge with a large dead zone on the right. Cap and
   center the modal sheets instead. */
@media (min-width: 768px) and (max-width: 1023px) and (pointer: coarse) {
  /* Centered, never edge-to-edge — for the modal shapes below, not for every
     modal dialog. Covered: modals that are not sheet-shaped, plus sheet-shaped
     ones with neither a navigation element nor a directory picker. A modal
     that is sheet-shaped AND carries the directory picker is left out on
     purpose — layout.css.ts holds the dedicated rule for it. The settings
     sheet has a higher-specificity full-width rule above, so repeat its
     selector here to win; the generic export/other-modal rule is covered by
     the second selector. */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])):not(:has([class*="ZuhsRW"])),
  [aria-modal="true"]:not(:has(> :first-child > :last-child > button)) {
    left: 0 !important;
    right: 0 !important;
    margin-left: auto !important;
    margin-right: auto !important;
    width: min(calc(100vw - 32px), 720px) !important;
    max-width: min(calc(100vw - 32px), 720px) !important;
  }

  /* Settings sections (e.g. Agent presets) often carry a desktop max-width
     (720px) that leaves a dead strip on the right once the sheet is capped to
     the same width; let them fill the sheet body instead. */
  [aria-modal="true"] [class*="_section"] {
    width: 100% !important;
    max-width: none !important;
  }
}

/* ---------- desktop / non-touch: the mobile controls must never appear ----------
   Complement of "(max-width: 1023px) and (pointer: coarse)": any viewport
   ≥1024px, or a narrow viewport with pointer fine/none. Pointer terms matter
   — width alone would arm the mobile shell when desktop split-windows or
   OS scaling push the CSS viewport below 1024px.
   Session-delete is excluded here: it arms on TOUCH_QUERY at every width, so
   it is hidden in the pointer-only block below. */

@media (min-width: 1024px), (pointer: fine), (pointer: none) {
  [data-mobile-nav="toggle"],
  [data-mobile-nav="files"],
  [data-mobile-nav="file-upload"],
  [data-mobile-nav="fab"],
  [data-mobile-nav="backdrop"],
  [data-mobile-nav="session-log"],
  [data-mobile-nav="drawer-actions"] {
    display: none !important;
  }
}

/* Session-delete trio: hide on mouse-driven or pointer-less windows at ANY
   width. No width term — the injection is armed on touch at every width, so
   a width arm here would hide the item on wide touch (the device class the
   injection exists for). */
@media (pointer: fine), (pointer: none) {
  [data-mobile-nav="session-delete"],
  [data-mobile-nav="delete-dialog-backdrop"],
  [data-mobile-nav="delete-dialog"] {
    display: none !important;
  }
}
`
		].join("\n");
		//#endregion
		//#region src/client/effects/subagent-chip-touch.ts
		/**
		* Touch support for the lineage-count chip ("N sub-agents") that
		* `dsh-client-ui-subagent` renders in the session header.
		*
		* Host builds either open on hover timers (touch synthesizes mismatched
		* mouseenter/leave) or toggle via onClick. A phone tap that also runs this
		* shim's keyboard-path open then hits native onClick and flashes shut.
		*
		* Touch/pen only (mouse keeps native hover):
		* 1. Toggle via the component keyboard path (ArrowDown open, Escape close).
		* 2. Swallow the follow-up click on the trigger we toggled.
		* 3. Briefly swallow trusted synthesized hover on the lineage root / menu
		*    so hover-timer builds cannot cancel or resurrect.
		*
		* Returns a disposer that removes every listener.
		*/
		/** Count-variant trigger only: the switcher variant has its own onClick. */
		const CHIP_TRIGGER_SELECTOR = "[data-mobile-nav=\"frame\"] button[class*=\"_trigger\"][aria-haspopup=\"tree\"][aria-expanded]:not([class*=\"_switcherTrigger\"])";
		/**
		* Lineage root plus its menu. `ZKlsPq` (hover-only) and `h8S2Va` (onClick
		* toggle) are dsh-client-ui-subagent CSS-module hashes — re-audit on upgrade.
		*/
		const HOVER_SUBTREE_SELECTOR = "[class*=\"ZKlsPq_root\"], [class*=\"ZKlsPq_menu\"], [class*=\"h8S2Va_root\"], [class*=\"h8S2Va_menu\"]";
		/** How long after touch activity synthesized hover events stay suppressed. */
		const SWALLOW_WINDOW_MS = 800;
		/**
		* How long the tap's follow-up click stays suppressed on the trigger we
		* toggled through the keyboard path. A touch click lands a few ms after
		* pointerup; 1 s is a generous upper bound before the next deliberate tap.
		*/
		const CLICK_GRACE_MS = 1e3;
		const SWALLOWED_TYPES = [
			"mouseover",
			"mouseout",
			"mouseenter",
			"mouseleave"
		];
		function installSubagentChipTouch(ctx) {
			installMobileEffect(ctx, "dsh-web-mobile: lineage chip touch toggle", () => {
				if (typeof PointerEvent === "undefined") return void 0;
				let swallowUntil = 0;
				const armSwallowWindow = () => {
					swallowUntil = Date.now() + SWALLOW_WINDOW_MS;
				};
				let toggledTrigger = null;
				let toggledUntil = 0;
				const onPointerUp = (event) => {
					if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
					armSwallowWindow();
					const target = event.target;
					if (!(target instanceof Element)) return;
					const trigger = target.closest(CHIP_TRIGGER_SELECTOR);
					if (trigger === null) return;
					const open = trigger.getAttribute("aria-expanded") === "true";
					trigger.dispatchEvent(new KeyboardEvent("keydown", {
						key: open ? "Escape" : "ArrowDown",
						bubbles: true,
						cancelable: true
					}));
					toggledTrigger = trigger;
					toggledUntil = Date.now() + CLICK_GRACE_MS;
				};
				/**
				* Swallow the tap's follow-up click on the trigger we toggled so native
				* onClick cannot cancel the keyboard-path toggle. stopPropagation at
				* document capture blocks React delegation while letting other document
				* listeners observe. Identity-checked so menu rows and other taps pass.
				*/
				const onClick = (event) => {
					if (toggledTrigger === null) return;
					if (Date.now() >= toggledUntil) {
						toggledTrigger = null;
						return;
					}
					const target = event.target;
					if (!(target instanceof Element)) return;
					if (target.closest(CHIP_TRIGGER_SELECTOR) !== toggledTrigger) return;
					toggledTrigger = null;
					event.stopPropagation();
				};
				const onAnyPointerActivity = (event) => {
					if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
					armSwallowWindow();
				};
				const swallowSyntheticHover = (event) => {
					if (Date.now() >= swallowUntil) return;
					if (!event.isTrusted) return;
					const target = event.target;
					if (!(target instanceof Element)) return;
					if (target.closest(HOVER_SUBTREE_SELECTOR) === null) return;
					event.stopImmediatePropagation();
				};
				document.addEventListener("pointerdown", onAnyPointerActivity, true);
				document.addEventListener("pointerup", onPointerUp, true);
				document.addEventListener("click", onClick, true);
				for (const type of SWALLOWED_TYPES) document.addEventListener(type, swallowSyntheticHover, true);
				return () => {
					document.removeEventListener("pointerdown", onAnyPointerActivity, true);
					document.removeEventListener("pointerup", onPointerUp, true);
					document.removeEventListener("click", onClick, true);
					for (const type of SWALLOWED_TYPES) document.removeEventListener(type, swallowSyntheticHover, true);
				};
			});
		}
		//#endregion
		//#region src/client/effects/session-menu.ts
		const NS$1 = "mobileNav";
		/** The ui-workspace dictionary namespace the host session menu labels come from. */
		const WORKSPACE_NS = "workspace";
		/** Marker on the injected menu item (idempotence across React re-renders). */
		const DELETE_ITEM_MARKER = "data-mobile-nav=\"session-delete\"";
		/** Danger accent read from the theme, with a fixed fallback. */
		const DANGER_COLOR = "var(--dsw-alias-state-error-primary, #b91c1c)";
		/** 16px outline trash glyph (IconTrashOutline16 path), currentColor-filled. */
		const TRASH_SVG = "<svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M14.4782 4.84067L14.2138 10.1152C14.1102 12.1872 14.067 13.0115 13.3866 13.9607C13.1044 14.3546 12.7498 14.6912 12.3424 14.9535C11.8239 15.2872 11.2415 15.4316 10.5585 15.4998C9.88727 15.5668 9.04946 15.5656 7.99998 15.5656C6.95051 15.5656 6.1127 15.5668 5.44142 15.4998C4.75851 15.4316 4.17602 15.2872 3.65753 14.9535C3.25012 14.6912 2.89559 14.3546 2.61332 13.9607C1.93296 13.0115 1.88979 12.1872 1.78619 10.1152L1.52179 4.84067L2.89006 4.77277L3.15343 10.0463C3.26221 12.2218 3.32452 12.6015 3.72646 13.1624C3.90825 13.4161 4.13686 13.6334 4.39927 13.8023C4.66204 13.9714 5.00263 14.0792 5.57825 14.1367C6.16562 14.1953 6.92298 14.1963 7.99998 14.1963C9.07699 14.1963 9.83434 14.1953 10.4217 14.1367C10.9973 14.0792 11.3379 14.1367 11.6007 13.8023C11.8631 13.6334 12.0917 13.4161 12.2735 13.1624C12.6755 12.6015 12.7378 12.2218 12.8465 10.0463L13.1099 4.77277L14.4782 4.84067ZM5.43011 6.22849H6.7994V11.3909H5.43011V6.22849ZM9.20056 6.22849H10.5699V11.3909H9.20056V6.22849ZM8.53597 0.434431C9.17976 0.434431 9.6522 0.426926 10.0966 0.571258C10.2357 0.616451 10.3717 0.672554 10.502 0.738948C10.9182 0.951107 11.2464 1.29099 11.7015 1.74612L12.4978 2.54136H15.3742V3.91169H0.625732V2.54136H3.50218L4.29845 1.74612C4.75358 1.29099 5.08174 0.951107 5.49801 0.738948C5.62831 0.672554 5.76425 0.616451 5.90334 0.571258C6.34776 0.426926 6.82021 0.434431 7.46399 0.434431H8.53597ZM7.46399 1.80476C6.73208 1.80476 6.51641 1.81187 6.32617 1.87369C6.25545 1.89667 6.18668 1.92533 6.12041 1.95907C5.96398 2.03878 5.82348 2.16253 5.44142 2.54136H10.5585C10.1765 2.16253 10.036 2.03878 9.87955 1.95907C9.81329 1.92533 9.74452 1.89667 9.6738 1.87369C9.48356 1.81187 9.26789 1.80476 8.53597 1.80476H7.46399Z\" fill=\"currentColor\" /></svg>";
		/** Escape text destined for innerHTML (session titles are user content). */
		function escapeHtml(value) {
			return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
		}
		/**
		* Install the mobile session-delete menu. Touch-gated under TOUCH_QUERY so
		* large tablets keep the desktop layout but still get the delete item;
		* mouse-driven or pointer-less windows are a no-op. Disposer removes every
		* listener, observer, injected node, and the confirm dialog.
		*/
		function installSessionMenuDelete(ctx) {
			installMobileEffect(ctx, "dsh-web-mobile: session-menu delete", () => {
				const navT = ctx.locale.bind(NS$1);
				const wsT = (key, params) => ctx.locale.bind(WORKSPACE_NS)(key, params);
				let anchor = null;
				let injectRaf = 0;
				let dialogHost = null;
				let closeDialogOnKey = null;
				/** Resolve one session id for a row: title match, group position tiebreak. */
				const resolveSessionId = (row, title) => {
					const sessions = ctx.sessions.list.getSnapshot();
					const workspaces = ctx.workspaces.list.getSnapshot();
					const archived = new Set(workspaces.archivedSessionIds);
					const candidates = sessions.ids.filter((id) => {
						const summary = sessionById(sessions, id);
						return summary !== void 0 && !summary.blank && summary.displayTitle === title && !archived.has(id);
					});
					if (candidates.length === 1) return candidates[0];
					if (candidates.length === 0) return void 0;
					const group = row.closest("[class*=\"_groupSection\"]");
					if (group === null) return void 0;
					const headerTitle = group.querySelector(":scope > [class*=\"_projectRow\"] [class*=\"_title\"]")?.textContent?.trim();
					const owned = new Set(workspaces.items.flatMap((workspace) => workspace.sessionIds));
					const workspace = headerTitle === void 0 ? void 0 : workspaces.items.find((candidate) => candidate.title === headerTitle);
					const workspaceIds = workspace === void 0 ? [] : workspace.sessionIds;
					const sameTitleGroupIds = (workspace === void 0 ? sessions.ids.filter((id) => !owned.has(id) && !archived.has(id) && sessionById(sessions, id) !== void 0) : workspaceIds.filter((id) => !archived.has(id) && sessionById(sessions, id) !== void 0)).filter((id) => sessionById(sessions, id)?.displayTitle === title);
					const rows = [...group.querySelectorAll(":scope > [class*=\"_sessionRow\"]")];
					const rowIndex = rows.indexOf(row);
					return sameTitleGroupIds[rowIndex === -1 ? 0 : rows.slice(0, rowIndex).filter((candidate) => candidate.querySelector("[class*=\"_title\"]")?.textContent?.trim() === title).length];
				};
				/**
				* Read one menu item's visible label across host generations: nested
				* `_itemLabel` span beside an icon, or text directly in the button.
				* Falling back to the item's own textContent covers both — svg icons
				* contribute no text.
				*/
				const itemLabel = (item) => {
					return (item.querySelector("[class*=\"_itemLabel\"]") ?? item).textContent?.trim() ?? "";
				};
				/**
				* Whether a menu list is the host's per-session row menu. Containment
				* style, never an exact item count (hosts may add pin / other items).
				* rename + fork + archiveSession is the discriminating triple. Archived
				* rows swap archive for unarchive and get no delete item — resolution
				* excludes archived ids anyway.
				*/
				const isSessionMenu = (menu) => {
					const labels = [...menu.querySelectorAll("[role=\"menuitem\"]")].map(itemLabel);
					const rename = wsT("rename");
					const fork = wsT("menu.fork");
					return labels.includes(rename) && labels.includes(fork) && labels.includes(wsT("menu.archiveSession"));
				};
				const closeDialog = () => {
					if (closeDialogOnKey !== null) {
						document.removeEventListener("keydown", closeDialogOnKey, true);
						closeDialogOnKey = null;
					}
					if (dialogHost !== null) {
						dialogHost.backdrop.remove();
						dialogHost.card.remove();
						dialogHost = null;
					}
				};
				/**
				* Delete confirmation as a centered frosted-glass modal. Mounted on
				* `<body>`, not the frame: the third-party mobile shim captures clicks
				* inside the frame outside `[data-pane="sidebar"]` and would kill card
				* buttons. Body-level matches host portaled menus; backdrop flex centers
				* the card (base.css).
				*/
				const showDeleteDialog = (sessionId, title) => {
					closeDialog();
					const host = document.body;
					const backdrop = document.createElement("div");
					backdrop.dataset.mobileNav = "delete-dialog-backdrop";
					const card = document.createElement("div");
					card.dataset.mobileNav = "delete-dialog";
					card.setAttribute("role", "dialog");
					card.setAttribute("aria-modal", "true");
					card.innerHTML = `
        <div data-mobile-nav="delete-confirm-title">${escapeHtml(navT("deleteConfirmTitle"))}</div>
        <div data-mobile-nav="delete-confirm-desc">${escapeHtml(navT("deleteConfirmDesc", { title }))}</div>
        <div data-mobile-nav="delete-confirm-actions">
          <button type="button" data-mobile-nav="delete-confirm-no">${escapeHtml(navT("deleteConfirmNo"))}</button>
          <button type="button" data-mobile-nav="delete-confirm-yes">${escapeHtml(navT("deleteConfirmYes"))}</button>
        </div>
        <div data-mobile-nav="delete-error" role="alert" hidden></div>`;
					const noButton = card.querySelector("[data-mobile-nav=\"delete-confirm-no\"]");
					const yesButton = card.querySelector("[data-mobile-nav=\"delete-confirm-yes\"]");
					const errorLine = card.querySelector("[data-mobile-nav=\"delete-error\"]");
					noButton?.addEventListener("click", closeDialog);
					backdrop.addEventListener("click", (event) => {
						if (event.target !== backdrop) return;
						closeDialog();
					});
					const onKey = (event) => {
						if (event.key === "Escape") closeDialog();
					};
					document.addEventListener("keydown", onKey, true);
					closeDialogOnKey = onKey;
					const resetButtons = () => {
						if (yesButton !== null) {
							yesButton.disabled = false;
							yesButton.textContent = navT("deleteConfirmYes");
						}
						if (noButton !== null) noButton.disabled = false;
					};
					const fail = (message) => {
						if (errorLine !== null) {
							errorLine.textContent = message;
							errorLine.hidden = false;
						}
						resetButtons();
					};
					const mapError = (payload, reason) => {
						const code = payload?.error?.code;
						if (code === "session-not-found") return navT("deleteErrorNotFound");
						if (code === "session-busy") return navT("deleteErrorBusy");
						const message = payload?.error?.message ?? (reason instanceof Error ? reason.message : String(reason));
						return navT("deleteErrorGeneric", { message });
					};
					yesButton?.addEventListener("click", async () => {
						yesButton.disabled = true;
						if (noButton !== null) noButton.disabled = true;
						yesButton.textContent = navT("deletePending");
						if (errorLine !== null) errorLine.hidden = true;
						const wasCurrent = currentSessionIdOf(ctx.sessions.list.getSnapshot()) === sessionId;
						try {
							const response = await fetch("/api/mobile-nav.session.delete", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({ sessionId })
							});
							const payload = await response.json().catch(() => null);
							if (!response.ok || payload === null || payload.ok !== true) {
								fail(mapError(payload, /* @__PURE__ */ new Error(`HTTP ${response.status}`)));
								return;
							}
						} catch (reason) {
							fail(mapError(null, reason));
							return;
						}
						closeDialog();
						if (wasCurrent && sessionsCanClear(ctx.sessions)) ctx.sessions.clear();
						await ctx.sessions.refresh?.();
						if (wasCurrent && window.matchMedia("(max-width: 1023px) and (pointer: coarse)").matches) toggleDrawer(ctx);
					});
					host.appendChild(backdrop);
					backdrop.appendChild(card);
					dialogHost = {
						backdrop,
						card
					};
				};
				/** Show a non-destructive error card (session could not be resolved). */
				const showError = (message) => {
					closeDialog();
					const host = document.body;
					const backdrop = document.createElement("div");
					backdrop.dataset.mobileNav = "delete-dialog-backdrop";
					const card = document.createElement("div");
					card.dataset.mobileNav = "delete-dialog";
					card.setAttribute("role", "dialog");
					card.setAttribute("aria-modal", "true");
					card.innerHTML = `
        <div data-mobile-nav="delete-confirm-title">${escapeHtml(navT("deleteSession"))}</div>
        <div data-mobile-nav="delete-error" role="alert">${escapeHtml(message)}</div>
        <div data-mobile-nav="delete-confirm-actions">
          <button type="button" data-mobile-nav="delete-confirm-no">${escapeHtml(navT("deleteConfirmNo"))}</button>
        </div>`;
					card.querySelector("[data-mobile-nav=\"delete-confirm-no\"]")?.addEventListener("click", closeDialog);
					backdrop.addEventListener("click", (event) => {
						if (event.target !== backdrop) return;
						closeDialog();
					});
					const onKey = (event) => {
						if (event.key === "Escape") closeDialog();
					};
					document.addEventListener("keydown", onKey, true);
					closeDialogOnKey = onKey;
					host.appendChild(backdrop);
					backdrop.appendChild(card);
					dialogHost = {
						backdrop,
						card
					};
				};
				/** Inject the delete item into one open session menu (idempotent). */
				const injectInto = (menu) => {
					if (menu.querySelector(`[${DELETE_ITEM_MARKER}]`) !== null) return;
					const template = menu.querySelector("[role=\"menuitem\"]");
					const wrap = template?.parentElement;
					const viewport = menu.querySelector("[class*=\"_viewport\"]");
					if (template === null || wrap === null || wrap === void 0 || viewport === null) return;
					const clone = wrap.cloneNode(true);
					const button = clone.querySelector("[role=\"menuitem\"]");
					if (button === null) return;
					const icon = button.querySelector("[class*=\"_itemIcon\"]");
					if (icon !== null) {
						icon.innerHTML = TRASH_SVG;
						icon.style.color = DANGER_COLOR;
					}
					const label = button.querySelector("[class*=\"_itemLabel\"]");
					if (label !== null) {
						label.textContent = navT("deleteSession");
						label.style.color = DANGER_COLOR;
					} else if (button.firstElementChild === null) {
						button.textContent = navT("deleteSession");
						button.style.color = DANGER_COLOR;
					}
					button.setAttribute("data-mobile-nav", "session-delete");
					button.addEventListener("click", (event) => {
						event.preventDefault();
						event.stopPropagation();
						const captured = anchor;
						captured?.button.click();
						try {
							if (captured === null || captured === void 0) {
								showError(navT("deleteErrorResolve"));
								return;
							}
							const sessionId = resolveSessionId(captured.row, captured.title);
							if (sessionId === void 0) {
								showError(navT("deleteErrorResolve"));
								return;
							}
							showDeleteDialog(sessionId, captured.title);
						} catch (reason) {
							console.error("[dsh-web-mobile] session delete failed:", reason);
							showError(navT("deleteErrorGeneric", { message: reason instanceof Error ? reason.message : String(reason) }));
						}
					});
					viewport.appendChild(clone);
				};
				/**
				* Inject into every open session menu. Blank (new-session) rows are
				* excluded: host title is localized "New session" while `displayTitle`
				* stays empty, so delete could never resolve. Known ceiling: a normal
				* session titled exactly that label is also skipped.
				*/
				const injectAll = () => {
					const blankLabel = wsT("session.new");
					for (const menu of document.querySelectorAll("[role=\"menu\"]")) {
						if (!isSessionMenu(menu)) continue;
						if (anchor !== null && anchor.title === blankLabel) continue;
						injectInto(menu);
					}
				};
				const scheduleInject = () => {
					if (injectRaf !== 0) return;
					injectRaf = requestAnimationFrame(() => {
						injectRaf = 0;
						injectAll();
					});
				};
				const onDocumentClick = (event) => {
					const target = event.target;
					if (target === null) return;
					const row = target.closest("[class*=\"_sessionRow\"]");
					if (row === null) return;
					const button = row.querySelector("button");
					if (button === null) return;
					anchor = {
						button,
						row,
						title: row.querySelector("[class*=\"_title\"]")?.textContent?.trim() ?? ""
					};
					scheduleInject();
				};
				document.addEventListener("click", onDocumentClick, true);
				const observer = new MutationObserver((records) => {
					for (const record of records) {
						if (record.type !== "childList") continue;
						const target = record.target;
						if (target === document.body) {
							scheduleInject();
							break;
						}
						if (target instanceof HTMLElement && (target.matches("[role=\"menu\"]") || target.closest("[role=\"menu\"]") !== null)) {
							scheduleInject();
							break;
						}
					}
				});
				observer.observe(document.body, {
					childList: true,
					subtree: true
				});
				injectAll();
				return () => {
					document.removeEventListener("click", onDocumentClick, true);
					observer.disconnect();
					if (injectRaf !== 0) cancelAnimationFrame(injectRaf);
					closeDialog();
					anchor = null;
				};
			}, TOUCH_QUERY);
		}
		//#endregion
		//#region src/client/effects/composer-keyboard-guard.ts
		/**
		* Prevents composer control taps from re-raising a dismissed soft keyboard.
		*
		* Host `keepFocus` (mousedown on send/stop/+) calls preventDefault then
		* programmatic editor.focus(). On iOS WebKit that re-opens the keyboard after
		* scroll-dismiss; the `+` path also focusDraftEditor before opening the
		* command menu, which shifts the row so a second tap misses the button.
		*
		* On iOS WebKit or coarse pointer: capture pointerdown/touchstart/mousedown
		* inside the composer card (not the editing surface), shadow
		* `[data-composer-input].focus` with a no-op for 700ms, then restore.
		* keepFocus's preventDefault still runs; editor tap-to-type restores early.
		* focusin blur inside the window covers paths that bypass the shadow.
		* DOM: `[data-composer-card]`, `[data-composer-input]` — audit on upgrades.
		* Interops with session-focus-guard via SHADOW_MARKER.
		*/
		/** Composer card root that owns the fixed control cluster. */
		const COMPOSER_CARD_SELECTOR = "[data-composer-card]";
		/** Lexical editing surface (only element allowed to raise the keyboard). */
		const COMPOSER_INPUT_SELECTOR$2 = "[data-composer-input]";
		/** Marker on the editor while focus is shadowed; shared with session-focus-guard. */
		const SHADOW_MARKER = "data-mobile-nav-focus-shadow";
		function installComposerKeyboardGuard(ctx) {
			installMobileEffect(ctx, "dsh-web-mobile: composer keyboard guard", () => {
				const ios = detectIosWebKit(navigator, typeof CSS !== "undefined" && typeof CSS.supports === "function" ? CSS.supports.bind(CSS) : null);
				const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
				if (!ios && !coarse) return;
				/** Shadow restore timer; non-zero means the guard window is open (see onFocusIn). */
				let shadowTimer = 0;
				/** Remove the focus shadow and clear the guard window (must zero shadowTimer). */
				const restore = () => {
					window.clearTimeout(shadowTimer);
					shadowTimer = 0;
					const el = document.querySelector(`[${SHADOW_MARKER}]`);
					if (el === null) return;
					el.removeAttribute(SHADOW_MARKER);
					const shadowed = el;
					if (Object.prototype.hasOwnProperty.call(el, "focus")) delete shadowed.focus;
				};
				const onPointerDown = (event) => {
					const target = event.target;
					if (!(target instanceof Element)) return;
					if (typeof target.closest !== "function") return;
					const card = target.closest(COMPOSER_CARD_SELECTOR);
					if (card === null) return;
					const editor = card.querySelector(COMPOSER_INPUT_SELECTOR$2);
					if (editor === null) return;
					if (target.closest(COMPOSER_INPUT_SELECTOR$2) !== null) {
						restore();
						return;
					}
					restore();
					editor.setAttribute(SHADOW_MARKER, "");
					Object.defineProperty(editor, "focus", {
						configurable: true,
						writable: true,
						value: function swallowedFocus() {}
					});
					window.clearTimeout(shadowTimer);
					shadowTimer = window.setTimeout(restore, 700);
				};
				const onFocusIn = (event) => {
					if (shadowTimer === 0) return;
					const target = event.target;
					if (!(target instanceof HTMLElement)) return;
					if (target.closest(COMPOSER_INPUT_SELECTOR$2) === null) return;
					target.blur();
				};
				document.addEventListener("pointerdown", onPointerDown, true);
				document.addEventListener("touchstart", onPointerDown, true);
				document.addEventListener("mousedown", onPointerDown, true);
				document.addEventListener("focusin", onFocusIn, true);
				return () => {
					document.removeEventListener("pointerdown", onPointerDown, true);
					document.removeEventListener("touchstart", onPointerDown, true);
					document.removeEventListener("mousedown", onPointerDown, true);
					document.removeEventListener("focusin", onFocusIn, true);
					restore();
				};
			});
		}
		/**
		* CSS px to lift the composer seat by; 0 rests (fail-open for every
		* unverified model, not just for "no overlap").
		*/
		function computeComposerLift(state) {
			const { seatBottom, viewportHeight, scale, scrollY, offsetTop } = state;
			if (!Number.isFinite(seatBottom) || !Number.isFinite(viewportHeight)) return 0;
			if (!Number.isFinite(scale) || Math.abs(scale - 1) > .01) return 0;
			if (!Number.isFinite(scrollY) || !Number.isFinite(offsetTop)) return 0;
			if (Math.abs(scrollY - offsetTop) > 24) return 0;
			const overlap = seatBottom - viewportHeight;
			return overlap > 0 ? overlap : 0;
		}
		/** Host composer seat, scoped under the plugin frame marker. */
		const SEAT_SELECTOR = "[data-mobile-nav=\"frame\"] [class*=\"_composerSeat\"]";
		/** The Lexical editing surface — the only focus that arms the lift. */
		const COMPOSER_INPUT_SELECTOR$1 = "[data-composer-input]";
		function installComposerKeyboardLift(ctx) {
			installMobileEffect(ctx, "dsh-web-mobile: composer keyboard lift", () => {
				if (!detectIosWebKit(navigator, typeof CSS !== "undefined" && typeof CSS.supports === "function" ? CSS.supports.bind(CSS) : null)) return;
				const viewport = window.visualViewport;
				if (!viewport) return void 0;
				let seat = null;
				let appliedLift = 0;
				let frame = 0;
				const sync = () => {
					frame = 0;
					if (seat === null || !seat.isConnected) return;
					const lift = computeComposerLift({
						seatBottom: seat.getBoundingClientRect().bottom + appliedLift,
						viewportHeight: viewport.height,
						scale: viewport.scale,
						scrollY: window.scrollY,
						offsetTop: viewport.offsetTop
					});
					appliedLift = lift;
					seat.style.transform = lift > 0 ? `translateY(${-lift}px)` : "";
				};
				const schedule = () => {
					if (frame === 0) frame = requestAnimationFrame(sync);
				};
				const release = () => {
					viewport.removeEventListener("resize", schedule);
					viewport.removeEventListener("scroll", schedule);
					window.removeEventListener("scroll", schedule);
					if (frame !== 0) {
						cancelAnimationFrame(frame);
						frame = 0;
					}
					if (seat !== null) seat.style.transform = "";
					seat = null;
					appliedLift = 0;
				};
				const onFocusIn = (event) => {
					const target = event.target;
					if (!(target instanceof Element) || target.closest(COMPOSER_INPUT_SELECTOR$1) === null) return;
					release();
					const found = document.querySelector(SEAT_SELECTOR);
					if (found === null) return;
					seat = found;
					viewport.addEventListener("resize", schedule);
					viewport.addEventListener("scroll", schedule);
					window.addEventListener("scroll", schedule, { passive: true });
					schedule();
				};
				const onFocusOut = (event) => {
					const target = event.target;
					if (!(target instanceof Element) || target.closest(COMPOSER_INPUT_SELECTOR$1) === null) return;
					const next = event.relatedTarget;
					if (next instanceof Element && next.closest(SEAT_SELECTOR) !== null) return;
					release();
				};
				document.addEventListener("focusin", onFocusIn, true);
				document.addEventListener("focusout", onFocusOut, true);
				return () => {
					document.removeEventListener("focusin", onFocusIn, true);
					document.removeEventListener("focusout", onFocusOut, true);
					release();
				};
			});
		}
		//#endregion
		//#region src/client/effects/composer-plus-toggle.ts
		/**
		* Makes a second tap on the composer `+` button close the command menu.
		*
		* Host `toggleSource()` can dismiss when launcher matches and the menu is
		* open, but the `+` onClick runs `focusDraftEditor` first. That update path
		* calls `inputTriggers.track()`, which clears the launcher while leaving the
		* menu open — so the dismiss branch is unreachable and every tap re-opens.
		* (`aria-expanded` on `+` stays false while the menu is visible for the same
		* reason.)
		*
		* Outside-dismiss also skips the composer card, so tapping `+` inside the
		* card never closes via that path. `shell.dismissPopup()` targets popupSelect,
		* not this MenuView (`data-trigger-menu`).
		*
		* Fix: on capture, note whether the menu was open before the tap; on bubble
		* (after host handlers), if it is still open, dispatch Escape on the Lexical
		* root (`[data-composer-input]`) — the host's own close path. Leave the
		* open-from-closed path alone.
		*/
		/** Host `+` button class fragment; model/permission triggers use `_trigger`. */
		const ADD_SELECTOR = "[class*=\"_add\"]";
		/** Slash/command menu root: MenuView's stable marker (safer than style hashes). */
		const MENU_SELECTOR = "[data-trigger-menu]";
		/** Lexical editable root: host maps Escape to close only when keydown lands here. */
		const EDITOR_SELECTOR = "[data-composer-input]";
		/** After dismiss React removes the node; require a non-zero box to treat as open. */
		const isVisible = (el) => {
			const box = el.getBoundingClientRect();
			return box.width > 0 && box.height > 0 && el.getClientRects().length > 0;
		};
		const openMenu = () => {
			for (const el of document.querySelectorAll(MENU_SELECTOR)) if (isVisible(el)) return el;
			return null;
		};
		const editorEl = () => {
			const el = document.querySelector(EDITOR_SELECTOR);
			return el instanceof HTMLElement ? el : null;
		};
		/**
		* Command menu does not need the soft keyboard.
		*
		* Before tapping `+`, the editor often still has DOM focus (keyboard dismissed
		* by scroll). Host `keepFocus` preventDefaults button mousedown, so the tap
		* does not blur; Android then re-raises the IME. The focus shadow only blocks
		* programmatic `focus()`, not this path — blur the editor on capture so IME
		* has no surface to attach to.
		*/
		const dropEditorFocus = () => {
			const editor = editorEl();
			if (editor !== null && document.activeElement === editor) editor.blur();
		};
		/** Host close path; no-op when the menu is closed (`arbitrate` returns 'pass'). */
		const escapeEditor = () => {
			const editor = editorEl();
			if (editor === null) return;
			editor.dispatchEvent(new KeyboardEvent("keydown", {
				key: "Escape",
				code: "Escape",
				keyCode: 27,
				which: 27,
				bubbles: true,
				cancelable: true
			}));
		};
		function installComposerPlusToggle(ctx) {
			installMobileEffect(ctx, "dsh-web-mobile: composer plus toggle", () => {
				/** Whether the menu was open before this click (capture, before host onClick). */
				let openBeforeClick = false;
				/** Deferred keyboard-collapse timers while the menu is open; cancelled on editor tap. */
				let collapseTimers = [];
				const cancelCollapse = () => {
					for (const id of collapseTimers) window.clearTimeout(id);
					collapseTimers = [];
				};
				const onClickCapture = (event) => {
					const target = event.target;
					openBeforeClick = target instanceof Element && target.closest(ADD_SELECTOR) !== null && openMenu() !== null;
				};
				const onPointerDown = (event) => {
					const target = event.target;
					if (!(target instanceof Element)) return;
					if (target.closest(ADD_SELECTOR) === null) return;
					dropEditorFocus();
				};
				const onClickBubble = (event) => {
					const wasOpen = openBeforeClick;
					openBeforeClick = false;
					const target = event.target;
					if (!(target instanceof Element) || target.closest(ADD_SELECTOR) === null) return;
					if (wasOpen && openMenu() !== null) escapeEditor();
					cancelCollapse();
					for (const delay of [
						120,
						320,
						640
					]) collapseTimers.push(window.setTimeout(() => {
						if (openMenu() !== null) dropEditorFocus();
					}, delay));
				};
				/** Editor tap means the user wants to type — cancel deferred keyboard collapse. */
				const onEditorPointerDown = (event) => {
					const target = event.target;
					if (!(target instanceof Element)) return;
					if (target.closest(EDITOR_SELECTOR) === null) return;
					cancelCollapse();
				};
				document.addEventListener("pointerdown", onPointerDown, true);
				document.addEventListener("pointerdown", onEditorPointerDown, true);
				document.addEventListener("click", onClickCapture, true);
				document.addEventListener("click", onClickBubble, false);
				return () => {
					cancelCollapse();
					document.removeEventListener("pointerdown", onPointerDown, true);
					document.removeEventListener("pointerdown", onEditorPointerDown, true);
					document.removeEventListener("click", onClickCapture, true);
					document.removeEventListener("click", onClickBubble, false);
				};
			});
		}
		//#endregion
		//#region src/client/effects/workspace-chip-toggle.ts
		/**
		* Makes a second tap on the hero workspace chip close the open picker.
		*
		* The chip toggles correctly, but WorkspacePickFlow mounts Menu with
		* `anchor={null}` (empty rootRef span), so the chip sits outside Menu's
		* outside-dismiss exemption. Open + re-tap: pointerdown closes, then click
		* toggles open again — net reopen. (Preset triggers pass a real button
		* anchor and do not have this bug.)
		*
		* When the chip reports aria-expanded="true" and a portal menu is present,
		* arm on pointerdown; on the matching click, stopPropagation so React never
		* re-toggles open. Opening (menu closed) is left alone. Read open state from
		* aria-expanded at pointerdown (pre-render).
		*/
		/** Hero workspace chip: direct child of the hero row (preset trigger is nested under Menu's anchor). */
		const CHIP_SELECTOR = "[class*=\"heroWorkspaceRow\"] > button[aria-haspopup=\"menu\"]";
		/** Host Menu portal list; outside-dismiss only exists while this is present. */
		const OPEN_MENU_SELECTOR = "[role=\"menu\"]";
		function installWorkspaceChipToggle(ctx) {
			installMobileEffect(ctx, "dsh-web-mobile: workspace chip toggle", () => {
				/** Chip that reported expanded before this stroke; otherwise null. */
				let armed = null;
				const chipFrom = (target) => target instanceof Element ? target.closest(CHIP_SELECTOR) : null;
				const onPointerDownCapture = (event) => {
					armed = null;
					const chip = chipFrom(event.target);
					if (chip === null) return;
					if (chip.getAttribute("aria-expanded") !== "true") return;
					if (document.querySelector(OPEN_MENU_SELECTOR) === null) return;
					armed = chip;
				};
				const onClickCapture = (event) => {
					const chip = armed;
					armed = null;
					if (chip === null || chipFrom(event.target) !== chip) return;
					event.stopPropagation();
				};
				document.addEventListener("pointerdown", onPointerDownCapture, true);
				document.addEventListener("click", onClickCapture, true);
				return () => {
					armed = null;
					document.removeEventListener("pointerdown", onPointerDownCapture, true);
					document.removeEventListener("click", onClickCapture, true);
				};
			});
		}
		//#endregion
		//#region src/client/effects/team-chip-toggle.ts
		/**
		* Makes a second tap on the agent-team chip close the open panel.
		*
		* Host trigger onClick only opens (or focuses when already open); close is
		* outside-pointer dismiss or Escape. On touch, re-tapping the chip therefore
		* never toggles closed.
		*
		* When the trigger reports aria-expanded="true" and the body-portal panel is
		* present, arm on pointerdown; on the matching click, synthesize a body
		* pointerdown (outside root/panel → host dismiss) then stopPropagation so the
		* host onClick cannot focus the panel. Order matters: dismiss must run before
		* the host sees the click. Read open state from aria-expanded at pointerdown
		* (pre-render), matching workspace-chip-toggle.
		*/
		/** Agent-team chip root (stable host marker). */
		const ROOT_SELECTOR = "[data-team-action]";
		/** Direct child trigger button (aria-haspopup="dialog"). */
		const TRIGGER_SELECTOR = "[data-team-action] > button[aria-haspopup=\"dialog\"]";
		/** Body-portal panel (stable marker + role="dialog"). */
		const PANEL_SELECTOR = "[data-team-panel]";
		function installTeamChipToggle(ctx) {
			installMobileEffect(ctx, "dsh-web-mobile: team chip toggle", () => {
				/** Trigger that reported expanded before this stroke; otherwise null. */
				let armed = null;
				const triggerFrom = (target) => target instanceof Element ? target.closest(TRIGGER_SELECTOR) : null;
				const onPointerDownCapture = (event) => {
					armed = null;
					const trigger = triggerFrom(event.target);
					if (trigger === null) return;
					if (trigger.getAttribute("aria-expanded") !== "true") return;
					if (document.querySelector(ROOT_SELECTOR) === null) return;
					if (document.querySelector(PANEL_SELECTOR) === null) return;
					armed = trigger;
				};
				const onClickCapture = (event) => {
					const trigger = armed;
					armed = null;
					if (trigger === null || triggerFrom(event.target) !== trigger) return;
					document.body.dispatchEvent(new PointerEvent("pointerdown", {
						bubbles: true,
						cancelable: true
					}));
					event.stopPropagation();
				};
				document.addEventListener("pointerdown", onPointerDownCapture, true);
				document.addEventListener("click", onClickCapture, true);
				return () => {
					armed = null;
					document.removeEventListener("pointerdown", onPointerDownCapture, true);
					document.removeEventListener("click", onClickCapture, true);
				};
			});
		}
		//#endregion
		//#region src/client/effects/model-menu-anchor.ts
		/**
		* Re-anchors the model / reasoning-level menu to the composer card center.
		*
		* The host portals the menu to `body` and aligns its right edge to the
		* trigger, which sits on the right half of the card — the menu reads left-
		* biased. CSS centering under `_root > _menu` dies after the portal; this
		* layer recenters with JS (`left` only).
		*
		* Prefer horizontal center of `[data-composer-card]`; fall back to trigger
		* center plus viewport gutter. Only the model-menu class hash is touched.
		*
		* Cost: full-document queries run only on interactions that may open/close
		* the menu (`refresh` → cache `active`). Scroll/resize use `follow` on the
		* cached node (zero query when closed). Scroll still needed: the card moves
		* while the menu is open. MutationObserver is avoided — streaming would
		* scan the whole tree every frame.
		*/
		/** Model trigger (icon chip). */
		const MODEL_TRIGGER = "[class*=\"_7KE1Ra_trigger\"]";
		/** Model / reasoning menu (portaled under body). */
		const MODEL_MENU = "[class*=\"_7KE1Ra_menu\"]";
		/** Composer card — menu is centered horizontally within it. */
		const COMPOSER_CARD = "[data-composer-card]";
		/** Viewport edge inset. */
		const GUTTER = 8;
		/** Host may rewrite position during open animation / remeasure; settle retries (ms). */
		const SETTLE_MS = [
			0,
			60,
			200
		];
		function installModelMenuAnchor(ctx) {
			installMobileEffect(ctx, "dsh-web-mobile: model menu anchor", () => {
				let raf = 0;
				const timers = [];
				/** Confirmed-open menu node; null when none (scroll path skips queries). */
				let active = null;
				const laidOut = (el) => {
					if (el === null) return null;
					const box = el.getBoundingClientRect();
					return box.width > 0 && box.height > 0 ? box : null;
				};
				/** Sole full-document query entry (interaction path only; see header cost note). */
				const findMenu = () => {
					for (const el of document.querySelectorAll(MODEL_MENU)) if (laidOut(el) !== null) return el;
					return null;
				};
				/** Center the menu in the composer card (or on the trigger). Writes inline left only. */
				const place = (menu) => {
					const menuBox = laidOut(menu);
					if (menuBox === null) return;
					const width = menuBox.width;
					const viewport = document.documentElement.clientWidth;
					const max = Math.max(GUTTER, viewport - width - GUTTER);
					const card = document.querySelector(COMPOSER_CARD);
					const cardBox = card === null ? null : card.getBoundingClientRect();
					const trigger = cardBox !== null && cardBox.width > 0 ? null : document.querySelector(MODEL_TRIGGER);
					const triggerBox = trigger === null ? null : trigger.getBoundingClientRect();
					const center = cardBox !== null && cardBox.width > 0 ? cardBox.left + cardBox.width / 2 : triggerBox === null ? null : triggerBox.left + triggerBox.width / 2;
					if (center === null) return;
					const left = Math.min(Math.max(center - width / 2, GUTTER), max);
					const next = `${Math.round(left)}px`;
					if (menu.style.left !== next) menu.style.left = next;
				};
				/** Interaction path: refresh cache (queries) and place. */
				const refresh = () => {
					active = findMenu();
					if (active !== null) place(active);
				};
				/** Scroll / resize path: recompute from cached node only (no query). */
				const follow = () => {
					if (active === null) return;
					if (laidOut(active) === null) {
						active = null;
						return;
					}
					place(active);
				};
				const schedule = (run) => {
					if (raf !== 0) return;
					raf = window.requestAnimationFrame(() => {
						raf = 0;
						run();
					});
				};
				/** Settle retries after interaction (host may rewrite during open animation). */
				const scheduleRefresh = () => {
					schedule(refresh);
					for (const delay of SETTLE_MS) timers.push(window.setTimeout(() => schedule(refresh), delay));
					while (timers.length > SETTLE_MS.length * 2) {
						const stale = timers.shift();
						if (stale !== void 0) window.clearTimeout(stale);
					}
				};
				/** Query only for interactions that may open/close the menu. */
				const touchesMenu = (event) => {
					const target = event.target;
					if (!(target instanceof Element)) return false;
					return target.closest(MODEL_TRIGGER) !== null || target.closest(MODEL_MENU) !== null;
				};
				const onPointerDown = (event) => {
					if (touchesMenu(event)) scheduleRefresh();
				};
				const onKeyDown = (event) => {
					if (touchesMenu(event)) scheduleRefresh();
				};
				const onFocusIn = (event) => {
					if (touchesMenu(event)) scheduleRefresh();
				};
				const onClick = (event) => {
					if (touchesMenu(event)) scheduleRefresh();
				};
				const onViewportChange = () => {
					schedule(follow);
				};
				document.addEventListener("pointerdown", onPointerDown, true);
				document.addEventListener("keydown", onKeyDown, true);
				document.addEventListener("focusin", onFocusIn, true);
				document.addEventListener("click", onClick, true);
				window.addEventListener("resize", onViewportChange);
				document.addEventListener("scroll", onViewportChange, true);
				return () => {
					document.removeEventListener("pointerdown", onPointerDown, true);
					document.removeEventListener("keydown", onKeyDown, true);
					document.removeEventListener("focusin", onFocusIn, true);
					document.removeEventListener("click", onClick, true);
					window.removeEventListener("resize", onViewportChange);
					document.removeEventListener("scroll", onViewportChange, true);
					if (raf !== 0) window.cancelAnimationFrame(raf);
					for (const timer of timers) window.clearTimeout(timer);
					timers.length = 0;
					active = null;
				};
			});
		}
		//#endregion
		//#region src/client/effects/shortcut-modal-keyboard-guard.ts
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
		const SETTINGS_MODAL = "[data-shortcut-modal=\"settings\"]";
		const SHORTCUT_MODAL = "[data-shortcut-modal=\"shortcuts\"]";
		/** The field the Modal's mount-time focus must not reach, on phones only. */
		const AUTOFOCUS_FIELD = SHORTCUT_MODAL + " [data-modal-autofocus]";
		/**
		* Keep the shortcut modal's search field from grabbing focus (and the soft
		* keyboard) by itself, on the mobile breakpoint only.
		* @param ctx - client root context.
		*/
		function installShortcutModalKeyboardGuard(ctx) {
			installMobileEffect(ctx, "dsh-web-mobile: shortcut modal keyboard guard", () => {
				const proto = HTMLInputElement.prototype;
				let original = null;
				const arm = () => {
					if (original !== null) return;
					const previous = proto.focus;
					original = previous;
					proto.focus = function focus(options) {
						if (this.matches(AUTOFOCUS_FIELD)) return;
						previous.call(this, options);
					};
				};
				const disarm = () => {
					if (original === null) return;
					proto.focus = original;
					original = null;
				};
				const sync = () => {
					if (document.querySelector(SETTINGS_MODAL) !== null || document.querySelector(SHORTCUT_MODAL) !== null) arm();
					else disarm();
				};
				const observer = new MutationObserver(sync);
				observer.observe(document.body, { childList: true });
				sync();
				return () => {
					observer.disconnect();
					disarm();
				};
			});
		}
		//#endregion
		//#region src/client/effects/session-focus-guard.ts
		/**
		* Mobile guard: entering a session must not raise the soft keyboard by itself.
		*
		* Conversation InputBar focuses the Lexical editor from a passive effect keyed
		* on `[locked, sessionId, editor]` — every session switch programmatically
		* focuses the editing surface. On a phone that costs half the screen when the
		* user usually wants to read history first (issue #140).
		*
		* On a snapshot-observed current-session change, open a short guard window and
		* shadow the editor's own `focus` (same recipe / marker as
		* composer-keyboard-guard.ts) so host autofocus is a no-op. Native taps are
		* unaffected. The window is finite and closes early on an editing-surface tap
		* so later programmatic refocus (e.g. `+` command menu) is not swallowed.
		*
		* Timing: host focus runs in a passive effect after commit; a MutationObserver
		* microtask runs before that and re-shadows a remounted `[data-composer-input]`.
		* When InputBar remounts, host focus can run in the commit's layout-effect phase
		* before the observer microtask — so a focusin fallback blurs any focus that
		* lands on the editing surface during the window (same as the keepFocus guard:
		* blur at focusin capture before IME rises; drafts live in host keyboard state).
		*
		* DOM: `[data-composer-input]`, shared `data-mobile-nav-focus-shadow` marker.
		* Re-audit when the conversation package upgrades.
		*/
		/** Guard window for one session switch: long enough for slow phones + passive
		*  effects; short enough that a quick `+` tap rarely lands inside it. */
		const FOCUS_GUARD_WINDOW_MS = 800;
		/** Lexical editing surface — the only element whose autofocus we swallow. */
		const COMPOSER_INPUT_SELECTOR = "[data-composer-input]";
		/**
		* Keep the session-switch autofocus from raising the soft keyboard, on the
		* mobile breakpoint only.
		* @param ctx - client root context.
		*/
		function installSessionFocusGuard(ctx) {
			installMobileEffect(ctx, "dsh-web-mobile: session focus guard", () => {
				const list = ctx.sessions.list;
				let lastSessionId = currentSessionIdOf(list.getSnapshot());
				let windowTimer = 0;
				let windowOpen = false;
				const restore = () => {
					window.clearTimeout(windowTimer);
					windowTimer = 0;
					windowOpen = false;
					const el = document.querySelector(`[${SHADOW_MARKER}]`);
					if (el === null) return;
					el.removeAttribute(SHADOW_MARKER);
					const shadowed = el;
					if (Object.prototype.hasOwnProperty.call(el, "focus")) delete shadowed.focus;
				};
				const shadow = (el) => {
					if (el.hasAttribute("data-mobile-nav-focus-shadow")) return;
					el.setAttribute(SHADOW_MARKER, "");
					Object.defineProperty(el, "focus", {
						configurable: true,
						writable: true,
						value: function swallowedFocus() {}
					});
				};
				const arm = () => {
					restore();
					windowOpen = true;
					const el = document.querySelector(COMPOSER_INPUT_SELECTOR);
					if (el !== null) shadow(el);
					windowTimer = window.setTimeout(restore, FOCUS_GUARD_WINDOW_MS);
				};
				const observer = new MutationObserver(() => {
					if (!windowOpen) return;
					const el = document.querySelector(COMPOSER_INPUT_SELECTOR);
					if (el !== null) shadow(el);
				});
				const onPointerDown = (event) => {
					if (!windowOpen) return;
					const target = event.target;
					if (target instanceof Element && target.closest(COMPOSER_INPUT_SELECTOR) !== null) restore();
				};
				const onFocusIn = (event) => {
					if (!windowOpen) return;
					const target = event.target;
					if (target instanceof HTMLElement && target.closest(COMPOSER_INPUT_SELECTOR) !== null) target.blur();
				};
				const unsubscribe = list.subscribe(() => {
					const current = currentSessionIdOf(list.getSnapshot());
					if (current === lastSessionId) return;
					lastSessionId = current;
					arm();
				});
				observer.observe(document.documentElement, {
					childList: true,
					subtree: true
				});
				document.addEventListener("pointerdown", onPointerDown, true);
				document.addEventListener("focusin", onFocusIn, true);
				return () => {
					unsubscribe();
					observer.disconnect();
					document.removeEventListener("pointerdown", onPointerDown, true);
					document.removeEventListener("focusin", onFocusIn, true);
					restore();
				};
			});
		}
		//#endregion
		//#region src/client/core/layout-compat.ts
		/**
		* The "leave the panel" action, or null when the host has no panel-selection
		* API at all (rc.6).
		*
		* The sidebar panel list is an alpha.2-era surface, so on rc.6 nothing arms
		* this — but the capability is probed rather than assumed, because a plugin
		* that throws on an older host is worse than one that goes inert.
		*
		* @param layout - `ctx.layout` as handed to the plugin.
		* @returns a no-argument action calling `selectPanel(null)`, or null.
		*/
		function panelSelectorOf(layout) {
			if (typeof layout !== "object" || layout === null) return null;
			const select = layout.selectPanel;
			if (typeof select !== "function") return null;
			return () => {
				select.call(layout, null);
			};
		}
		//#endregion
		//#region src/client/effects/panel-exit.ts
		/**
		* Sidebar panel exit.
		*
		* Host sidebar panels replace the main area (`ctx.layout.selectPanel(id)`),
		* with no built-in way back: `PanelRow.onClick` is `selectPanel(id)` (re-tapping
		* the selected row stays on the panel), and the only `selectPanel(null)` caller
		* is `workspace.replaceMain` (opening a session). On a phone that is a dead end
		* unless the user opens the drawer and picks a session.
		*
		* Three exits, same `exit` action:
		*  1. system back / back gesture (popstate) — returned task
		*  2. re-tap the selected panel row — installPanelRowExit
		*  3. top-left FAB (back-to-conversation while a panel owns main) —
		*     createOverlayTask in overlay-backdrop-fab.ts
		*/
		/**
		* Host marks the selected sidebar panel row with `aria-current="page"`
		* (null in conversation, `"page"` on a panel). `panelRow` is a CSS-module
		* fragment matched as a substring. Why DOM, not `ctx.layout`: layout exposes
		* no readable panel id; selection lives on the host's PanelInfo store.
		*/
		const PANEL_ROW_ACTIVE = "[class*=\"panelRow\"][aria-current=\"page\"]";
		/**
		* True from exit start until React commits the swap. During that window the
		* row still shows `aria-current="page"`, but the panel is semantically gone —
		* history must treat it as closed or a second entry arms mid-flight.
		*/
		let panelLeaving = false;
		/** Whether a panel owns the main area (DOM truth, ignoring the exit window). */
		function panelOwnsMainArea() {
			return document.querySelector(PANEL_ROW_ACTIVE) !== null;
		}
		/** Whether a panel owns the main area, counting the in-flight exit as closed. */
		function panelViewOpen() {
			return !panelLeaving && panelOwnsMainArea();
		}
		/** Marker set on the frame while the incoming conversation fades in. */
		const PANEL_EXIT_ATTR = "data-mobile-panel-exit";
		/** Safety net: clears the marker if the reveal animation never fires. */
		const PANEL_EXIT_FALLBACK_MS = 2e3;
		/**
		* Leave the panel: switch back to the conversation and fade the incoming
		* content in.
		*
		* The switch is not delayed behind an outgoing animation: `selectPanel(null)`
		* remounts the conversation and that commit can block the main thread for
		* hundreds of ms on a long session. Fading the panel out first would show a
		* blank screen for that window. Keeping the panel opaque until commit makes
		* it disappear on the same frame the conversation appears; only the fade-in
		* remains.
		*
		* @param layout - `ctx.layout`; probed, never assumed.
		* @returns the exit action (idempotent while an exit is in flight) and the
		*   system-back reconciler task.
		*/
		function createPanelExit(layout) {
			const selectPanel = panelSelectorOf(layout);
			const supported = selectPanel !== null;
			let leaving = false;
			let cleanupTimer = null;
			function onAnimationEnd(event) {
				if (event.animationName === "dsh-mobile-panel-reveal") cleanup();
			}
			function cleanup() {
				if (cleanupTimer !== null) {
					window.clearTimeout(cleanupTimer);
					cleanupTimer = null;
				}
				const frame = getFrame();
				if (frame !== null) {
					frame.removeEventListener("animationend", onAnimationEnd, true);
					frame.removeAttribute(PANEL_EXIT_ATTR);
				}
				panelLeaving = false;
				leaving = false;
			}
			const exit = () => {
				if (!supported || leaving) return;
				leaving = true;
				panelLeaving = true;
				const frame = getFrame();
				if (frame !== null) {
					frame.setAttribute(PANEL_EXIT_ATTR, "");
					frame.addEventListener("animationend", onAnimationEnd, true);
				}
				selectPanel();
				cleanupTimer = window.setTimeout(cleanup, PANEL_EXIT_FALLBACK_MS);
			};
			return {
				exit,
				supported,
				panelOpen: panelOwnsMainArea,
				task: createPanelBackExitTask(exit, supported)
			};
		}
		/**
		* System back key / back gesture exits the panel.
		*
		* Host core does not touch browser history (PDF preview plugin does, unrelated).
		* On phone the panel view often sits at `history.length === 1`, so back would
		* leave the page. This layer arms one history entry while a panel is open and
		* exits when it is popped.
		*
		* Edges: our own `history.back()` (other exit routes) echoes as popstate —
		* `selfBackPending` swallows it, with a timeout so a WebView that never emits
		* popstate cannot leave the flag stuck. Between click and React commit the row
		* is still marked active; `panelViewOpen()` reports closed in that window so
		* no second entry is armed.
		*
		* @param exitPanel - the shared exit action.
		* @param supported - false when the host has no panel-selection API.
		*/
		function createPanelBackExitTask(exitPanel, supported) {
			let armed = false;
			let listening = false;
			let selfBackPending = false;
			let selfBackTimer = null;
			function clearSelfBack() {
				selfBackPending = false;
				if (selfBackTimer !== null) {
					window.clearTimeout(selfBackTimer);
					selfBackTimer = null;
				}
			}
			function selfBack() {
				selfBackPending = true;
				if (selfBackTimer !== null) window.clearTimeout(selfBackTimer);
				selfBackTimer = window.setTimeout(clearSelfBack, 1200);
				try {
					history.back();
				} catch {
					clearSelfBack();
				}
			}
			function onPopState() {
				if (selfBackPending) {
					clearSelfBack();
					return;
				}
				if (!armed) return;
				armed = false;
				if (panelViewOpen()) exitPanel();
			}
			function listen() {
				if (listening) return;
				window.addEventListener("popstate", onPopState);
				listening = true;
			}
			function unlisten() {
				if (!listening) return;
				window.removeEventListener("popstate", onPopState);
				listening = false;
			}
			return {
				name: "panel-back-exit",
				scopes: ["*"],
				ensure: () => {
					if (!supported) return;
					listen();
					if (panelViewOpen()) {
						if (armed) return;
						armed = true;
						try {
							history.pushState({ mobilePanelExit: true }, "");
						} catch {
							armed = false;
						}
						return;
					}
					if (armed) {
						armed = false;
						selfBack();
					}
				},
				dispose: () => {
					unlisten();
					clearSelfBack();
					if (armed) {
						armed = false;
						selfBack();
					}
				}
			};
		}
		/**
		* Re-tapping the selected panel row returns to the conversation. Unselected
		* rows still go through the host's `selectPanel(id)`.
		*
		* Capture phase so the host onClick can be stopped. Drawer close rides the
		* same click (phone-chrome navigation-tap whitelist) — closing on pointerup
		* cancels the synthesized click (drawer-nav click pitfall).
		*/
		function installPanelRowExit(ctx, exitPanel) {
			installMobileEffect(ctx, "dsh-web-mobile: panel row returns to conversation", () => {
				const onClick = (event) => {
					const target = event.target;
					if (!(target instanceof Element) || typeof target.closest !== "function") return;
					const row = target.closest("[class*=\"panelRow\"]");
					if (row === null) return;
					if (row.getAttribute("aria-current") !== "page") return;
					event.preventDefault();
					event.stopPropagation();
					exitPanel();
				};
				document.addEventListener("click", onClick, true);
				return () => document.removeEventListener("click", onClick, true);
			});
		}
		//#endregion
		//#region src/client/core/raf-scheduler.ts
		function createRafScheduler(raf, caf) {
			let pending = 0;
			let queued = false;
			return {
				schedule(fn) {
					if (queued) return;
					queued = true;
					pending = raf(() => {
						queued = false;
						fn();
					});
				},
				cancel() {
					if (!queued) return;
					caf(pending);
					queued = false;
				}
			};
		}
		//#endregion
		//#region src/client/debug.ts
		/**
		* Debug badge — ?mobile-nav-debug=1
		* Renders a live state overlay (URL, viewport, media queries, shell chrome,
		* host panels, captured errors) so a phone-side repro can be diagnosed
		* without guessing. No-op unless the query param is present.
		*/
		function installDebugBadge(ctx) {
			ctx.effect(() => {
				const params = new URLSearchParams(location.search);
				if (!params.has("mobile-nav-debug")) return () => {};
				const errors = [];
				const onError = (event) => errors.push(`ERR ${event.message.slice(0, 120)}`);
				const onRejection = (event) => errors.push(`REJ ${String(event.reason).slice(0, 120)}`);
				window.addEventListener("error", onError);
				window.addEventListener("unhandledrejection", onRejection);
				const badge = document.createElement("div");
				badge.style.cssText = [
					"position:fixed",
					"top:40px",
					"right:6px",
					"z-index:2147483000",
					"background:rgba(0,0,0,.82)",
					"color:#fff",
					"font:11px/1.5 ui-monospace,monospace",
					"padding:8px 10px",
					"border-radius:8px",
					"max-width:94vw",
					"max-height:70vh",
					"overflow:auto",
					"white-space:pre-wrap",
					"pointer-events:none"
				].join(";");
				const read = () => {
					const q = (sel) => !!document.querySelector(sel);
					const vis = (sel) => {
						const el = document.querySelector(sel);
						return el === null ? "absent" : getComputedStyle(el).visibility;
					};
					const frame = document.querySelector("[data-mobile-nav=\"frame\"]");
					const rightPanel = () => {
						const el = document.querySelector("[data-sidebar-right-panel]");
						if (el === null) return "absent";
						const b = el.getBoundingClientRect();
						return `${el.getAttribute("data-sidebar-right-panel")} pad ${getComputedStyle(el).paddingTop} rect ${Math.round(b.top)},${Math.round(b.left)} ${Math.round(b.width)}x${Math.round(b.height)}`;
					};
					return [
						`build 20260919 (diag chips)`,
						`URL ${location.pathname}${location.search}`,
						`W ${innerWidth} x ${innerHeight} dpr ${devicePixelRatio}`,
						`mq≤1023 ${matchMedia(MOBILE_QUERY).matches}  mq≥1024 ${matchMedia(DESKTOP_QUERY).matches}`,
						`safeTop framePad ${frame === null ? "n/a" : getComputedStyle(frame).paddingTop}  rightPanel ${rightPanel()}`,
						`css ${q("style[data-plugin-css*=\"mobile\"]")}  frame ${!!frame}`,
						`rightSidebar expand ${q("[data-sidebar-right-expand]")}  toggle ${q("[data-sidebar-right-toggle]")}`,
						`header ${vis("[data-phase] header")}  composer ${q("textarea, [data-composer-input]")}`,
						`genui cards ${document.querySelectorAll("[data-genui]").length}  panel ${q("[data-genui-panel]")}`,
						`phase ${document.querySelector("[data-phase]")?.getAttribute("data-phase") ?? "?"}`,
						`errs ${errors.slice(-5).join(" | ") || "none"}`
					].join("\n");
				};
				const paint = () => {
					badge.textContent = read();
				};
				paint();
				const observer = new MutationObserver((records) => {
					for (const record of records) {
						if (record.target === badge || badge.contains(record.target)) continue;
						paint();
						return;
					}
				});
				observer.observe(document.body, {
					childList: true,
					subtree: true,
					attributes: true
				});
				const timer = setInterval(paint, 1500);
				document.body.appendChild(badge);
				const marker = (sel) => {
					const el = document.querySelector(sel);
					if (el === null) return "absent";
					const b = el.getBoundingClientRect();
					return `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}x${Math.round(b.height)}`;
				};
				const payload = () => [
					read(),
					`rects toggle ${marker("[data-mobile-nav=\"toggle\"]")} files ${marker("[data-mobile-nav=\"files\"]")} header ${marker("[data-phase] header")} titleCluster ${marker("[class*=\"_titleCluster\"]")}`,
					`chips crea ${marker("[class*=\"SVAs4q_\"]")} team ${marker("[data-team-action]")} model ${marker("[class*=\"_7KE1Ra_trigger\"]")} crumbs ${marker("[class*=\"_crumbs\"]")} crumbCurrent ${marker("[class*=\"_crumbCurrent\"]")}`,
					`ua ${navigator.userAgent}`,
					`screen ${screen.width}x${screen.height} standalone ${matchMedia("(display-mode: standalone)").matches}`,
					`vv ${visualViewport === null ? "n/a" : `${Math.round(visualViewport.width)}x${Math.round(visualViewport.height)}@${Math.round(visualViewport.offsetTop)}`}`
				].join("\n");
				const beacon = params.get("beacon") || "http://127.0.0.1:3199/diag";
				const beaconTimer = setInterval(() => {
					fetch(beacon, {
						method: "POST",
						mode: "no-cors",
						body: payload()
					}).catch(() => {});
				}, 2e3);
				return () => {
					window.removeEventListener("error", onError);
					window.removeEventListener("unhandledrejection", onRejection);
					observer.disconnect();
					clearInterval(timer);
					clearInterval(beaconTimer);
					badge.remove();
				};
			}, "dsh-web-mobile: debug badge");
		}
		//#endregion
		//#region src/client/i18n/locales.ts
		/** `mobileNav` namespace dictionaries: drawer controls. */
		const NS = "mobileNav";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"open": "打开目录",
			"close": "收起目录",
			"backdrop": "点击关闭目录",
			"backToConversation": "返回会话",
			"sessionLog": "导出会话日志",
			"files": "文件浏览",
			"fileUpload": "添加文件",
			"deleteSession": "删除会话",
			"deleteConfirmTitle": "删除会话？",
			"deleteConfirmDesc": "将删除「{title}」的完整会话记录，此操作不可恢复。",
			"deleteConfirmYes": "删除",
			"deleteConfirmNo": "取消",
			"deletePending": "正在删除…",
			"deleteErrorBusy": "该会话正在运行且无法停止，请稍后重试。",
			"deleteErrorNotFound": "会话不存在或已被删除。",
			"deleteErrorResolve": "无法确定要删除的会话，请重试。",
			"deleteErrorGeneric": "删除失败：{message}"
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			"open": "Open directory",
			"close": "Close directory",
			"backdrop": "Click to close directory",
			"backToConversation": "Back to conversation",
			"sessionLog": "Session log",
			"files": "Files",
			"fileUpload": "Add files",
			"deleteSession": "Delete session",
			"deleteConfirmTitle": "Delete session?",
			"deleteConfirmDesc": "The complete log of “{title}” will be permanently removed. This cannot be undone.",
			"deleteConfirmYes": "Delete",
			"deleteConfirmNo": "Cancel",
			"deletePending": "Deleting…",
			"deleteErrorBusy": "This session is running and could not be stopped. Try again later.",
			"deleteErrorNotFound": "The session does not exist or was already deleted.",
			"deleteErrorResolve": "Could not identify the session to delete. Please try again.",
			"deleteErrorGeneric": "Delete failed: {message}"
		};
		//#endregion
		//#region src/client/index.tsx
		/** Required services (cordis fiber inject — the loader passes all module exports as an object plugin). */
		const inject = [
			"slots",
			"layout",
			"locale",
			"sessionLogDownload",
			"sessions",
			"workspaces"
		];
		/**
		* Mobile-adaptive shell, browser half: injects the mobile stylesheet, then
		* contributes the directory toggle to the session header and the backdrop +
		* floating button to the shell overlay.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-web-mobile: dictionaries");
			ctx.effect(() => {
				for (const stale of document.querySelectorAll("style[data-plugin-css=\"dsh-web-mobile/mobile.css\"]")) stale.remove();
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-web-mobile";
				tag.dataset.pluginCss = "dsh-web-mobile/mobile.css";
				tag.textContent = MOBILE_CSS;
				document.head.appendChild(tag);
				setTimeout(() => {
					if (tag.isConnected) document.head.appendChild(tag);
				}, 0);
				return () => {
					tag.remove();
				};
			}, "dsh-web-mobile: styles");
			ctx.effect(() => {
				const mq = window.matchMedia(MOBILE_QUERY);
				const rowSelector = "[class*=\"irow\"]:not([class*=\"irowActions\"]):not([class*=\"irowTrailing\"])";
				const set = (el, props) => {
					for (const [key, value] of Object.entries(props)) el.style.setProperty(key, value, "important");
				};
				const unset = (el, props) => {
					for (const key of props) el.style.removeProperty(key);
				};
				const rowProps = [
					"flex-wrap",
					"align-items",
					"gap"
				];
				const firstProps = [
					"flex",
					"max-width",
					"min-width"
				];
				const textProps = [
					"white-space",
					"overflow",
					"text-overflow",
					"max-width"
				];
				const clear = () => {
					document.querySelectorAll(rowSelector).forEach((row) => {
						unset(row, rowProps);
						const first = row.children[0];
						if (first) unset(first, firstProps);
						row.querySelectorAll(":scope > button, :scope > [class*=\"owner\"], :scope > [class*=\"grow\"]").forEach((el) => {
							unset(el, ["order"]);
						});
						const spec = row.querySelector("[class*=\"spec\"]");
						const nm = row.querySelector("[class*=\"nm\"]");
						if (spec) unset(spec, textProps);
						if (nm) unset(nm, textProps);
					});
				};
				const apply = () => {
					if (document.querySelector("[data-dsh-market-root], [role=\"dialog\"]") === null) return;
					document.querySelectorAll(rowSelector).forEach((row) => {
						set(row, {
							"flex-wrap": "wrap",
							"align-items": "center",
							"gap": "4px 10px"
						});
						const first = row.children[0];
						if (first) set(first, {
							"flex": "1 1 100%",
							"max-width": "100%",
							"min-width": "0"
						});
						const spec = row.querySelector("[class*=\"spec\"]");
						const nm = row.querySelector("[class*=\"nm\"]");
						if (spec) set(spec, {
							"white-space": "nowrap",
							"overflow": "hidden",
							"text-overflow": "ellipsis",
							"max-width": "100%"
						});
						if (nm) set(nm, {
							"white-space": "nowrap",
							"overflow": "hidden",
							"text-overflow": "ellipsis",
							"max-width": "100%"
						});
					});
				};
				const arm = () => {
					clear();
					if (mq.matches) apply();
				};
				arm();
				const scheduler = createRafScheduler((cb) => window.requestAnimationFrame(cb), (id) => window.cancelAnimationFrame(id));
				const mo = new MutationObserver(() => {
					if (mq.matches) scheduler.schedule(() => {
						if (mq.matches) apply();
					});
				});
				mo.observe(document.documentElement, {
					childList: true,
					subtree: true
				});
				mq.addEventListener("change", arm);
				return () => {
					scheduler.cancel();
					mo.disconnect();
					mq.removeEventListener("change", arm);
					clear();
				};
			}, "dsh-web-mobile: installed-list-inline-styles");
			const panelExit = createPanelExit(ctx.layout);
			ctx.effect(() => {
				const stops = [
					installFrameController(),
					installReconciler(ctx),
					registerReconcileTasks(ctx, panelExit)
				];
				return () => {
					for (const stop of stops) stop();
				};
			}, "dsh-web-mobile: reconciler infrastructure");
			installOverlayInteractions(ctx);
			installPanelRowExit(ctx, panelExit.exit);
			installSessionMenuDelete(ctx);
			installSidebarSwipe(ctx, openFilesPanel);
			installSubagentChipTouch(ctx);
			installComposerKeyboardGuard(ctx);
			installComposerKeyboardLift(ctx);
			installComposerPlusToggle(ctx);
			installWorkspaceChipToggle(ctx);
			installTeamChipToggle(ctx);
			installModelMenuAnchor(ctx);
			installShortcutModalKeyboardGuard(ctx);
			installSessionFocusGuard(ctx);
			installPhoneChrome(ctx);
			installDebugBadge(ctx);
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "mobile-nav-toggle",
				order: 10,
				locale: NS,
				inject: () => ({ toggleSidebar: () => ctx.layout.toggleSidebar() })
			}, MobileNavToggle));
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "mobile-nav-session-log",
				order: 5,
				locale: NS,
				inject: () => ({ downloadSessionLog: (sessionId) => ctx.sessionLogDownload.download(sessionId) })
			}, MobileDrawerFooter));
			ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
				name: "conversation.input.left",
				id: "mobile-nav-file-upload",
				order: 10,
				locale: NS,
				inject: () => ({})
			}, ComposerFileButton));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map