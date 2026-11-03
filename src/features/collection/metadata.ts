import type { Metadata } from 'next'
import type { Collection } from '@/data/schemas'
import type { Locale } from '@/lib/i18n/locale'
import { collectionHref } from '@/lib/i18n/routes'
import { SITE_NAME } from '@/lib/site'

export function buildCollectionMetadata(
  collection: Collection,
  locale: Locale,
  siteUrl: string,
): Metadata {
  return {
    title: `${collection.name[locale]} · ${SITE_NAME}`,
    alternates: {
      canonical: `${siteUrl}${collectionHref(locale, collection.slug)}`,
      languages: {
        tr: `${siteUrl}${collectionHref('tr', collection.slug)}`,
        en: `${siteUrl}${collectionHref('en', collection.slug)}`,
      },
    },
  }
}
