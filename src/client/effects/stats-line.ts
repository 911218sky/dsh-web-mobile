import type { ReconcilerTask } from '../core/reconciler-core.ts'

/**
 * Marks the host conversation status row (turns / steps / LLM / TTFT / cache)
 * for a single horizontal scrolling line on narrow screens. The row uses a
 * hashed class, so CSS cannot target it; mark by text inside `_composerStack`
 * without a composer input. Also folds TPS and the context ring via overlays
 * (React nodes stay in place — relocating them breaks unmount, #104).
 * Dispose clears markers, placeholders, and viewport listeners.
 */

// Fast-path: previously marked strip still in the composer stack / phase context.
export function statsAnchorAlive(el: Element | null): boolean {
  if (el === null || !el.isConnected) return false
  if (el.closest('[data-phase]') === null) return false
  // Ancestry (not direct-child): 0.1.5 nests the status row under the composer card wrapper.
  return el.closest('[class*="_composerStack"]') !== null
}

export function createStatsLineTask(): ReconcilerTask {
  // Never relocate React-owned nodes (#104): unmount calls removeChild on the
  // original parent. Overlays use plugin placeholders; host nodes sit absolutely on top.
  // Relayout on flush and viewport resize (keyboard changes layout without DOM mutations).

  const ensurePositioned = (el: Element, marker: string): void => {
    if (getComputedStyle(el).position === 'static') el.setAttribute('data-mobile-nav', marker)
  }
  const positionedAncestor = (el: Element): Element | null => {
    for (let node = el.parentElement; node !== null; node = node.parentElement) {
      if (getComputedStyle(node).position !== 'static') return node
    }
    return null
  }
  const placeOverlay = (host: Element, reserve: Element): void => {
    const container = positionedAncestor(host)
    if (container === null) return
    const box = reserve.getBoundingClientRect()
    const base = container.getBoundingClientRect()
    const left = box.left - base.left - container.clientLeft
    // Vertically center on the reserve slot (taller ring vs neighboring keys).
    const hostRect = host.getBoundingClientRect()
    const top = box.top - base.top - container.clientTop - (hostRect.height - box.height) / 2
    const styled = host as HTMLElement
    if (styled.style.left !== `${left}px`) styled.style.left = `${left}px`
    if (styled.style.top !== `${top}px`) styled.style.top = `${top}px`
  }

  // Fold the TPS readout below the status strip into one line via overlay.
  const moveTps = (stats: Element): void => {
    const stack = stats.closest('[class*="_composerStack"]')
    if (stack === null) return
    let reserve = stats.querySelector(':scope > [data-mobile-nav="stats-tps-reserve"]')
    for (const el of stack.querySelectorAll('div')) {
      const text = (el.textContent ?? '').trim()
      if (!/^TPS\s+\d/.test(text)) continue
      if (el.children.length > 0) continue
      if (el.getAttribute('data-mobile-nav') === 'stats-tps') continue
      if (reserve === null) {
        reserve = document.createElement('span')
        reserve.setAttribute('data-mobile-nav', 'stats-tps-reserve')
        reserve.setAttribute('aria-hidden', 'true')
        stats.appendChild(reserve)
      }
      const live = el.textContent ?? ''
      if (reserve.textContent !== live) reserve.textContent = live
      el.setAttribute('data-mobile-nav', 'stats-tps')
      const tpsRow = el.parentElement
      if (tpsRow === null) continue
      ensurePositioned(tpsRow, 'stats-tps-row')
      placeOverlay(el, reserve)
      // Match overlay max-width to the placeholder so ellipsis clips with the flex group.
      const width = reserve.getBoundingClientRect().width
      const styled = el as HTMLElement
      if (styled.style.maxWidth !== `${width}px`) styled.style.maxWidth = `${width}px`
      return
    }
  }
  // Context ring in the input trailing cluster; CSS hides the "%" text (font-size:0).
  // Same overlay pattern as moveTps: ring stays where React rendered it.
  const moveRing = (stats: Element): void => {
    const holder = stats.parentElement
    const dock = holder === null ? null : holder.parentElement
    if (dock === null) return
    const ring = [...dock.children].find(
      (child) => !child.contains(stats) && /\d\s*%/.test(child.textContent ?? ''),
    )
    if (ring === undefined) return
    const row = document.querySelector('[data-composer-card] [class*="_row"] [class*="_trailing"]')
    if (row === null) return
    let reserve = row.querySelector(':scope > [data-mobile-nav="stats-ring-reserve"]')
    const primary = row.querySelector(':scope > [class*="_primary"]')
    if (reserve === null) {
      reserve = document.createElement('span')
      reserve.setAttribute('data-mobile-nav', 'stats-ring-reserve')
      row.insertBefore(reserve, primary)
    } else if (
      primary === null ? row.lastElementChild !== reserve : reserve.nextElementSibling !== primary
    ) {
      // React rebuilt the row; restore the reserved slot before `_primary`.
      row.insertBefore(reserve, primary)
    }
    if (ring.getAttribute('data-mobile-nav') !== 'stats-ring') {
      ring.setAttribute('data-mobile-nav', 'stats-ring')
    }
    ensurePositioned(dock, 'stats-ring-dock')
    placeOverlay(ring, reserve)
  }
  let viewportHandler: (() => void) | null = null
  const relayout = (): void => {
    const anchor = document.querySelector('[data-mobile-nav="stats"]')
    if (anchor === null) return
    moveTps(anchor)
    moveRing(anchor)
  }
  const mark = (): void => {
    // Keyboard / rotation relayout without DOM mutations — keep overlays synced.
    if (viewportHandler === null) {
      viewportHandler = relayout
      window.addEventListener('resize', relayout)
      window.visualViewport?.addEventListener('resize', relayout)
    }
    const anchor = document.querySelector('[data-mobile-nav="stats"]')
    if (anchor !== null && statsAnchorAlive(anchor)) {
      moveTps(anchor)
      moveRing(anchor)
      return
    }
    anchor?.removeAttribute('data-mobile-nav')
    // Descendant of composer stack (not always direct child — 0.1.5 nests under card wrapper).
    const stack = document.querySelector('[class*="_composerStack"]')
    if (stack === null) return
    for (const root of stack.querySelectorAll('[class*="_root"]')) {
      if (root.matches('[data-testid="todo-panel"]')) continue
      // Status row may be popover buttons (aria-haspopup); skip actionable non-status buttons.
      const buttons = root.querySelectorAll('button')
      if (buttons.length > 0 && ![...buttons].every((button) => button.getAttribute('aria-haspopup') !== null)) continue
      const text = root.textContent ?? ''
      if (!/(turns|steps|\bLLM\b|轮|步)/.test(text)) continue
      if (root.querySelector('textarea, [data-composer-input]') !== null) continue
      root.setAttribute('data-mobile-nav', 'stats')
      moveTps(root)
      moveRing(root)
      return
    }
  }
  // Wakes on `*` (TPS text is childList/characterData); full-tree scan is the re-anchor cost.
  return {
    name: 'stats-line',
    scopes: ['*'],
    ensure: mark,
    dispose: () => {
      if (viewportHandler !== null) {
        window.removeEventListener('resize', viewportHandler)
        window.visualViewport?.removeEventListener('resize', viewportHandler)
        viewportHandler = null
      }
      for (const el of document.querySelectorAll('[data-mobile-nav="stats-ring"], [data-mobile-nav="stats-tps"]')) {
        const styled = el as HTMLElement
        styled.style.left = ''
        styled.style.top = ''
        styled.style.maxWidth = ''
      }
      for (const key of ['stats', 'stats-ring', 'stats-ring-dock', 'stats-tps', 'stats-tps-row']) {
        for (const el of document.querySelectorAll(`[data-mobile-nav="${key}"]`)) {
          el.removeAttribute('data-mobile-nav')
        }
      }
      for (const el of document.querySelectorAll('[data-mobile-nav="stats-ring-reserve"], [data-mobile-nav="stats-tps-reserve"]')) {
        el.remove()
      }
    },
  }
}
