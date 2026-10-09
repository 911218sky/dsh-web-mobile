// Team chip re-tap-to-close: the host trigger never toggles while open (focus
// only); dismiss is outside-pointerdown or Escape. The fix arm on pointerdown
// capture, then on click capture synthesizes an outside pointerdown and
// swallows the click. These tests pin where and when.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SRC = readFileSync(
  fileURLToPath(new URL('../src/client/effects/team-chip-toggle.ts', import.meta.url)),
  'utf8',
)
const ENTRY = readFileSync(
  fileURLToPath(new URL('../src/client/index.tsx', import.meta.url)),
  'utf8',
)

test('选择器只认根的直接子 dialog 触发器与 body portal 面板标记', () => {
  // Direct-child `>`; aria-haspopup is dialog (team panel), not menu.
  assert.match(SRC, /const TRIGGER_SELECTOR = '\[data-team-action\] > button\[aria-haspopup="dialog"\]'/)
  // Panel portals to body — stable attribute, not a hashed class.
  assert.match(SRC, /const PANEL_SELECTOR = '\[data-team-panel\]'/)
  assert.doesNotMatch(SRC, /PANEL_SELECTOR = '\[class\*=/)
})

test('两个事件都必须在捕获阶段介入', () => {
  assert.match(SRC, /document\.addEventListener\('pointerdown', onPointerDownCapture, true\)/)
  assert.match(SRC, /document\.addEventListener\('click', onClickCapture, true\)/)
})

test('开态取自触发器自己的 aria-expanded，且要求根与面板都在场', () => {
  const start = SRC.indexOf('const onPointerDownCapture')
  const end = SRC.indexOf('const onClickCapture', start)
  const body = SRC.slice(start, end)
  assert.ok(start > 0 && end > start, 'onPointerDownCapture 未找到')
  assert.match(body, /trigger\.getAttribute\('aria-expanded'\) !== 'true'/, '开态必须读触发器自己的 aria-expanded')
  assert.match(body, /document\.querySelector\(ROOT_SELECTOR\) === null/)
  assert.match(body, /document\.querySelector\(PANEL_SELECTOR\) === null/)
})

test('只在同一颗触发器的紧随 click 上动手，且顺序是先派发再吞', () => {
  const start = SRC.indexOf('const onClickCapture')
  const end = SRC.indexOf('document.addEventListener', start)
  const body = SRC.slice(start, end)
  assert.match(body, /triggerFrom\(event\.target\) !== trigger/)
  // Host dismiss listens for pointerdown only, not click.
  assert.match(body, /new PointerEvent\('pointerdown'/)
  // Target must be outside root and panel (document.body).
  assert.match(body, /document\.body\.dispatchEvent/)
  assert.match(body, /event\.stopPropagation\(\)/)
  // Dispatch close first, then swallow the click.
  assert.ok(
    body.indexOf('dispatchEvent') < body.indexOf('stopPropagation()'),
    '必须先派发合成 pointerdown 再 stopPropagation',
  )
})

test('dispose 摘掉两个监听器', () => {
  assert.match(SRC, /document\.removeEventListener\('pointerdown', onPointerDownCapture, true\)/)
  assert.match(SRC, /document\.removeEventListener\('click', onClickCapture, true\)/)
})

test('入口武装该效果', () => {
  assert.match(ENTRY, /import \{ installTeamChipToggle \} from '\.\/effects\/team-chip-toggle\.ts'/)
  assert.match(ENTRY, /installTeamChipToggle\(ctx\)/)
})
