import type { Metadata } from 'next'
import type { Locale } from '@/lib/i18n/locale'
import { homeHref } from '@/lib/i18n/routes'
import { SITE_NAME } from '@/lib/site'

export function buildHomeMetadata(locale: Locale, siteUrl: string): Metadata {
  return {
    title: SITE_NAME,
    alternates: {
      canonical: `${siteUrl}${homeHref(locale)}`,
      languages: { tr: `${siteUrl}${homeHref('tr')}`, en: `${siteUrl}${homeHref('en')}` },
    },
  }
}
