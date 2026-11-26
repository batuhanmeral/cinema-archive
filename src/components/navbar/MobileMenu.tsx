'use client'

import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { LanguageToggle, LanguageToggleFallback } from './LanguageToggle'
import { NavLinks } from './NavLinks'

const PANEL_ID = 'mobile-menu'

// open/onOpenChange verilirse durum Navbar'dadır (arama paneliyle aynı anda açılmaz).
export function MobileMenu({
  locale,
  open: controlledOpen,
  onOpenChange,
}: {
  locale: Locale
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const pathname = usePathname()
  const [ownOpen, setOwnOpen] = useState(false)
  const open = controlledOpen ?? ownOpen
  const setOpen = useCallback(
    (next: boolean) => {
      setOwnOpen(next)
      onOpenChange?.(next)
    },
    [onOpenChange],
  )
  const buttonRef = useRef<HTMLButtonElement>(null)

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, setOpen])

  const Icon = open ? X : Menu
  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        aria-label={messages[locale].nav.menu}
        onClick={() => setOpen(!open)}
        className="inline-flex size-11 items-center justify-center transition-colors duration-200 hover:bg-surface hover:text-accent"
      >
        <Icon aria-hidden="true" size={24} />
      </button>
      {open && (
        // Bağlantıya tıklama menüyü kapatır; dil bağlantısı da dahil.
        <div
          id={PANEL_ID}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a')) close()
          }}
          className="absolute inset-x-0 top-full border-b border-line bg-hall px-4 pt-4 pb-6"
        >
          <NavLinks locale={locale} pathname={pathname} variant="menu" />
          <div className="mt-5 -ml-3 text-[15px]">
            <Suspense fallback={<LanguageToggleFallback locale={locale} />}>
              <LanguageToggle locale={locale} />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  )
}
