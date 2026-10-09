// Workspace chip re-tap-to-close: ui-workspace portals the menu with
// `anchor={null}`, so the chip sits outside Menu's rootRef and the outside-
// dismiss path treats the second tap as outside (pointerdown closes, click
// re-opens). The fix swallows that click only; these tests pin where and when.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SRC = readFileSync(
  fileURLToPath(new URL('../src/client/effects/workspace-chip-toggle.ts', import.meta.url)),
  'utf8',
)
const ENTRY = readFileSync(
  fileURLToPath(new URL('../src/client/index.tsx', import.meta.url)),
  'utf8',
)

test('chip 选择器只认 hero 行的直接子菜单触发器', () => {
  // Direct-child `>` keeps the Menu's own anchor span out of the selector.
  assert.match(SRC, /const CHIP_SELECTOR = '\[class\*="heroWorkspaceRow"\] > button\[aria-haspopup="menu"\]'/)
})

test('两个事件都必须在捕获阶段介入', () => {
  assert.match(SRC, /document\.addEventListener\('pointerdown', onPointerDownCapture, true\)/)
  assert.match(SRC, /document\.addEventListener\('click', onClickCapture, true\)/)
})

test('开态取自 aria-expanded，且要求宿主的 portal 菜单在场', () => {
  const start = SRC.indexOf('const onPointerDownCapture')
  const end = SRC.indexOf('const onClickCapture', start)
  const body = SRC.slice(start, end)
  assert.ok(start > 0 && end > start, 'onPointerDownCapture 未找到')
  assert.match(body, /chip\.getAttribute\('aria-expanded'\) !== 'true'/, '开态必须读 chip 自己的 aria-expanded')
  assert.match(body, /document\.querySelector\(OPEN_MENU_SELECTOR\) === null/, '没有 portal 菜单时不得武装')
})

test('只在同一颗 chip 的紧随 click 上 stopPropagation', () => {
  const start = SRC.indexOf('const onClickCapture')
  const end = SRC.indexOf('document.addEventListener', start)
  const body = SRC.slice(start, end)
  assert.match(body, /chipFrom\(event\.target\) !== chip/)
  assert.match(body, /event\.stopPropagation\(\)/)
  // Swallow the click only — no synthetic re-dispatch.
  assert.doesNotMatch(body, /dispatchEvent|\.click\(\)/)
})

test('dispose 摘掉两个监听器', () => {
  assert.match(SRC, /document\.removeEventListener\('pointerdown', onPointerDownCapture, true\)/)
  assert.match(SRC, /document\.removeEventListener\('click', onClickCapture, true\)/)
})

test('入口武装该效果', () => {
  assert.match(ENTRY, /import \{ installWorkspaceChipToggle \} from '\.\/effects\/workspace-chip-toggle\.ts'/)
  assert.match(ENTRY, /installWorkspaceChipToggle\(ctx\)/)
})
