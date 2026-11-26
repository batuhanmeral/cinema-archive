import type { Locale } from './locale'

// Türkçe ek, onluk adının son ünlüsüne göre değişir.
const TR_SUFFIX: Record<number, string> = {
  1890: 'lar',
  1900: 'ler',
  1910: 'lar',
  1920: 'ler',
  1930: 'lar',
  1940: 'lar',
  1950: 'ler',
  1960: 'lar',
  1970: 'ler',
  1980: 'ler',
  1990: 'lar',
  2000: 'ler',
  2010: 'lar',
  2020: 'ler',
}

export function decadeLabel(decade: number, locale: Locale): string {
  if (locale === 'en') return `${decade}s`
  return `${decade}'${TR_SUFFIX[decade] ?? 'ler'}`
}
