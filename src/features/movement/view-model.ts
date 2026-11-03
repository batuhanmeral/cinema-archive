import type { Film, Movement, Person, YearRange } from '@/data/schemas'
import { directorYearCaption, presentOverview } from '@/features/film/view-model'
import { countryName } from '@/lib/i18n/display-names'
import type { Locale } from '@/lib/i18n/locale'
import { messages, type Messages } from '@/lib/i18n/messages'
import { filmHref, movementHref, personHref } from '@/lib/i18n/routes'
import { archiveLink, personLink, type LinkItem } from '@/lib/link-items'

export type MovementIndexKey = keyof Messages['movement']['index']

export type MovementIndexRow = { key: MovementIndexKey; label: string; items: LinkItem[] }

export type DirectorCard = { name: string; href?: string; profilePath: string | null; note: string }

export type MovementFilmCard = {
  href: string
  posterPath: string | null
  title: string
  caption: string
  overview: string | null
}

export type HallLink = { name: string; href: string; meta: string; imagePath: string | null }

export type MovementView = {
  name: string
  meta: string
  heroImage: string | null
  stripImage: string | null
  index: MovementIndexRow[]
  directors: DirectorCard[]
  films: MovementFilmCard[]
  previous: HallLink
  next: HallLink
}

export type MovementViewContext = {
  films: (id: number) => Film | undefined
  people: Map<number, Person>
  movements: Movement[]
}

const META_SEPARATOR = ' · '
// Künye kuralları (global kısıtlar): oyuncu ilk 8 sırada, en az 2 filmde; en fazla 4 yüz.
const FACE_BILLING_LIMIT = 8
const FACE_LIMIT = 4
const MIN_SHARED_FILMS = 2

function yearsText({ start, end }: YearRange): string {
  return `${start}–${end ?? ''}`
}

// Birden çok ülkeli akımda içerikteki ilk ülke akımın doğduğu yerdir.
function primaryCountry(movement: Movement, locale: Locale): string {
  const [first] = movement.countries
  return first ? countryName(first, locale) : ''
}

export function movementMeta(
  movement: Movement,
  locale: Locale,
  counts?: { films: number; directors: number },
): string {
  const years = yearsText(movement.years)
  const country = primaryCountry(movement, locale)
  if (!counts) return [country, years].join(META_SEPARATOR)
  const t = messages[locale].movement
  return [years, country, t.filmCount(counts.films), t.directorCount(counts.directors)].join(
    META_SEPARATOR,
  )
}

function memberFilms(movement: Movement, ctx: MovementViewContext): Film[] {
  return movement.filmIds
    .map((id) => ctx.films(id))
    .filter((film) => film !== undefined)
    .sort((a, b) => a.year - b.year)
}

// Görsel: en çok oy alan, sahnesi olan filmler; kahraman ilkinden, şerit ikincisinden.
function backdropsByVotes(films: Film[]): string[] {
  return films
    .filter((film) => film.backdrops.length > 0)
    .sort((a, b) => b.voteCount - a.voteCount || a.tmdbId - b.tmdbId)
    .flatMap((film) => film.backdrops.slice(0, 1))
}

function images(films: Film[]): { hero: string | null; strip: string | null } {
  const [first, second] = backdropsByVotes(films)
  return { hero: first ?? null, strip: second ?? first ?? null }
}

type Ranked = { person: Person; films: number }

// Her kişi film başına bir kez sayılır; çok filmli olan önce, eşitlikte ada göre.
function rankPeople(filmPeople: number[][], people: Map<number, Person>, locale: Locale): Ranked[] {
  const counts = new Map<number, number>()
  for (const ids of filmPeople) {
    for (const id of new Set(ids)) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return [...counts]
    .flatMap(([id, films]) => {
      const person = people.get(id)
      return person ? [{ person, films }] : []
    })
    .sort((a, b) => b.films - a.films || a.person.name.localeCompare(b.person.name, locale))
}

function crewIds(film: Film, job: 'director' | 'cinematographer'): number[] {
  return film.crew.filter((member) => member.job === job).map((member) => member.personId)
}

function faceIds(film: Film): number[] {
  return film.cast
    .filter((member) => member.order < FACE_BILLING_LIMIT)
    .map((member) => member.personId)
}

function sharedBy(ranked: Ranked[]): Person[] {
  return ranked.filter((entry) => entry.films >= MIN_SHARED_FILMS).map((entry) => entry.person)
}

function buildIndex(
  movement: Movement,
  films: Film[],
  locale: Locale,
  ctx: MovementViewContext,
): MovementIndexRow[] {
  const labels = messages[locale].movement.index
  const toLinks = (people: Person[]) => people.map((person) => personLink(person, locale))
  const pioneers = movement.pioneerIds
    .map((id) => ctx.people.get(id))
    .filter((person) => person !== undefined)
  const faces = sharedBy(rankPeople(films.map(faceIds), ctx.people, locale)).slice(0, FACE_LIMIT)
  const cinematographers = sharedBy(
    rankPeople(
      films.map((film) => crewIds(film, 'cinematographer')),
      ctx.people,
      locale,
    ),
  ).slice(0, 1)

  const rows: [MovementIndexKey, LinkItem[]][] = [
    ['years', [{ text: yearsText(movement.years) }]],
    [
      'country',
      movement.countries.map((code) =>
        archiveLink(locale, { country: code }, countryName(code, locale)),
      ),
    ],
    ['pioneers', toLinks(pioneers)],
    ['faces', toLinks(faces)],
    ['cinematography', toLinks(cinematographers)],
  ]
  return rows
    .filter(([, items]) => items.length > 0)
    .map(([key, items]) => ({ key, label: labels[key], items }))
}

function directorCard({ person, films }: Ranked, locale: Locale): DirectorCard {
  const card = {
    name: person.name,
    profilePath: person.profilePath,
    note: messages[locale].movement.filmCount(films),
  }
  return person.slug ? { ...card, href: personHref(locale, person.slug) } : card
}

function filmCard(film: Film, locale: Locale, people: Map<number, Person>): MovementFilmCard {
  return {
    href: filmHref(locale, film.slug),
    posterPath: film.poster[locale],
    title: film.title[locale],
    caption: directorYearCaption(film, people),
    overview: presentOverview(film, locale),
  }
}

function hallLink(movement: Movement, locale: Locale, ctx: MovementViewContext): HallLink {
  return {
    name: movement.name[locale],
    href: movementHref(locale, movement.slug),
    meta: movementMeta(movement, locale),
    imagePath: images(memberFilms(movement, ctx)).strip,
  }
}

// Önceki/sonraki salon kronolojik sırada döner: ilk akımın öncesi sonuncusudur.
function neighbours(movement: Movement, all: Movement[]): { previous: Movement; next: Movement } {
  const at = all.findIndex((m) => m.slug === movement.slug)
  if (at === -1) return { previous: movement, next: movement }
  return {
    previous: all[(at - 1 + all.length) % all.length] ?? movement,
    next: all[(at + 1) % all.length] ?? movement,
  }
}

export function buildMovementView(
  movement: Movement,
  locale: Locale,
  ctx: MovementViewContext,
): MovementView {
  const films = memberFilms(movement, ctx)
  const directors = rankPeople(
    films.map((film) => crewIds(film, 'director')),
    ctx.people,
    locale,
  )
  const { hero, strip } = images(films)
  const { previous, next } = neighbours(movement, ctx.movements)

  return {
    name: movement.name[locale],
    meta: movementMeta(movement, locale, { films: films.length, directors: directors.length }),
    heroImage: hero,
    stripImage: strip,
    index: buildIndex(movement, films, locale, ctx),
    directors: directors.map((entry) => directorCard(entry, locale)),
    films: films.map((film) => filmCard(film, locale, ctx.people)),
    previous: hallLink(previous, locale, ctx),
    next: hallLink(next, locale, ctx),
  }
}

// Liste sayfası şeritleri verideki (kronolojik) sırada gelir.
export function buildMovementStrips(
  movements: Movement[],
  locale: Locale,
  ctx: MovementViewContext,
): HallLink[] {
  return movements.map((movement) => hallLink(movement, locale, ctx))
}
