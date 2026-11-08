import { describe, expect, it } from 'vitest'
import { pickRandom } from './pick'

describe('pickRandom', () => {
  it('picks distinct entries without changing the source, even with a constant random source', () => {
    const items = [1, 2, 3, 4]
    expect(new Set(pickRandom(items, 2, () => 0)).size).toBe(2)
    expect(pickRandom(items, 20, () => 0).sort()).toEqual(items)
    expect(items).toEqual([1, 2, 3, 4])
  })
  it('returns six unique members for every seeded draw', () => {
    let seed = 123
    const random = () => (seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32
    const items = Array.from({ length: 23 }, (_, i) => i)
    for (let i = 0; i < 1000; i++) {
      const picked = pickRandom(items, 6, random)
      expect(new Set(picked).size).toBe(6)
      expect(picked.every((item) => items.includes(item))).toBe(true)
    }
  })
})
