import 'server-only'
import { notFound } from 'next/navigation'
import { TmdbCredit } from '@/components/TmdbCredit'
import { store } from '@/lib/data'
import type { Locale } from '@/lib/i18n/locale'
import { CastSection } from './components/CastSection'
import { FilmHero } from './components/FilmHero'
import { SimilarFilms } from './components/SimilarFilms'
import { TrailerAndStills } from './components/TrailerAndStills'
import { findSimilarFilms } from './similar'
import { buildFilmView, buildSimilarCards } from './view-model'

export async function FilmPage({ slug, locale }: { slug: string; locale: Locale }) {
  const film = store.filmBySlug(slug)
  if (!film) notFound()

  const membership = store.membership()
  const view = buildFilmView(film, locale, {
    people: store.people(),
    genres: store.genres(),
    themes: store.themes(),
    movements: membership.movementsOf(film.tmdbId),
    collections: membership.collectionsOf(film.tmdbId),
    awardGroups: store.awardGroups(),
  })
  const similar = buildSimilarCards(
    findSimilarFilms(film, store.films(), new Set(store.themes().keys()), membership),
    locale,
    store.people(),
  )

  return (
    <main>
      <FilmHero view={view} locale={locale} />
      <TrailerAndStills view={view} locale={locale} />
      <CastSection directors={view.directors} cast={view.cast} locale={locale} />
      <SimilarFilms cards={similar} locale={locale} />
      <TmdbCredit locales={[locale]} />
    </main>
  )
}
