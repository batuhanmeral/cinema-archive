import 'server-only'
import type { Collection } from '@/data/schemas'
import { store } from '@/lib/data'

export function collectionBySlug(slug: string): Collection | undefined {
  return store.collections().find((collection) => collection.slug === slug)
}
