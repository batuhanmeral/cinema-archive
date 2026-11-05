import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CollectionPage } from '@/features/collection/CollectionPage'
import { buildCollectionMetadata } from '@/features/collection/metadata'
import { collectionBySlug } from '@/features/collection/queries'
import { store } from '@/lib/data'
import { getSiteEnv } from '@/lib/env'

type Props = { params: Promise<{ slug: string }> }

// Statik dışa aktarımda yalnızca bilinen koleksiyonlar üretilir; diğer slug'lar 404.
export const dynamicParams = false

export function generateStaticParams() {
  return store.collections().map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = collectionBySlug((await params).slug)
  if (!collection) notFound()
  return buildCollectionMetadata(collection, 'tr', getSiteEnv().siteUrl)
}

export default async function Page({ params }: Props) {
  return <CollectionPage slug={(await params).slug} locale="tr" />
}
