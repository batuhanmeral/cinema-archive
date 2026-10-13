import { describe, expect, it } from 'vitest'
import { countryName, languageName } from './display-names'

describe('display names', () => {
  it('names Soviet Union in both languages', () => {
    expect(countryName('SU', 'tr')).toBe('Sovyetler Birliği')
    expect(countryName('SU', 'en')).toBe('Soviet Union')
  })
  it('names other historical countries', () => {
    expect(countryName('XG', 'tr')).toBe('Doğu Almanya')
    expect(countryName('DD', 'en')).toBe('East Germany')
    expect(countryName('YU', 'tr')).toBe('Yugoslavya')
  })
  it('uses Intl for current countries and languages', () => {
    expect(countryName('FR', 'tr')).toBe('Fransa')
    expect(languageName('ru', 'tr')).toBe('Rusça')
    expect(languageName('ja', 'en')).toBe('Japanese')
  })
  it("names TMDB's non-ISO Cantonese code", () => {
    expect(languageName('cn', 'tr')).toBe('Kantonca')
    expect(languageName('cn', 'en')).toBe('Cantonese')
  })
  it('upper-cases the first letter of Turkish names', () =>
    expect(languageName('it', 'tr')).toBe('İtalyanca'))
})
