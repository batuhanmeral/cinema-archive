import 'server-only'
import type { Movement } from '@/data/schemas'
import { store } from '@/lib/data'

export function movementBySlug(slug: string): Movement | undefined {
  return store.movements().find((movement) => movement.slug === slug)
}
