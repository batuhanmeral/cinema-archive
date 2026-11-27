import type { Metadata } from 'next'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { archiveHref } from '@/lib/i18n/routes'
import { SITE_NAME } from '@/lib/site'

// Kanonik adres sorgusuzdur; süzülmüş görünümler aynı sayfanın varyantıdır.
export function buildArchiveMetadata(locale: Locale, siteUrl: string): Metadata {
  const t = messages[locale].archive
  return {
    title: `${t.title} · ${SITE_NAME}`,
    description: t.description,
    alternates: {
      canonical: `${siteUrl}${archiveHref(locale, {})}`,
      languages: {
        tr: `${siteUrl}${archiveHref('tr', {})}`,
        en: `${siteUrl}${archiveHref('en', {})}`,
      },
    },
  }
}
