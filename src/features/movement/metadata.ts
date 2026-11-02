import type { Metadata } from 'next'
import type { Movement } from '@/data/schemas'
import { SITE_NAME } from '@/features/film/metadata'
import type { Locale } from '@/lib/i18n/locale'
import { movementHref } from '@/lib/i18n/routes'

export function buildMovementMetadata(
  movement: Movement,
  locale: Locale,
  siteUrl: string,
): Metadata {
  return {
    title: `${movement.name[locale]} · ${SITE_NAME}`,
    alternates: {
      canonical: `${siteUrl}${movementHref(locale, movement.slug)}`,
      languages: {
        tr: `${siteUrl}${movementHref('tr', movement.slug)}`,
        en: `${siteUrl}${movementHref('en', movement.slug)}`,
      },
    },
  }
}
