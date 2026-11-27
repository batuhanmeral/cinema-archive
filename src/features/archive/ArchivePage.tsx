import 'server-only'
import { Suspense } from 'react'
import { TmdbCredit } from '@/components/TmdbCredit'
import { EMPTY_QUERY } from '@/lib/archive-query'
import { store } from '@/lib/data'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { buildArchiveIndex } from './archive-data'
import { ArchiveGrid, PAGE_SIZE } from './components/ArchiveGrid'
import { ArchiveHero } from './components/ArchiveHero'
import { ArchiveView } from './components/ArchiveView'
import { FilterBar } from './components/FilterBar'
import { buildFacetLabels, heroStats } from './labels'
import { selectFilms } from './select'

// Hero, en çok oy alan ve sahne görseli olan filmin ilk karesini kullanır.
function heroImage(): string | null {
  const films = [...store.films()].sort((a, b) => b.voteCount - a.voteCount)
  return films.find((film) => film.backdrops.length > 0)?.backdrops[0] ?? null
}

export function ArchivePage({ locale }: { locale: Locale }) {
  const t = messages[locale].archive
  const index = buildArchiveIndex(locale, {
    films: store.films(),
    people: store.people(),
    themes: store.themes(),
    movements: store.movements(),
    collections: store.collections(),
    filmById: store.filmById,
  })
  const labels = buildFacetLabels(locale, index.films)
  const total = index.films.length
  const initialFilms = selectFilms(index.films, EMPTY_QUERY, { locale, scores: null }).slice(
    0,
    PAGE_SIZE,
  )

  return (
    <main id="content" tabIndex={-1} className="outline-none">
      <ArchiveHero
        title={t.title}
        meta={t.heroMeta(heroStats(index.films))}
        description={t.description}
        imagePath={heroImage()}
      />
      {/* Statik çıktı sorgusuz üretilir: JS'siz ilk 48 film yıl sırasıyla, denetimler devre dışı. */}
      <Suspense
        fallback={
          <>
            <FilterBar locale={locale} query={EMPTY_QUERY} facets={null} count={total} disabled />
            <ArchiveGrid films={initialFilms} locale={locale} />
          </>
        }
      >
        <ArchiveView locale={locale} labels={labels} initialFilms={initialFilms} total={total} />
      </Suspense>
      <TmdbCredit locales={[locale]} />
    </main>
  )
}
