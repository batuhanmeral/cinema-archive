import { Search, X } from 'lucide-react'
import { useCallback, useRef } from 'react'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { SearchBox } from './SearchBox'
import { useSlashFocus } from './use-slash-focus'

const PANEL_ID = 'search-panel'

// 1024 px altında mercek düğmesi; navbar'ın altında tam genişlik arama paneli açar.
export function SearchPanel({
  locale,
  open,
  onOpenChange,
}: {
  locale: Locale
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { nav } = messages[locale]
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const activate = useCallback(() => {
    if (open) inputRef.current?.focus()
    else onOpenChange(true)
  }, [open, onOpenChange])
  useSlashFocus(buttonRef, activate)

  const closeAndFocus = () => {
    onOpenChange(false)
    buttonRef.current?.focus()
  }

  const Icon = open ? X : Search
  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        aria-label={open ? nav.closeSearch : nav.openSearch}
        onClick={() => onOpenChange(!open)}
        className="inline-flex size-11 items-center justify-center transition-colors duration-200 hover:bg-surface hover:text-accent md:size-8"
      >
        <Icon aria-hidden size={20} strokeWidth={1.75} />
      </button>
      {open && (
        <div
          id={PANEL_ID}
          className="wrap absolute inset-x-0 top-full border-b border-line bg-hall py-3"
        >
          <SearchBox
            locale={locale}
            variant="panel"
            inputRef={inputRef}
            autoFocus
            onNavigate={() => onOpenChange(false)}
            onEscape={closeAndFocus}
          />
        </div>
      )}
    </div>
  )
}
