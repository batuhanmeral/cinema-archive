import type { Metadata } from 'next'
import type { Movement } from '@/data/schemas'
import { SITE_NAME } from '@/lib/site'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { movementHref, movementsHref } from '@/lib/i18n/routes'

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

export function buildMovementsListMetadata(locale: Locale, siteUrl: string): Metadata {
  return {
    title: `${messages[locale].movement.listTitle} · ${SITE_NAME}`,
    alternates: {
      canonical: `${siteUrl}${movementsHref(locale)}`,
      languages: {
        tr: `${siteUrl}${movementsHref('tr')}`,
        en: `${siteUrl}${movementsHref('en')}`,
      },
    },
  }
}
