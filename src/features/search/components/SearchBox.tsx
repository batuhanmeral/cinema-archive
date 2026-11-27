import { ArrowRight, Film, Search } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type RefObject,
} from 'react'
import { MIN_QUERY_LENGTH } from '@/lib/archive-query'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { normalizeText } from '@/lib/normalize-text'
import { loadSearchData, type SearchData } from '../load'
import { buildDropdownRows, type DropdownRow } from '../rows'

type Option = { href: string; row: DropdownRow | null; label: string }

const STYLE = {
  bar: {
    root: 'relative mr-2',
    box: 'h-8 w-55 px-2.5',
    list: 'absolute top-[calc(100%+6px)] left-0 z-10 w-75',
  },
  panel: { root: 'relative', box: 'h-11 w-full px-3', list: 'mt-1.5 w-full' },
}

// Sol tık bağlantıyı istemci yönlendirmesiyle açar; yeni sekme tıklamaları tarayıcıya kalır.
const isPlainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

export function SearchBox({
  locale,
  variant,
  inputRef,
  autoFocus = false,
  onNavigate,
  onEscape,
}: {
  locale: Locale
  variant: 'bar' | 'panel'
  inputRef?: RefObject<HTMLInputElement | null>
  autoFocus?: boolean
  onNavigate?: () => void
  onEscape?: () => void
}) {
  const router = useRouter()
  const { nav, search: t } = messages[locale]
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const loading = useRef(false)
  const [data, setData] = useState<SearchData | null>(null)
  const [text, setText] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [active, setActive] = useState(-1)

  // Dizin ve Fuse ilk odakta yüklenir; hata önbelleğe girmez, sonraki odak yeniden dener.
  const ensureData = () => {
    if (data || loading.current) return
    loading.current = true
    loadSearchData(locale)
      .then(setData)
      .catch(() => {})
      .finally(() => {
        loading.current = false
      })
  }

  const result = useMemo(
    () => (data ? buildDropdownRows(data.matcher, text, locale) : null),
    [data, text, locale],
  )
  const ready = result !== null && normalizeText(text).length >= MIN_QUERY_LENGTH
  const open = expanded && ready
  const options: Option[] = useMemo(() => {
    if (!result) return []
    const rows = result.rows.map((row) => ({ href: row.href, row, label: row.title }))
    return result.archiveHref
      ? [...rows, { href: result.archiveHref, row: null, label: t.allResults(result.filmTotal) }]
      : rows
  }, [result, t])
  const listOpen = open && options.length > 0
  const optionId = (i: number) => `${listId}-${i}`

  const close = () => {
    setExpanded(false)
    setActive(-1)
  }
  const go = (href: string) => {
    close()
    setText('')
    router.push(href)
    onNavigate?.()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const n = options.length
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!ready || n === 0) return
      event.preventDefault()
      setExpanded(true)
      if (event.key === 'ArrowDown') setActive((i) => (i + 1) % n)
      else setActive((i) => (i <= 0 ? n - 1 : i - 1))
    } else if (event.key === 'Enter') {
      if (!ready) return
      event.preventDefault()
      const href = active >= 0 ? options[active]?.href : result.archiveHref
      if (href) go(href)
    } else if (event.key === 'Escape') {
      // Önce liste kapanır; ikinci Esc metni siler (panelde paneli kapatır).
      event.preventDefault()
      if (open) close()
      else if (variant === 'panel' && onEscape) onEscape()
      else setText('')
    }
  }

  const style = STYLE[variant]
  return (
    <div
      ref={rootRef}
      className={style.root}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) close()
      }}
    >
      <label
        className={`flex items-center gap-2 bg-text/8 text-muted transition-colors duration-200 focus-within:bg-text/12 focus-within:outline-1 focus-within:outline-accent hover:bg-text/12 ${style.box}`}
      >
        <Search size={15} strokeWidth={1.75} aria-hidden className="shrink-0" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label={nav.searchLabel}
          aria-autocomplete="list"
          aria-expanded={listOpen}
          aria-controls={listOpen ? listId : undefined}
          aria-activedescendant={listOpen && active >= 0 ? optionId(active) : undefined}
          placeholder={nav.searchPlaceholder}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          // Panel mercek düğmesiyle açılır; odak doğrudan kutuya geçer.
          autoFocus={autoFocus}
          value={text}
          onFocus={() => {
            ensureData()
            setExpanded(true)
          }}
          onChange={(event) => {
            setText(event.target.value)
            setExpanded(true)
            setActive(-1)
          }}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-text placeholder:text-muted focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
      </label>
      {open && (
        <div className={`border border-line bg-dropdown p-1.5 ${style.list}`}>
          {listOpen ? (
            <ul id={listId} role="listbox" aria-label={nav.searchLabel}>
              {options.map((option, i) => (
                <li key={option.href} role="presentation">
                  <Link
                    id={optionId(i)}
                    href={option.href}
                    prefetch={false}
                    role="option"
                    aria-selected={i === active}
                    tabIndex={-1}
                    // Tıklama sırasında odak kutuda kalır; liste blur ile kapanmaz.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={(event) => {
                      if (!isPlainClick(event)) return
                      event.preventDefault()
                      go(option.href)
                    }}
                    className={
                      option.row
                        ? 'group grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3 px-2 py-1.5 hover:bg-text/8 aria-selected:bg-text/8'
                        : 'mt-1 flex items-center gap-1.5 border-t border-line px-2 pt-2.5 pb-1.5 text-xs transition-colors duration-150 hover:text-accent aria-selected:text-accent'
                    }
                  >
                    {option.row ? <RowContent row={option.row} /> : option.label}
                    {!option.row && <ArrowRight size={14} strokeWidth={1.5} aria-hidden />}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2 py-1.5 text-[13px] text-muted">{t.noResults}</p>
          )}
        </div>
      )}
      <p aria-live="polite" className="sr-only">
        {open ? t.resultCount(result.rows.length) : ''}
      </p>
    </div>
  )
}

function RowContent({ row }: { row: DropdownRow }) {
  return (
    <>
      {row.image ? (
        <span className="relative h-10 w-7 overflow-hidden">
          <Image src={row.image} alt="" fill sizes="40px" className="object-cover" />
        </span>
      ) : (
        <span className="grid h-10 w-7 place-items-center border border-line text-muted">
          <Film size={14} strokeWidth={1.5} aria-hidden />
        </span>
      )}
      <span className="min-w-0">
        <b className="block truncate text-[13px] font-semibold transition-colors duration-150 group-hover:text-accent group-aria-selected:text-accent">
          {row.title}
        </b>
        <span className="mt-0.5 block truncate text-xs text-muted">{row.typeLine}</span>
      </span>
    </>
  )
}
