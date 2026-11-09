import { describe, expect, it } from 'vitest'
import { perdeStep, swipeDirection } from './perde-state'

describe('Perde navigation', () => {
  it('wraps in either direction', () => {
    expect(perdeStep(15, 1, 16)).toBe(0)
    expect(perdeStep(0, -1, 16)).toBe(15)
  })
  it.each([
    [-60, 10, 1],
    [60, 10, -1],
    [-30, 0, 0],
    [-60, 80, 0],
    [-40, 0, 1],
    [-60, 60, 0],
  ])('maps the swipe %s/%s to %s', (dx, dy, expected) => {
    expect(swipeDirection(dx, dy)).toBe(expected)
  })
})
