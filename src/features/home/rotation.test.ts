import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ROTATION, ROTATION_EPOCH_MS, WEEK_MS, rotationSlot, slotAttr, weekIndex } from './rotation'

describe('weekly rotation', () => {
  it('pins every movement in data order', () => {
    const movements = JSON.parse(readFileSync('data/movements.json', 'utf8')) as { slug: string }[]
    expect(ROTATION).toEqual(movements.map((movement) => movement.slug))
    expect(new Set(ROTATION).size).toBe(18)
    expect(rotationSlot('french-new-wave')).toBe(5)
    expect(rotationSlot('unknown')).toBe(-1)
    expect(slotAttr(5)).toBe('w5')
  })
  it.each([
    [Date.UTC(2026, 0, 4, 21), 0],
    [Date.UTC(2026, 0, 4, 20, 59), 17],
    [Date.UTC(2026, 0, 11, 21), 1],
    [Date.parse('2026-01-11T13:30:00-08:00'), 1],
  ])('selects the Istanbul week at %s', (now, expected) => {
    expect(weekIndex(now)).toBe(expected)
  })
  it('wraps both sides of the epoch', () => {
    expect(weekIndex(ROTATION_EPOCH_MS + 18 * WEEK_MS)).toBe(0)
    expect(weekIndex(ROTATION_EPOCH_MS - 1)).toBe(17)
  })
})
