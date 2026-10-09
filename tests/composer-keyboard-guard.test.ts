// Composer keyboard guard: keeps a dismissed keyboard down when the composer's
// fixed buttons (send/stop/+) are tapped.
//
// Upstream keepFocus calls editor.focus() on the composer buttons' mousedown,
// which re-raises the on-screen keyboard: on iOS WebKit a programmatic focus
// always re-raises it, and on Android the IME comes back for an editable that
// never lost logical focus (keepFocus preventDefaults the blur) the moment a
// real gesture arrives. The guard shadows the editor element's own `focus`
// property while a tap is in flight, then restores it.
//
// Scope: iOS WebKit **or** `(pointer: coarse)`. An iOS-only gate left Android
// unprotected — the keyboard re-raised on `+` because the guard never installed.
//
// The DOM half (capture listeners, closest() scoping) is browser-only; these
// tests audit the source invariants the fix depends on, mirroring how
// ios-zoom-guard.test.ts audits the CSS floor via stylesheet constants.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SOURCE = readFileSync(
  fileURLToPath(new URL('../src/client/effects/composer-keyboard-guard.ts', import.meta.url)),
  'utf8',
)

test('guard covers iOS WebKit and coarse pointers via the shared probes', () => {
  assert.match(SOURCE, /detectIosWebKit\(/)
  assert.match(SOURCE, /matchMedia\('\(pointer: coarse\)'\)/)
  // Fine-pointer (desktop) hosts never install the listeners at all.
  assert.match(SOURCE, /if \(!ios && !coarse\) \{/)
  assert.match(SOURCE, /return undefined/)
})

test('guard listens on all three touch entry points in the capture phase', () => {
  // mousedown alone is a no-op on Android WebView: the compatibility mousedown
  // is often swallowed once touchstart's default is prevented.
  for (const event of ['pointerdown', 'touchstart', 'mousedown']) {
    assert.match(SOURCE, new RegExp(`addEventListener\\('${event}', onPointerDown, true\\)`))
    assert.match(SOURCE, new RegExp(`removeEventListener\\('${event}', onPointerDown, true\\)`))
  }
})

test('guard scopes the shadow to composer-card taps outside the editor surface', () => {
  assert.match(SOURCE, /\[data-composer-card\]/)
  assert.match(SOURCE, /target\.closest\(COMPOSER_INPUT_SELECTOR\) !== null/)
  // A tap on the editing surface is the user saying "I want to type": the
  // window is disarmed on the spot so the fallback blur cannot eat it.
  assert.match(SOURCE, /\{\s*\n\s*restore\(\)\s*\n\s*return\s*\n\s*\}/)
})

test('shadow restores deterministically and never outlives the tap', () => {
  assert.match(SOURCE, /setTimeout\(restore, 700\)/)
  assert.match(SOURCE, /SHADOW_MARKER = 'data-mobile-nav-focus-shadow'/)
})

test('restoring the shadow also closes the guard window', () => {
  // restore() must clear the shadow and zero `shadowTimer`: onFocusIn gates on
  // `shadowTimer === 0`, so a leftover timer kept the guard armed and blurred
  // every editor focusin (keyboard could not reopen).
  assert.match(SOURCE, /window\.clearTimeout\(shadowTimer\)\s*\n\s*shadowTimer = 0/)
})

test('the focusin fallback is gated by the window and blurs the editor', () => {
  assert.match(SOURCE, /onFocusIn = \(event: Event\): void => \{\s*\n\s*if \(shadowTimer === 0\) return/)
  assert.match(SOURCE, /target\.blur\(\)/)
})

test('disposal restores any live shadow — reloads never leak the no-op', () => {
  // The disposer detaches every listener and then calls restore() unconditionally.
  assert.match(SOURCE, /removeEventListener\('focusin', onFocusIn, true\)\s*\n\s*restore\(\)/)
})

test('the effect is wired into the client entry', () => {
  const entry = readFileSync(
    fileURLToPath(new URL('../src/client/index.tsx', import.meta.url)),
    'utf8',
  )
  assert.match(entry, /installComposerKeyboardGuard\(ctx\)/)
})
