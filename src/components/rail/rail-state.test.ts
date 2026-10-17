import { describe, expect, it } from 'vitest'
import { arrowVisibility } from './rail-state'

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
