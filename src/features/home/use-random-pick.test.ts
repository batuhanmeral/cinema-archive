// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { useRandomPick } from './use-random-pick'

const initial = [99]
const items = [1, 2, 3, 4]
const zero = () => 0
const schema = z.array(z.number())
beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useRandomPick', () => {
  it('keeps the first render deterministic, then picks distinct items after mount', async () => {
    const { result } = renderHook(() => useRandomPick(initial, 2, { items }, zero))
    expect(result.current).toBe(initial)
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current).toEqual([1, 2])
  })
  it.each(['network', 'invalid', 'http'])('keeps the defaults on a %s failure', async (kind) => {
    vi.stubGlobal(
      'fetch',
      kind === 'network'
        ? vi.fn().mockRejectedValue(new Error('offline'))
        : vi
            .fn()
            .mockResolvedValue(
              new Response(JSON.stringify(['bad']), { status: kind === 'http' ? 503 : 200 }),
            ),
    )
    const { result } = renderHook(() =>
      useRandomPick(initial, 2, { url: '/home-data/test.json', schema }, zero),
    )
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current).toBe(initial)
  })
  it('validates and samples a fetched pool', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(items))))
    const { result } = renderHook(() =>
      useRandomPick(initial, 2, { url: '/home-data/test.json', schema }, zero),
    )
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current).toEqual([1, 2])
  })
})
