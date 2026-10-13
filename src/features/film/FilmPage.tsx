import 'server-only'
import { notFound } from 'next/navigation'
import { TmdbCredit } from '@/components/TmdbCredit'
import { store } from '@/lib/data'
import type { Locale } from '@/lib/i18n/locale'
import { FilmHero } from './components/FilmHero'
import { buildFilmView } from './view-model'

export async function FilmPage({ slug, locale }: { slug: string; locale: Locale }) {
  const film = store.filmBySlug(slug)
  if (!film) notFound()

  const view = buildFilmView(film, locale, {
    people: store.people(),
    genres: store.genres(),
    themes: store.themes(),
    awardGroups: store.awardGroups(),
  })

  return (
    <main>
      <FilmHero view={view} locale={locale} />
      <TmdbCredit locale={locale} />
    </main>
  )
}
