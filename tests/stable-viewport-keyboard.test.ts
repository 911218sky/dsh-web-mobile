// Shortcut-modal flash/jitter guards:
// 1) Card max-height uses --dsh-web-mobile-vh (keyboard-stable), not vh/dvh.
// 2) Opening the modal must not add a second scrim or _modalEnter fade.
// 3) Phone tier hides the search row (CSS only); tablet/desktop keep it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LAYOUT = readFileSync(join(ROOT, 'src/client/styles/layout.css.ts'), 'utf8')
const PHONE = readFileSync(join(ROOT, 'src/client/effects/phone-chrome.ts'), 'utf8')
const VAR = 'var(--dsh-web-mobile-vh, 100dvh)'

test('phone-chrome maintains the keyboard-less viewport height', () => {
  assert.match(PHONE, /export const STABLE_VIEWPORT_VAR = '--dsh-web-mobile-vh'/)
  assert.match(PHONE, /setProperty\(STABLE_VIEWPORT_VAR/)
  assert.match(PHONE, /removeProperty\(STABLE_VIEWPORT_VAR\)/)
  const at = PHONE.indexOf('const syncStableViewport')
  assert.notEqual(at, -1, 'syncStableViewport missing')
  // Monotonic height + width-change rule: the keyboard only changes height.
  assert.match(
    PHONE.slice(at, PHONE.indexOf('\n    }', at)),
    /stableVh === 0 \|\| height > stableVh \|\| width !== stableWidth/,
  )
  assert.match(PHONE, /addEventListener\('resize', syncStableViewport\)/)
  assert.match(PHONE, /removeEventListener\('resize', syncStableViewport\)/)
})

test('the two keyboard-facing cards size themselves off that variable', () => {
  assert.notEqual(
    LAYOUT.indexOf('max-height: min(800px, calc(' + VAR + ' - 24px - env(safe-area-inset-top, 0px)));'),
    -1, 'settings sheet must cap on the stable viewport height')
  assert.notEqual(
    LAYOUT.indexOf('max-height: min(760px, calc(' + VAR + ' - 24px - env(safe-area-inset-top, 0px))) !important;'),
    -1, 'shortcut card must cap on the stable viewport height')
  assert.doesNotMatch(LAYOUT, /max-height: min\((?:800|760)px, calc\(100dvh/,
    'a bare 100dvh cap would collapse with the keyboard again')
})

test('opening the shortcut modal never changes full-screen luminance', () => {
  const at = LAYOUT.indexOf(':has(> [aria-modal="true"][data-shortcut-modal="shortcuts"]) > [class*="_mask"]::after')
  assert.notEqual(at, -1, 'the shortcut mask override is missing')
  const body = LAYOUT.slice(at, LAYOUT.indexOf('}', at))
  assert.match(body, /animation: none !important/, 'no opacity fade on the scrim')
  assert.match(body, /background: transparent !important/, 'no second dim layer')
})

test('only the PHONE branch drops the search row; tablet keeps it', () => {
  const at = LAYOUT.indexOf('[aria-modal="true"][data-shortcut-modal="shortcuts"] [class*="_searchRow"]')
  assert.notEqual(at, -1, 'the search row must be hidden on phones')
  assert.match(LAYOUT.slice(at, LAYOUT.indexOf('}', at)), /display: none !important/, 'hide, do not remove')
  // Phone-only: it must sit inside a narrow-screen query, not the whole mobile branch.
  const phoneQuery = LAYOUT.lastIndexOf('@media (max-width: 767px)', at)
  assert.notEqual(phoneQuery, -1, 'the hide must be scoped to phones')
  assert.doesNotMatch(LAYOUT.slice(phoneQuery, at), /\}\s*\}\s*$/, 'the query must still enclose the rule')
  assert.ok(at - phoneQuery < 200, 'the narrow query must be the rule\'s nearest block')
})
