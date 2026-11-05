import 'server-only'
import { notFound } from 'next/navigation'
import { TmdbCredit } from '@/components/TmdbCredit'
import { store } from '@/lib/data'
import type { Locale } from '@/lib/i18n/locale'
import { CollectionHero } from './components/CollectionHero'
import { CollectionList } from './components/CollectionList'
import { CollectionOthers } from './components/CollectionOthers'
import { collectionBySlug } from './queries'
import { buildCollectionView } from './view-model'

export async function CollectionPage({ slug, locale }: { slug: string; locale: Locale }) {
  const collection = collectionBySlug(slug)
  if (!collection) notFound()

  const view = buildCollectionView(collection, locale, {
    films: store.filmById,
    people: store.people(),
    genres: store.genres(),
    themes: store.themes(),
    collections: store.collections(),
  })

  return (
    <main id="content" tabIndex={-1} className="outline-none">
      <CollectionHero view={view} />
      <CollectionList rows={view.rows} locale={locale} />
      <CollectionOthers others={view.others} locale={locale} />
      <TmdbCredit locales={[locale]} />
    </main>
  )
}
