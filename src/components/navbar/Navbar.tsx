'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { SearchBox } from '@/features/search/components/SearchBox'
import { SearchPanel } from '@/features/search/components/SearchPanel'
import { useSlashFocus } from '@/features/search/components/use-slash-focus'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { collectionsHref, homeHref, movementsHref } from '@/lib/i18n/routes'
import { LanguageToggle, LanguageToggleFallback } from './LanguageToggle'
import { MobileMenu } from './MobileMenu'
import { NavLinks, withoutTrailingSlash } from './NavLinks'
import {
  INITIAL_NAV_STATE,
  NAV_HEIGHT,
  initialNavState,
  nextNavState,
  type NavState,
} from './nav-state'

// Hero'su olmayan liste sayfalarında navbar baştan dolu olur.
function hasHero(pathname: string, locale: Locale): boolean {
  const path = withoutTrailingSlash(pathname)
  return path !== movementsHref(locale) && path !== collectionsHref(locale)
}

export function Navbar({ locale }: { locale: Locale }) {
  const pathname = usePathname()
  const overHero = hasHero(pathname, locale)
  const [hidden, setHidden] = useState(INITIAL_NAV_STATE.hidden)
  const [solid, setSolid] = useState(!overHero)
  // Mobil menü ve arama paneli aynı anda açık olmaz.
  const [overlay, setOverlay] = useState<'menu' | 'search' | null>(null)
  const barInputRef = useRef<HTMLInputElement>(null)
  useSlashFocus(barInputRef)

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
    // data-hidden: arşivin yapışkan süzgeç çubuğu navbar gizlenince en üste çıkar.
    <header
      style={{ height: NAV_HEIGHT }}
      data-hidden={hidden ? '' : undefined}
      className={`fixed inset-x-0 top-0 z-50 border-b text-[13px] transition-transform duration-200 motion-reduce:transition-none ${
        solid ? 'border-line bg-hall' : 'border-transparent'
      } has-[[aria-expanded=true]]:translate-y-0 has-[[aria-expanded=true]]:border-line has-[[aria-expanded=true]]:bg-hall ${hidden ? '-translate-y-full focus-within:translate-y-0' : 'translate-y-0'}`}
    >
      <nav className="wrap flex h-full items-center justify-between">
        <Link
          href={homeHref(locale)}
          className="font-display text-2xl leading-none font-extrabold transition-colors duration-150 hover:text-accent"
        >
          Sinema Arşivi<span className="sr-only"> – {messages[locale].nav.home}</span>
        </Link>
        <div className="flex items-center">
          <div className="hidden lg:block">
            <SearchBox locale={locale} variant="bar" inputRef={barInputRef} />
          </div>
          <SearchPanel
            locale={locale}
            open={overlay === 'search'}
            onOpenChange={(open) => setOverlay(open ? 'search' : null)}
          />
          <div className="hidden items-center md:flex">
            <NavLinks locale={locale} pathname={pathname} variant="bar" />
            <Suspense fallback={<LanguageToggleFallback locale={locale} />}>
              <LanguageToggle locale={locale} />
            </Suspense>
          </div>
          <MobileMenu
            locale={locale}
            open={overlay === 'menu'}
            onOpenChange={(open) => setOverlay(open ? 'menu' : null)}
          />
        </div>
      </nav>
    </header>
  )
}
