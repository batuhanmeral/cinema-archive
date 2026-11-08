import { describe, expect, it } from 'vitest'
import { weekCss } from './week-css'

describe('weekCss', () => {
  it('wraps frames, ordered strips and notes without escaped selectors', () => {
    const css = weekCss(17, 18)
    expect(css).toContain('[data-perde-slot]:not([data-perde-slot=w17])')
    expect(css).toContain('[data-home-strip=w0]{order:1}')
    expect(css).toContain('[data-home-strip=w2]{order:3}')
    expect(css).toContain('[data-strip-slot=w17] [data-note=current]')
    expect(css).toContain('[data-strip-slot=w0] [data-note=next]')
    expect(css).not.toMatch(/["'<>]/)
    expect(weekCss.toString()).not.toMatch(/\bROTATION|slotAttr\b/)
  })
})
