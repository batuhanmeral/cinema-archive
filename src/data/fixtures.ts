import type { Film, Person } from './schemas'

export function makeFilm(overrides: Partial<Film> = {}): Film {
  return {
    tmdbId: 1398,
    slug: 'stalker-1979',
    year: 1979,
    runtime: 163,
    originalTitle: 'Сталкер',
    title: { tr: 'İz Sürücü', en: 'Stalker' },
    overview: {
      tr: 'Bir rehber iki adamı Bölge’nin içine götürür.',
      en: 'A guide leads two men into the Zone.',
    },
    poster: { tr: '/stalker-tr.jpg', en: '/stalker-en.jpg' },
    backdrops: ['/stalker-backdrop.jpg'],
    trailerKey: null,
    genreIds: [878],
    keywordIds: [],
    countries: ['SU'],
    languages: ['ru'],
    studios: ['Mosfilm'],
    crew: [{ personId: 8452, job: 'director' }],
    cast: [{ personId: 8453, character: 'Stalker', order: 0 }],
    awards: {},
    voteCount: 1500,
    sources: ['cult-list'],
    ...overrides,
  }
}

export function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    tmdbId: 8452,
    name: 'Andrei Tarkovsky',
    profilePath: '/tarkovsky.jpg',
    slug: 'andrei-tarkovsky',
    ...overrides,
  }
}
