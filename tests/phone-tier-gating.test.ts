// Phone-tuned pixel values must stay behind `(max-width: 767px) and
// (pointer: coarse)`. MOBILE_QUERY covers ≤1023px (phone + tablet); leaking
// phone-only numbers into the tablet band would alter upstream tablet layout.
// Brace-match each ≤767px gate and assert PHONE_ONLY declarations sit inside.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const GATE = '@media (max-width: 767px) and (pointer: coarse)'

/** Phone-only declarations: must appear only inside a ≤767px gate. */
const PHONE_ONLY = [
  'margin-top: -4px !important',
  'top: 42px !important',
  'padding-bottom: 5px !important',
  'align-self: flex-end !important',
  'min-height: 26px !important',
  'minmax(36px, auto) minmax(26px, auto)',
]

function layoutSource(): string {
  return readFileSync(
    fileURLToPath(new URL('../src/client/styles/layout.css.ts', import.meta.url)),
    'utf8',
  )
}

/** Strip comments before brace matching (`{`/`}` inside comments confuse a scan). */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** [open, close] brace ranges for each GATE media block. */
function gateRanges(css: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  let from = 0
  for (;;) {
    const at = css.indexOf(GATE, from)
    if (at === -1) break
    const open = css.indexOf('{', at)
    assert.ok(open > at, 'gate marker without a block')
    let depth = 0
    let end = open
    for (; end < css.length; end += 1) {
      if (css[end] === '{') depth += 1
      else if (css[end] === '}') {
        depth -= 1
        if (depth === 0) break
      }
    }
    assert.ok(depth === 0, 'unbalanced braces after the gate marker')
    ranges.push([open, end])
    from = at + GATE.length
  }
  return ranges
}

test('phone-tuned header numbers stay behind the ≤767px coarse gate', () => {
  const css = stripComments(layoutSource())
  const ranges = gateRanges(css)
  assert.ok(ranges.length >= 2, `expected the phone gate in layout.css.ts, found ${ranges.length}`)
  for (const needle of PHONE_ONLY) {
    const at = css.indexOf(needle)
    assert.ok(at > 0, `${needle} 不在 layout.css.ts 里（改名后记得同步这条测试）`)
    assert.ok(
      ranges.some(([open, close]) => at > open && at < close),
      `${needle} 出现在 ≤767px 门之外（会改到平板档）`,
    )
    // Once only: a second hit is usually a copy that leaked outside the gate.
    assert.equal(css.indexOf(needle, at + 1), -1, `${needle} 出现了不止一次`)
  }
})

test('the phone gate is narrower than the mobile scope it lives in', () => {
  const css = stripComments(layoutSource())
  // Phone gate must be narrower than MOBILE_QUERY so the tablet band stays intact.
  assert.ok(css.includes('(max-width: 1023px) and (pointer: coarse)'))
  assert.ok(css.includes(GATE))
  assert.ok(!css.includes('@media (max-width: 1023px) and (pointer: coarse) {\n    @media (max-width: 1023px)'))
})
