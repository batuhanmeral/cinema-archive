import { describe, expect, it } from 'vitest'
import { normalizeText } from './normalize-text'

describe('normalizeText', () => {
  it('folds Turkish capitals and dotless i', () => {
    expect(normalizeText('İZ SÜRÜCÜ')).toBe('iz surucu')
    expect(normalizeText('Iz Sürücü')).toBe('iz surucu')
    expect(normalizeText('iz surucu')).toBe('iz surucu')
  })
  it('strips diacritics and maps special letters', () => {
    expect(normalizeText('Ağır Roman')).toBe('agir roman')
    expect(normalizeText('Être et avoir')).toBe('etre et avoir')
    expect(normalizeText('Łódź')).toBe('lodz')
  })
  it('replaces punctuation with spaces and trims', () => {
    expect(normalizeText('Ölü Bir Adamdan Mektuplar!')).toBe('olu bir adamdan mektuplar')
    expect(normalizeText('  --  ')).toBe('')
  })
})
