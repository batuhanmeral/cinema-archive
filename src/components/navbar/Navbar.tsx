'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { collectionsHref, homeHref, movementsHref } from '@/lib/i18n/routes'
import { LanguageToggle, LanguageToggleFallback } from './LanguageToggle'
import { MobileMenu } from './MobileMenu'
import { NavLinks } from './NavLinks'
import {
  INITIAL_NAV_STATE,
  NAV_HEIGHT,
  initialNavState,
  nextNavState,
  type NavState,
} from './nav-state'

// Hero'su olmayan liste sayfalarında navbar baştan dolu olur.
function hasHero(pathname: string, locale: Locale): boolean {
  return pathname !== movementsHref(locale) && pathname !== collectionsHref(locale)
}

export function Navbar({ locale }: { locale: Locale }) {
  const pathname = usePathname()
  const overHero = hasHero(pathname, locale)
  const [hidden, setHidden] = useState(INITIAL_NAV_STATE.hidden)
  const [solid, setSolid] = useState(!overHero)

  useEffect(() => {
    let state: NavState | undefined
    const update = () => {
      const y = window.scrollY
      const heroBottom = overHero ? window.innerHeight : 0
      state = state ? nextNavState(state, y, heroBottom) : initialNavState(y, heroBottom)
      setHidden(state.hidden)
      setSolid(state.solid)
    }
    // İlk ölçüm bir sonraki karede: sayfa kaydırılmış konumda açılabilir.
    const frame = requestAnimationFrame(update)
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update)
    }
  }, [overHero])

  return (
    <header
      style={{ height: NAV_HEIGHT }}
      className={`fixed inset-x-0 top-0 z-50 border-b text-[13px] transition-transform duration-200 motion-reduce:transition-none ${
        solid ? 'border-line bg-hall' : 'border-transparent'
      } has-[[aria-expanded=true]]:border-line has-[[aria-expanded=true]]:bg-hall ${hidden ? '-translate-y-full focus-within:translate-y-0' : 'translate-y-0'}`}
    >
      <nav className="wrap flex h-full items-center justify-between">
        {/* Ana sayfa M3'te gelir; o zamana kadar ön yükleme 404 üretir. */}
        <Link
          href={homeHref(locale)}
          prefetch={false}
          className="font-display text-2xl leading-none font-extrabold transition-colors duration-150 hover:text-accent"
        >
          Sinema Arşivi<span className="sr-only"> – {messages[locale].nav.home}</span>
        </Link>
        <div className="hidden items-center md:flex">
          <NavLinks locale={locale} pathname={pathname} variant="bar" />
          <Suspense fallback={<LanguageToggleFallback locale={locale} />}>
            <LanguageToggle locale={locale} />
          </Suspense>
        </div>
        <MobileMenu locale={locale} />
      </nav>
    </header>
  )
}
