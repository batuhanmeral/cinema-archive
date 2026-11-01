import { describe, expect, it } from 'vitest'
import {
  archiveHref,
  collectionHref,
  collectionsHref,
  filmHref,
  homeHref,
  movementHref,
  movementsHref,
  personHref,
  switchLocalePath,
} from './routes'

describe('switchLocalePath', () => {
  it('switches a film path both ways', () => {
    expect(switchLocalePath('/film/stalker-1979', 'en')).toBe('/en/film/stalker-1979')
    expect(switchLocalePath('/en/film/stalker-1979', 'tr')).toBe('/film/stalker-1979')
  })
  it('translates segments and keeps the query', () =>
    expect(switchLocalePath('/arsiv?genre=878&decade=1970', 'en')).toBe(
      '/en/archive?genre=878&decade=1970',
    ))
  it('translates segments back to Turkish', () => {
    expect(switchLocalePath('/en/person/andrei-tarkovsky', 'tr')).toBe('/kisi/andrei-tarkovsky')
    expect(switchLocalePath('/en/movements', 'tr')).toBe('/akimlar')
  })
  it('maps the home pages', () => {
    expect(switchLocalePath('/', 'en')).toBe('/en')
    expect(switchLocalePath('/en', 'tr')).toBe('/')
  })
})

describe('href builders', () => {
  it('builds film, person and home links per locale', () => {
    expect(filmHref('tr', 'stalker-1979')).toBe('/film/stalker-1979')
    expect(filmHref('en', 'stalker-1979')).toBe('/en/film/stalker-1979')
    expect(personHref('tr', 'andrei-tarkovsky')).toBe('/kisi/andrei-tarkovsky')
    expect(personHref('en', 'andrei-tarkovsky')).toBe('/en/person/andrei-tarkovsky')
    expect(homeHref('tr')).toBe('/')
    expect(homeHref('en')).toBe('/en')
  })
  it('builds archive links with language-independent keys', () => {
    expect(archiveHref('tr', { genre: 878, decade: 1970 })).toBe('/arsiv?genre=878&decade=1970')
    expect(archiveHref('en', { genre: 878 })).toBe('/en/archive?genre=878')
  })
})

describe('movement and collection hrefs', () => {
  it('builds per-locale links', () => {
    expect(movementHref('en', 'french-new-wave')).toBe('/en/movement/french-new-wave')
    expect(movementHref('tr', 'french-new-wave')).toBe('/akim/french-new-wave')
    expect(movementsHref('tr')).toBe('/akimlar')
    expect(collectionHref('tr', 'slow-cinema')).toBe('/koleksiyon/slow-cinema')
    expect(collectionsHref('tr')).toBe('/koleksiyonlar')
    expect(collectionsHref('en')).toBe('/en/collections')
  })
  it('switches a movement path', () =>
    expect(switchLocalePath('/akim/french-new-wave', 'en')).toBe('/en/movement/french-new-wave'))
})
