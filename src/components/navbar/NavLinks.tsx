import Link from 'next/link'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { collectionHref, collectionsHref, movementHref, movementsHref } from '@/lib/i18n/routes'

// Statik dışa aktarımda yol sonda "/" ile gelebilir; karşılaştırmalar ona göre yapılır.
export const withoutTrailingSlash = (pathname: string) => pathname.replace(/\/$/, '')

const LINK_STYLE = {
  bar: 'inline-flex h-8 items-center px-3 transition-colors duration-200 hover:bg-surface hover:text-accent aria-[current=page]:text-accent',
  menu: 'block border-b border-line py-2.5 font-display text-[40px] leading-tight font-extrabold transition-colors duration-150 hover:text-accent aria-[current=page]:text-accent',
}

function isInSection(pathname: string, listHref: string, detailPrefix: string): boolean {
  const path = withoutTrailingSlash(pathname)
  return path === listHref || path.startsWith(detailPrefix)
}

export function NavLinks({
  locale,
  pathname,
  variant,
}: {
  locale: Locale
  pathname: string
  variant: 'bar' | 'menu'
}) {
  const { nav } = messages[locale]
  const sections = [
    {
      label: nav.movements,
      href: movementsHref(locale),
      current: isInSection(pathname, movementsHref(locale), movementHref(locale, '')),
    },
    {
      label: nav.collections,
      href: collectionsHref(locale),
      current: isInSection(pathname, collectionsHref(locale), collectionHref(locale, '')),
    },
  ]
  return sections.map(({ label, href, current }) => (
    <Link
      key={href}
      href={href}
      aria-current={current ? 'page' : undefined}
      className={LINK_STYLE[variant]}
    >
      {label}
    </Link>
  ))
}
