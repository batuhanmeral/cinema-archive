import type { Metadata } from 'next'
import { CollectionsListPage } from '@/features/collection/CollectionsListPage'
import { buildCollectionsListMetadata } from '@/features/collection/metadata'
import { buildCollectionTiles } from '@/features/collection/view-model'
import { store } from '@/lib/data'
import { getSiteEnv } from '@/lib/env'

export function generateMetadata(): Metadata {
  return buildCollectionsListMetadata('en', getSiteEnv().siteUrl)
}

export default function Page() {
  const tiles = buildCollectionTiles(store.collections(), 'en', { films: store.filmById })
  return <CollectionsListPage locale="en" tiles={tiles} />
}
