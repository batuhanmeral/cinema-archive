import type {
  AwardGroup,
  Collection,
  CrewJob,
  Film,
  Genre,
  Movement,
  Person,
  Theme,
} from '@/data/schemas'
import { countryName, languageName } from '@/lib/i18n/display-names'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { collectionHref, filmHref, movementHref, personHref } from '@/lib/i18n/routes'
import { archiveLink, genreLinks, personLink, themeLinks, type LinkItem } from '@/lib/link-items'
import type { SimilarFilm } from './similar'

export type IndexKey =
  'genre' | 'themes' | 'country' | 'language' | 'year' | 'runtime' | 'awards' | 'studio' | CrewJob

export type IndexRow = { key: IndexKey; label: string; items: LinkItem[] }

export type PersonCard = { name: string; role: string; profilePath: string | null; href?: string }

export type SimilarCard = {
  slug: string
  href: string
  posterPath: string | null
  title: string
  caption: string
  note: string
}

export type FilmViewContext = {
  people: Map<number, Person>
  genres: Map<number, Genre>
  themes: Map<number, Theme>
  movements: Movement[]
  collections: Collection[]
  awardGroups: AwardGroup[]
}

export type FilmView = {
  title: string
  originalTitle: string | null
  year: number
  overview: string | null
  posterPath: string | null
  tags: LinkItem[]
  index: IndexRow[]
  directors: PersonCard[]
  cast: PersonCard[]
  stills: string[]
  trailerKey: string | null
}

// Künyede uzun ekip listeleri sütunu boğmasın; tam liste kişi kartlarında.
export const CREW_ROW_LIMIT = 3

const CREW_JOBS: CrewJob[] = ['director', 'writer', 'producer', 'cinematographer', 'composer']
const DECADE = 10
const AWARD_SEPARATOR = ' · '

// Yalnızca boşluktan oluşan özet de yok sayılır; sayfada boş paragraf kalmasın.
export function presentOverview(film: Film, locale: Locale): string | null {
  const overview = film.overview[locale]?.trim()
  return overview ? overview : null
}

function personCard(person: Person, role: string, locale: Locale): PersonCard {
  const card: PersonCard = { name: person.name, role, profilePath: person.profilePath }
  return person.slug ? { ...card, href: personHref(locale, person.slug) } : card
}

function crewOf(film: Film, job: CrewJob, ctx: FilmViewContext): Person[] {
  return film.crew
    .filter((member) => member.job === job)
    .map((member) => ctx.people.get(member.personId))
    .filter((person) => person !== undefined)
}

function groupTags(locale: Locale, ctx: FilmViewContext): LinkItem[] {
  return [
    ...ctx.movements.map((m) => ({ text: m.name[locale], href: movementHref(locale, m.slug) })),
    ...ctx.collections.map((c) => ({ text: c.name[locale], href: collectionHref(locale, c.slug) })),
  ]
}

function awardsSummary(film: Film, locale: Locale, ctx: FilmViewContext): LinkItem[] {
  const parts = ctx.awardGroups
    .filter((group) => film.awards[group.key] !== undefined)
    .map((group) => `${film.awards[group.key]} ${group[locale]}`)
  return parts.length > 0 ? [{ text: parts.join(AWARD_SEPARATOR) }] : []
}

function buildIndex(film: Film, locale: Locale, ctx: FilmViewContext): IndexRow[] {
  const labels = messages[locale].film.index
  const items: [IndexKey, LinkItem[]][] = [
    ['genre', genreLinks(film.genreIds, locale, ctx.genres)],
    ['themes', themeLinks(film.keywordIds, locale, ctx.themes)],
    [
      'country',
      film.countries.map((code) =>
        archiveLink(locale, { country: code }, countryName(code, locale)),
      ),
    ],
    [
      'language',
      film.languages.map((code) =>
        archiveLink(locale, { language: code }, languageName(code, locale)),
      ),
    ],
    [
      'year',
      [archiveLink(locale, { decade: Math.floor(film.year / DECADE) * DECADE }, String(film.year))],
    ],
    ['runtime', film.runtime ? [{ text: messages[locale].film.minutes(film.runtime) }] : []],
    ['awards', awardsSummary(film, locale, ctx)],
    ['studio', film.studios.map((studio) => ({ text: studio }))],
    ...CREW_JOBS.map((job): [IndexKey, LinkItem[]] => [
      job,
      crewOf(film, job, ctx)
        .slice(0, CREW_ROW_LIMIT)
        .map((person) => personLink(person, locale)),
    ]),
  ]
  return items
    .filter(([, rowItems]) => rowItems.length > 0)
    .map(([key, rowItems]) => ({ key, label: labels[key], items: rowItems }))
}

export function buildFilmView(film: Film, locale: Locale, ctx: FilmViewContext): FilmView {
  const title = film.title[locale]
  const cast = [...film.cast]
    .sort((a, b) => a.order - b.order)
    .flatMap((member) => {
      const person = ctx.people.get(member.personId)
      return person ? [personCard(person, member.character, locale)] : []
    })

  return {
    title,
    originalTitle: film.originalTitle === title ? null : film.originalTitle,
    year: film.year,
    overview: presentOverview(film, locale),
    posterPath: film.poster[locale],
    tags: [
      ...groupTags(locale, ctx),
      ...genreLinks(film.genreIds, locale, ctx.genres),
      ...themeLinks(film.keywordIds, locale, ctx.themes),
    ],
    index: buildIndex(film, locale, ctx),
    directors: crewOf(film, 'director', ctx).map((person) =>
      personCard(person, messages[locale].film.directorRole, locale),
    ),
    cast,
    stills: film.backdrops,
    trailerKey: film.trailerKey,
  }
}

// Benzer film ve akım kartlarının ortak alt satırı: "Yönetmen, yıl".
export function directorYearCaption(film: Film, people: Map<number, Person>): string {
  const director = film.crew.find((member) => member.job === 'director')
  const name = director && people.get(director.personId)?.name
  return name ? `${name}, ${film.year}` : String(film.year)
}

export function buildSimilarCards(
  items: SimilarFilm[],
  locale: Locale,
  people: Map<number, Person>,
): SimilarCard[] {
  const reasons = messages[locale].film.similarReason
  return items.map(({ film, reason }) => ({
    slug: film.slug,
    href: filmHref(locale, film.slug),
    posterPath: film.poster[locale],
    title: film.title[locale],
    caption: directorYearCaption(film, people),
    note: reasons[reason],
  }))
}
