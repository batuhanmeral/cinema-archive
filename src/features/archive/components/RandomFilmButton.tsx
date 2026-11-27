'use client'

import { usePathname, useRouter } from 'next/navigation'
import { loadFilmSlugs } from '@/features/search/load'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { filmHref } from '@/lib/i18n/routes'
import { currentFilmSlug, pickRandomSlug } from '../random'

const STYLE = {
  bar: 'inline-flex h-8 items-center px-3 transition-colors duration-200 hover:bg-surface hover:text-accent',
  menu: 'block py-2.5 text-[15px] transition-colors duration-150 hover:text-accent',
}

// Film listesi ilk tıklamada yüklenir; yüklenemezse düğme sessizce bir şey yapmaz.
export function RandomFilmButton({ locale, variant }: { locale: Locale; variant: 'bar' | 'menu' }) {
  const pathname = usePathname()
  const router = useRouter()
  const open = () => {
    loadFilmSlugs()
      .then((slugs) => {
        const slug = pickRandomSlug(slugs, currentFilmSlug(pathname))
        if (slug) router.push(filmHref(locale, slug))
      })
      .catch(() => {})
  }
  return (
    <button type="button" onClick={open} className={STYLE[variant]}>
      {messages[locale].nav.random}
    </button>
  )
}
