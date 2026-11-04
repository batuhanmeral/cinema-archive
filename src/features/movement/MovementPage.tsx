import 'server-only'
import { notFound } from 'next/navigation'
import { TmdbCredit } from '@/components/TmdbCredit'
import { store } from '@/lib/data'
import type { Locale } from '@/lib/i18n/locale'
import { HallExit } from './components/HallExit'
import { MovementDirectors } from './components/MovementDirectors'
import { MovementFilms } from './components/MovementFilms'
import { MovementHero } from './components/MovementHero'
import { MovementIndex } from './components/MovementIndex'
import { movementBySlug } from './queries'
import { buildMovementView } from './view-model'

export async function MovementPage({ slug, locale }: { slug: string; locale: Locale }) {
  const movement = movementBySlug(slug)
  if (!movement) notFound()

  const view = buildMovementView(movement, locale, {
    films: store.filmById,
    people: store.people(),
    movements: store.movements(),
  })

  return (
    <main id="content" tabIndex={-1} className="outline-none">
      <MovementHero view={view} />
      <MovementIndex rows={view.index} />
      <MovementDirectors directors={view.directors} locale={locale} />
      <MovementFilms films={view.films} locale={locale} />
      <HallExit previous={view.previous} next={view.next} locale={locale} />
      <TmdbCredit locales={[locale]} />
    </main>
  )
}
