// Model-menu re-anchor cost contract: scroll/viewport paths must not query the
// document. Queries run only after a hit on the trigger/menu; scroll/resize
// only repositions cached nodes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SRC = readFileSync(
  fileURLToPath(new URL('../src/client/effects/model-menu-anchor.ts', import.meta.url)),
  'utf8',
)

test('滚动/改变尺寸只重算缓存节点，绝不查询', () => {
  const start = SRC.indexOf('const follow = ')
  const end = SRC.indexOf('const schedule = ', start)
  assert.ok(start > 0 && end > start, 'follow() 未找到')
  assert.ok(!SRC.slice(start, end).includes('querySelector'), 'follow() 里出现了查询')
  assert.match(SRC, /document\.addEventListener\('scroll', onViewportChange, true\)/)
  assert.match(SRC, /window\.addEventListener\('resize', onViewportChange\)/)
})

test('全文档查询只有一个入口，且只在命中触发器/菜单的交互后触发', () => {
  const queries = SRC.match(/querySelectorAll<HTMLElement>\(MODEL_MENU\)/g) ?? []
  assert.equal(queries.length, 1, '菜单查询必须集中在 findMenu() 一处')
  assert.match(
    SRC,
    /target\.closest\(MODEL_TRIGGER\) !== null \|\| target\.closest\(MODEL_MENU\) !== null/,
    '交互路径必须按目标做门控，不能对每次点击都查询',
  )
  for (const event of ['pointerdown', 'keydown', 'focusin', 'click']) {
    assert.ok(SRC.includes(`document.addEventListener('${event}', on`), `${event} 未接入交互路径`)
  }
})

test('菜单仍在输入框里水平居中', () => {
  assert.match(SRC, /cardBox\.left \+ cardBox\.width \/ 2/)
  assert.match(SRC, /const left = Math\.min\(Math\.max\(center - width \/ 2, GUTTER\), max\)/)
})
