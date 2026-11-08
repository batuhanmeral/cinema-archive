import { describe, expect, it } from 'vitest'
import { homeDataBody, homeDataFiles, homeDataUrl } from './home-data'
import { directorPoolSchema, perdeFilmsFileSchema, posterPoolSchema } from './schemas'

describe('static home data', () => {
  it('enumerates exactly 40 schema-valid localized files', () => {
    const files = homeDataFiles()
    expect(new Set(files).size).toBe(40)
    expect(files).toContain('perde-tr-french-new-wave.json')
    for (const file of files) {
      const schema = file.startsWith('perde-')
        ? perdeFilmsFileSchema
        : file.startsWith('films-')
          ? posterPoolSchema
          : directorPoolSchema
      expect(schema.safeParse(homeDataBody(file)).success, file).toBe(true)
    }
    expect(homeDataUrl('films-tr.json')).toBe('/home-data/films-tr.json')
  })
  it('rejects unknown paths rather than reading arbitrary files', () => {
    expect(() => homeDataBody('nope.json')).toThrow()
    expect(() => homeDataBody('../people.json')).toThrow()
  })
})
