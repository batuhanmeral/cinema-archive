import { describe, expect, it } from 'vitest'
import { arrowVisibility, focusAfterArrowChange } from './rail-state'

describe('arrowVisibility', () => {
  it('hides the start arrow at the start', () =>
    expect(arrowVisibility(0, 800, 2000)).toEqual({ start: false, end: true }))

  it('hides the end arrow at the end', () =>
    expect(arrowVisibility(1200, 800, 2000)).toEqual({ start: true, end: false }))

  it('hides both when nothing overflows', () =>
    expect(arrowVisibility(0, 800, 800)).toEqual({ start: false, end: false }))

  it('treats a sub-pixel gap at either edge as the edge', () =>
    expect(arrowVisibility(0.5, 800, 801)).toEqual({ start: false, end: false }))

  it('shows both arrows in the middle', () =>
    expect(arrowVisibility(400, 800, 2000)).toEqual({ start: true, end: true }))
})

describe('focusAfterArrowChange', () => {
  it('moves focus from a hiding end arrow to the visible start arrow', () =>
    expect(focusAfterArrowChange('end', { start: true, end: false })).toBe('start'))

  it('moves focus from a hiding start arrow to the visible end arrow', () =>
    expect(focusAfterArrowChange('start', { start: false, end: true })).toBe('end'))

  it('falls back to the track when both arrows hide', () =>
    expect(focusAfterArrowChange('end', { start: false, end: false })).toBe('track'))

  it('leaves focus alone while the focused arrow stays visible', () =>
    expect(focusAfterArrowChange('end', { start: true, end: true })).toBeNull())

  it('leaves focus alone when no arrow has focus', () =>
    expect(focusAfterArrowChange(null, { start: false, end: false })).toBeNull())
})
