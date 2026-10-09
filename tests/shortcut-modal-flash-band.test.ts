// Shortcut-modal flash: drawer stack (z1250/1300) outranks the host modal
// portal root (z1000). Raising the root to 1400 must be gated on our backdrop
// being present — the old drawer-open marker goes dark through the whole close
// transition, so the drawer briefly covers the modal. Pins both halves of the fix.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASE = readFileSync(join(ROOT, 'src/client/styles/base.css.ts'), 'utf8')
const PHONE = readFileSync(join(ROOT, 'src/client/effects/phone-chrome.ts'), 'utf8')
const MENU = readFileSync(join(ROOT, 'src/client/effects/session-menu.ts'), 'utf8')

const bandStart = BASE.indexOf('popover band above the open drawer')
const bandEnd = BASE.indexOf('/* Floating fallback button', bandStart)
const band =
  bandStart !== -1 && bandEnd > bandStart ? BASE.slice(bandStart, bandEnd) : ''

const DRAWER_GATE = 'body:has([data-mobile-nav="frame"]:not([data-sidebar-collapsed]))'
const BACKDROP_GATE = 'body:has([data-mobile-nav="backdrop"])'

test('modal-root raise lives in the mobile popover band at the 1400 value', () => {
  const at = band.indexOf('> div:has(> [role="dialog"][aria-modal="true"])')
  assert.notEqual(at, -1, 'modal-root raise missing from the popover band')
  assert.match(
    band.slice(at, band.indexOf('}', at)),
    /z-index: 1400 !important/,
    'modal-root raise must stay at the 1400 band value',
  )
})

test('modal-root raise is gated on OUR BACKDROP, not on the drawer marker', () => {
  const at = band.indexOf('> div:has(> [role="dialog"][aria-modal="true"])')
  assert.notEqual(at, -1, 'modal-root raise missing from the popover band')
  // The gate must belong to THIS rule: nothing may close a block between the
  // gate and the selector.
  assert.ok(
    band.lastIndexOf(BACKDROP_GATE, at) !== -1,
    'modal-root raise must be gated on the backdrop being on screen',
  )
  assert.doesNotMatch(
    band.slice(band.lastIndexOf(BACKDROP_GATE, at), at),
    /\}/,
    'backdrop gate must belong to the modal-root rule itself',
  )
  // The old marker gate is the regression: it goes dark for the whole close
  // transition (fade .2s + removal 260ms / column .28s / subtree swap ~200ms).
  assert.equal(
    band.lastIndexOf(DRAWER_GATE, at) > band.lastIndexOf(BACKDROP_GATE, at),
    false,
    'modal-root raise must NOT be gated on data-sidebar-collapsed',
  )
})

test('every non-gesture closer shares the one late-commit toggle', () => {
  // phone-chrome owns the shared helper and it must keep the late-commit shape.
  const helperAt = PHONE.indexOf('export function toggleDrawer(')
  assert.notEqual(helperAt, -1, 'toggleDrawer helper missing from phone-chrome.ts')
  assert.match(
    PHONE.slice(helperAt, PHONE.indexOf('\n}', helperAt)),
    /if \(!closeDrawerAnimated\(ctx\)\) ctx\.layout\.toggleSidebar\(\)/,
    'toggleDrawer must animate the close and only fall back to a plain toggle',
  )
  // The FAB's opener callback (createOverlayTask) is a closer once the drawer
  // is open: it must not bypass the helper.
  const overlayAt = PHONE.indexOf('createOverlayTask(t,')
  assert.notEqual(overlayAt, -1, 'createOverlayTask call missing')
  assert.match(
    PHONE.slice(overlayAt, PHONE.indexOf('\n', overlayAt)),
    /toggleDrawer\(ctx\)/,
    'createOverlayTask must receive toggleDrawer, not a raw toggleSidebar',
  )
  // The session-delete follow-up is a closer on the mobile branch.
  assert.match(
    MENU,
    /if \(wasCurrent && window\.matchMedia\(MOBILE_QUERY\)\.matches\) toggleDrawer\(ctx\)/,
    'session-menu delete follow-up must route through toggleDrawer',
  )
  assert.doesNotMatch(
    MENU,
    /ctx\.layout\.toggleSidebar\(\)/,
    'session-menu must not toggle the drawer raw',
  )
})
