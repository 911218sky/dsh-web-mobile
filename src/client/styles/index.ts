import { BASE_CSS } from './base.css.ts'
import { LAYOUT_CSS } from './layout.css.ts'
import { COMPAT_CSS } from './compat.css.ts'
import { MISC_CSS } from './misc.css.ts'

/**
 * Mobile styles concatenated in original sheet order (base → layout →
 * compat → misc). Injected as one <style data-plugin> tag; do not reorder.
 */
export const MOBILE_CSS = [BASE_CSS, LAYOUT_CSS, COMPAT_CSS, MISC_CSS].join('\n')
