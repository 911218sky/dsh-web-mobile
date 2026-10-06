// The Files control must act on the host's right sidebar when present
// (0.1.5+ ships the workspace tree there). This fork has no third-party
// explorer fallback — missing host controls is a clean no-op.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openFilesPanel, HOST_FILES_CLOSER, HOST_FILES_OPENER } from '../src/client/components/open-files-panel.ts'

const openerDoc = (found: unknown) => ({ querySelector: (selector: string) => (selector === HOST_FILES_OPENER ? found : null) })
const bothDoc = (opener: unknown, closer: unknown) => ({ querySelector: (selector: string) => (selector === HOST_FILES_OPENER ? opener : selector === HOST_FILES_CLOSER ? closer : null) })

test('openFilesPanel: clicks the host right-sidebar opener when it exists', () => {
  let clicks = 0
  const frame = { removeAttribute: () => assert.fail('no explorer fallback'), setAttribute: () => assert.fail('no explorer fallback') }
  const opened = openFilesPanel(openerDoc({ click: () => { clicks += 1 } }), frame)
  assert.equal(opened, true)
  assert.equal(clicks, 1)
})

test('openFilesPanel: returns false when no host opener exists', () => {
  const calls: string[] = []
  const frame = {
    removeAttribute: (name: string) => calls.push('remove:' + name),
    setAttribute: (name: string) => calls.push('set:' + name),
  }
  const opened = openFilesPanel(openerDoc(null), frame)
  assert.equal(opened, false)
  assert.deepEqual(calls, [], 'must not write third-party explorer markers')
})

test('openFilesPanel: no frame and no host opener is a no-op', () => {
  assert.equal(openFilesPanel(openerDoc(null), null), false)
})

test('openFilesPanel: a non-clickable match is a no-op instead of throwing', () => {
  const calls: string[] = []
  const frame = { removeAttribute: () => calls.push('remove'), setAttribute: () => calls.push('set') }
  assert.equal(openFilesPanel(openerDoc({}), frame), false)
  assert.deepEqual(calls, [])
})

// The host unmounts the opener while the panel is open, so a control keyed on
// the opener alone went dead exactly when the user had the panel already up.
test('openFilesPanel: uses the collapse control when the panel is already open', () => {
  let collapses = 0
  let opens = 0
  const frame = { removeAttribute: () => assert.fail('no explorer fallback'), setAttribute: () => assert.fail('no explorer fallback') }
  const opened = openFilesPanel(bothDoc(null, { click: () => { collapses += 1 } }), frame)
  assert.equal(opened, true)
  assert.equal(collapses, 1)
  assert.equal(opens, 0)
})

test('openFilesPanel: prefers the opener when both controls are present', () => {
  let collapses = 0
  let opens = 0
  const frame = { removeAttribute: () => assert.fail('no explorer fallback'), setAttribute: () => assert.fail('no explorer fallback') }
  const opened = openFilesPanel(bothDoc({ click: () => { opens += 1 } }, { click: () => { collapses += 1 } }), frame)
  assert.equal(opened, true)
  assert.equal(opens, 1)
  assert.equal(collapses, 0)
})
