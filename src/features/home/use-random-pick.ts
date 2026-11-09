'use client'

import { useEffect, useState } from 'react'
import type { z } from 'zod'
import { pickRandom } from './pick'

type PickSource<T> = { items: readonly T[] } | { url: string; schema: z.ZodType<T[]> }
const IDLE_DELAY_MS = 2000

export function useRandomPick<T>(
  initial: T[],
  count: number,
  source: PickSource<T>,
  random: () => number = Math.random,
): T[] {
  const [picked, setPicked] = useState(initial)
  const items = 'items' in source ? source.items : undefined
  const url = 'url' in source ? source.url : undefined
  const schema = 'schema' in source ? source.schema : undefined

  useEffect(() => {
    let active = true
    const pick = async () => {
      try {
        let pool = items
        if (!pool && url && schema) {
          const response = await fetch(url)
          if (!response.ok) return
          const parsed = schema.safeParse(await response.json())
          if (!parsed.success) return
          pool = parsed.data
        }
        if (active && pool) setPicked(pickRandom(pool, count, random))
      } catch {
        // Havuz yüklenemezse sunucudaki seçim korunur; sayfa çevrimdışı da çalışır.
      }
    }
    const idle = typeof window.requestIdleCallback === 'function'
    const timer = idle
      ? window.requestIdleCallback(() => {
          void pick()
        })
      : window.setTimeout(
          () => {
            void pick()
          },
          items ? 0 : IDLE_DELAY_MS,
        )
    return () => {
      active = false
      if (idle) window.cancelIdleCallback(timer)
      else window.clearTimeout(timer)
    }
  }, [items, url, schema, count, random])
  return picked
}
