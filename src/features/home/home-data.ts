import 'server-only'
import { store } from '@/lib/data'
import { LOCALES } from '@/lib/i18n/locale'
import { ROTATION } from '@/lib/rotation'
import { buildDirectorPool, buildPerdeFilms, buildPosterPool } from './view-model'

export { homeDataUrl } from './view-model'

export function homeDataFiles(): string[] {
  return LOCALES.flatMap((locale) => [
    ...ROTATION.map((slug) => `perde-${locale}-${slug}.json`),
    `films-${locale}.json`,
    `directors-${locale}.json`,
  ])
}

export function homeDataBody(file: string): unknown {
  for (const locale of LOCALES) {
    if (file === `films-${locale}.json`)
      return buildPosterPool(store.films(), locale, store.people())
    if (file === `directors-${locale}.json`)
      return buildDirectorPool(store.films(), locale, store.people())
    const movement = store
      .movements()
      .find((movement) => file === `perde-${locale}-${movement.slug}.json`)
    if (movement)
      return buildPerdeFilms(movement, locale, {
        films: store.filmById,
        people: store.people(),
        movements: store.movements(),
      })
  }
  throw new Error(`Unknown home data file: ${file}`)
}
