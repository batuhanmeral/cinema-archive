import type { Locale } from './locale'

// Intl artık var olmayan ülkeleri ya hiç adlandırmıyor ya da tutarsız adlandırıyor.
const HISTORICAL_COUNTRIES: Record<string, Record<Locale, string>> = {
  SU: { tr: 'Sovyetler Birliği', en: 'Soviet Union' },
  XC: { tr: 'Çekoslovakya', en: 'Czechoslovakia' },
  CS: { tr: 'Sırbistan-Karadağ', en: 'Serbia and Montenegro' },
  YU: { tr: 'Yugoslavya', en: 'Yugoslavia' },
  XG: { tr: 'Doğu Almanya', en: 'East Germany' },
  DD: { tr: 'Doğu Almanya', en: 'East Germany' },
  AN: { tr: 'Hollanda Antilleri', en: 'Netherlands Antilles' },
}

// TMDB Kantonca için ISO dışı "cn" kodunu kullanıyor; Intl bunu tanımıyor.
const NON_ISO_LANGUAGES: Record<string, Record<Locale, string>> = {
  cn: { tr: 'Kantonca', en: 'Cantonese' },
}

const regionNames = {
  tr: new Intl.DisplayNames('tr', { type: 'region' }),
  en: new Intl.DisplayNames('en', { type: 'region' }),
}

const languageNames = {
  tr: new Intl.DisplayNames('tr', { type: 'language' }),
  en: new Intl.DisplayNames('en', { type: 'language' }),
}

// Türkçe dil adları küçük harfle gelebilir; "i" harfi "İ" olmalı.
function capitalize(name: string, locale: Locale): string {
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1)
}

export function countryName(code: string, locale: Locale): string {
  const name = HISTORICAL_COUNTRIES[code]?.[locale] ?? regionNames[locale].of(code) ?? code
  return capitalize(name, locale)
}

export function languageName(code: string, locale: Locale): string {
  const name = NON_ISO_LANGUAGES[code]?.[locale] ?? languageNames[locale].of(code) ?? code
  return capitalize(name, locale)
}
