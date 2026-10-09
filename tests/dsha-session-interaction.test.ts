// Session-row contract: click = select, double-click = open, long-press = rename.
// Host 0.1.7 hangs rename on the title's dblclick, which conflicts with open.
// Pins: (1) swallow real dblclick, pass only our synthetic one; (2) long-press
// prefers requestRowRename, ⋯ menu only if no title; (3) _rowActions stay visible
// on touch so the menu remains reachable after long-press no longer opens it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CHROME = readFileSync(join(ROOT, 'src/client/effects/phone-chrome.ts'), 'utf8')
const LAYOUT_CSS = readFileSync(join(ROOT, 'src/client/styles/layout.css.ts'), 'utf8')

// Same extraction as dsha-long-press-gate.test.ts: a top-level const arrow body
// inside installOverlayInteractions, cut at the next sibling — an exactly-4-space
// `const ` or `//` comment.
const bodyOf = (source: string, name: string): string => {
  const start = source.indexOf(`const ${name} = `)
  assert.notEqual(start, -1, `const ${name} not found in phone-chrome.ts`)
  const rest = source.slice(start)
  const ends = ['\n    const ', '\n    // ']
    .map((marker) => rest.indexOf(marker, 1))
    .filter((index) => index !== -1)
  const next = ends.length > 0 ? Math.min(...ends) : -1
  return next === -1 ? rest : rest.slice(0, next)
}

test('双击：真实 dblclick 被吞掉，只有我们派发的合成事件放行', () => {
  const swallow = bodyOf(CHROME, 'onDrawerDoubleClick')
  // Identity check first: without it our own long-press replay would be eaten too.
  assert.match(swallow, /syntheticDoubleClicks\.has\(event\)/)
  assert.match(swallow, /target\.closest\('\[class\*="sessionRow"\] \[class\*="_title"\]'\)/)
  assert.match(swallow, /event\.stopPropagation\(\)/)
  // The event object we dispatch ourselves is the only one marked in the WeakSet.
  assert.match(bodyOf(CHROME, 'requestRowRename'), /syntheticDoubleClicks\.add\(event\)/)
})

test('长按：改名优先，⋯ 菜单只作拿不到标题时的退路', () => {
  const arming = bodyOf(CHROME, 'onDrawerPointerDown')
  assert.match(arming, /if \(!requestRowRename\(pressRow\)\) openRowMenu\(pressRow\)/)
  // Rename replays the host's own entry point instead of forking the dialog:
  // the title's dblclick, dispatched with the identity mark set.
  const rename = bodyOf(CHROME, 'requestRowRename')
  assert.match(rename, /new MouseEvent\('dblclick', \{ bubbles: true, cancelable: true, view: window \}\)/)
  assert.match(rename, /title\.dispatchEvent\(event\)/)
})

test('双击拦截挂在 document 捕获阶段（React 根容器之前）', () => {
  assert.match(CHROME, /document\.addEventListener\('dblclick', onDrawerDoubleClick, true\)/)
  assert.match(CHROME, /document\.removeEventListener\('dblclick', onDrawerDoubleClick, true\)/)
})

test('长按改义后，⋯ 菜单在触屏仍可达（_rowActions 常显）', () => {
  assert.match(
    LAYOUT_CSS,
    /\[data-mobile-nav="frame"\] \[class\*="sessionRow"\] \[class\*="_rowActions"\] \{\s*display: inline-flex !important;/,
  )
})
