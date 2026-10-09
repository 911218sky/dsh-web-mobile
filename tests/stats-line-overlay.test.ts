import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Issue #104: relocating a React-owned node (the context ring, the TPS
// readout) makes the host's unmount removeChild throw NotFoundError — React
// calls it against the parent it rendered the node into — and the
// SlotErrorBoundary then blanks the whole composer slot. The stats-line task
// must therefore never move a host node: plugin-owned placeholder reserves
// plus absolutely positioned overlays only.

const src = await readFile(new URL('../src/client/effects/stats-line.ts', import.meta.url), 'utf8')
const css = await readFile(new URL('../src/client/styles/compat.css.ts', import.meta.url), 'utf8')

test('stats-line never relocates a host node (issue #104 contract)', () => {
  // The two historic movers: ring into the trailing row, TPS into the strip.
  assert.doesNotMatch(src, /insertBefore\(ring\b/)
  assert.doesNotMatch(src, /appendChild\(el\b/)
  // The only nodes this task creates are plugin-owned placeholder spans.
  assert.doesNotMatch(src, /createElement\('(?!span)/)
  // Host nodes are overlaid where React rendered them, not parked elsewhere.
  assert.match(src, /placeOverlay\(ring, reserve\)/)
  assert.match(src, /placeOverlay\(el, reserve\)/)
})

test('overlay markers exist in source and stylesheet', () => {
  const markers = ['stats-ring-reserve', 'stats-tps-reserve', 'stats-ring-dock', 'stats-tps-row', 'stats-tps']
  for (const marker of markers) {
    assert.ok(src.includes(marker), `stats-line.ts: ${marker}`)
    assert.ok(css.includes(`"${marker}"`), `compat.css.ts: ${marker}`)
  }
  // The ring overlay resolves against a positioned container and the
  // reserves stay invisible (they only hold the slot).
  assert.match(css, /\[data-mobile-nav="stats-ring"\]\s*\{[^}]*position: absolute !important/)
  assert.match(
    css,
    /\[data-mobile-nav="stats-ring-reserve"\],\s*\[data-mobile-nav="stats-tps-reserve"\]\s*\{[^}]*visibility: hidden/,
  )
})

test('placeOverlay centers the host on its slot (issue #140 alignment)', () => {
  // A taller ring top-aligned on its reserve sits below neighbouring keys;
  // the overlay must center on the reserve box. Same-height overlays (TPS
  // text) are unaffected.
  assert.match(src, /const hostRect = host\.getBoundingClientRect\(\)/)
  assert.match(src, /const top = box\.top - base\.top - container\.clientTop - \(hostRect\.height - box\.height\) \/ 2/)
})

test('the enlarged ring keeps a visible track (issue #140 spinner look)', () => {
  // Enlarged ring (16→24px) needs a deeper track so the donut reads as a
  // complete ring, not a broken spinner. Issue #142: track color must follow
  // the theme via color-mix on the label token — a literal black vanishes
  // on dark theme.
  assert.match(
    css,
    /\[data-mobile-nav="stats-ring"\]\s*\[class\*="_track"\]\s*\{[^}]*stroke:\s*color-mix\(in srgb,\s*var\(--dsw-alias-label-primary,\s*#000\)\s*25%,\s*transparent\)/,
  )
  // The theme-blind literal must not come back on the track rule.
  const trackRule = css.match(/\[data-mobile-nav="stats-ring"\]\s*\[class\*="_track"\]\s*\{[^}]*\}/)
  assert.ok(trackRule, 'track rule exists')
  assert.doesNotMatch(trackRule[0], /rgba\(0,\s*0,\s*0,\s*0?\.25\)/)
})

test('dispose hands the official layout back', () => {
  for (const key of ['stats', 'stats-ring', 'stats-ring-dock', 'stats-tps', 'stats-tps-row']) {
    assert.ok(src.includes(`'${key}'`), key)
  }
  assert.match(src, /removeEventListener\('resize', viewportHandler\)/)
  assert.match(src, /el\.remove\(\)/)
})
