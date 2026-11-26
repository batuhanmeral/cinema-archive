import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMatcher } from '@/features/search/matcher'
import type { SearchData } from '@/features/search/load'
import { EMPTY_QUERY, FILTER_KEYS, type FilterKey } from '@/lib/archive-query'
import type { ArchiveFilm } from '../schemas'
import { filmValues, selectFilms } from '../select'
import { ArchiveView } from './ArchiveView'

const nav = vi.hoisted(() => ({ listeners: new Set<() => void>() }))

// Next, replaceState'i useSearchParams'a yansıtır; sahte kanca aynısını location üzerinden yapar.
vi.mock('next/navigation', async () => {
  const { useMemo, useSyncExternalStore } = await import('react')
  return {
    useSearchParams: () => {
      const search = useSyncExternalStore(
        (listener) => {
          nav.listeners.add(listener)
          return () => nav.listeners.delete(listener)
        },
        () => window.location.search,
      )
      return useMemo(() => new URLSearchParams(search), [search])
    },
  }
})

const loader = vi.hoisted(() => ({ load: vi.fn<(locale: string) => Promise<unknown>>() }))
vi.mock('@/features/search/load', () => ({ loadSearchData: loader.load }))

// 100 film: üçte biri Dram (18), yarısı Komedi (35); ikisi Godard filmi, hiçbiri hem Dram hem Fransa değil.
const films: ArchiveFilm[] = Array.from({ length: 100 }, (_, i) => ({
  slug: `film-${i}`,
  title: i < 2 ? `Godard Film ${i}` : `Film ${String(i).padStart(3, '0')}`,
  otherTitle: `Other ${i}`,
  originalTitle: `Original ${i}`,
  year: 1900 + i,
  directors: [i < 2 ? 'Jean-Luc Godard' : 'Someone Else'],
  poster: null,
  genres: [...(i % 3 === 0 ? [18] : []), ...(i % 2 === 0 ? [35] : [])],
  themes: [],
  countries: i === 1 ? ['FR'] : ['US'],
  languages: ['en'],
  votes: i,
}))
const NAMES: Record<string, string> = { '18': 'Dram', '35': 'Komedi', FR: 'Fransa', US: 'ABD' }
const labels = Object.fromEntries(
  FILTER_KEYS.map((key) => [
    key,
    Object.fromEntries(
      films.flatMap((f) => filmValues(f, key)).map((v) => [v, NAMES[v] ?? `${key}-${v}`]),
    ),
  ]),
) as Record<FilterKey, Record<string, string>>
const index = { films, groups: [] }
const data: SearchData = { index, matcher: createMatcher(index) }
const initialFilms = selectFilms(films, EMPTY_QUERY, { locale: 'tr', scores: null }).slice(0, 48)
const dramSlugs = new Set(films.filter((f) => f.genres.includes(18)).map((f) => f.title))

function setUrl(url: string) {
  History.prototype.replaceState.call(window.history, null, '', url)
}

function renderView() {
  return render(
    <ArchiveView locale="tr" labels={labels} initialFilms={initialFilms} total={3128} />,
  )
}

const filmLinks = () => screen.queryAllByRole('link')
const loaded = () =>
  waitFor(() => expect(screen.getByRole('button', { name: /Tür/ })).toBeEnabled())

let replace: ReturnType<typeof vi.spyOn>

describe('ArchiveView', () => {
  beforeEach(() => {
    setUrl('/archive')
    loader.load.mockReset()
    loader.load.mockResolvedValue(data)
    replace = vi.spyOn(window.history, 'replaceState').mockImplementation((...args) => {
      History.prototype.replaceState.apply(window.history, args)
      nav.listeners.forEach((listener) => listener())
    })
  })
  afterEach(() => replace.mockRestore())

  it('renders the server films at once without a query', () => {
    loader.load.mockReturnValue(new Promise(() => {}))
    renderView()
    expect(filmLinks()).toHaveLength(48)
    expect(filmLinks()[0]).toHaveTextContent(initialFilms[0]!.title)
    expect(screen.getByText('3.128 film')).toBeInTheDocument()
  })

  it('shows placeholders while the index loads for a query, then the filtered films', async () => {
    setUrl('/archive?genre=18')
    let resolve: (value: SearchData) => void = () => {}
    loader.load.mockReturnValue(new Promise((r) => (resolve = r)))
    const { container } = renderView()
    const busy = container.querySelector('[aria-busy="true"]')
    expect(busy?.querySelectorAll('li')).toHaveLength(12)
    expect(filmLinks()).toHaveLength(0)

    resolve(data)
    await loaded()
    expect(filmLinks()).toHaveLength(dramSlugs.size)
    for (const link of filmLinks()) expect(dramSlugs.has(link.textContent ?? '')).toBe(true)
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Kaldır: Dram' })).toHaveTextContent('Dram')
  })

  it('writes the canonical URL on a checkbox click and resets to 48', async () => {
    const user = userEvent.setup()
    renderView()
    await loaded()
    await user.click(screen.getByRole('button', { name: 'Daha fazla göster' }))
    expect(filmLinks()).toHaveLength(96)

    await user.click(screen.getByRole('button', { name: /Tür/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Komedi 50' }))
    expect(replace).toHaveBeenLastCalledWith(null, '', '/archive?genre=35')
    expect(filmLinks()).toHaveLength(48)
    expect(screen.getByText('50 film')).toBeInTheDocument()
  })

  it('appends 48 films per click and hides the button when all are shown', async () => {
    const user = userEvent.setup()
    renderView()
    await loaded()
    expect(filmLinks()).toHaveLength(48)
    await user.click(screen.getByRole('button', { name: 'Daha fazla göster' }))
    expect(filmLinks()).toHaveLength(96)
    await user.click(screen.getByRole('button', { name: 'Daha fazla göster' }))
    expect(filmLinks()).toHaveLength(100)
    expect(screen.queryByRole('button', { name: 'Daha fazla göster' })).toBeNull()
  })

  it('shows the query as a removable chip and sorts by best match', async () => {
    const user = userEvent.setup()
    setUrl('/archive?q=godard')
    renderView()
    await loaded()
    const sort = screen.getByRole('combobox', { name: /Sırala/ })
    expect(sort).toHaveValue('relevance')
    expect(within(sort).getByRole('option', { selected: true })).toHaveTextContent('En uygun')
    expect(filmLinks().map((link) => link.textContent)).toEqual(['Godard Film 1', 'Godard Film 0'])
    await user.click(screen.getByRole('button', { name: 'Kaldır: “godard”' }))
    expect(replace).toHaveBeenLastCalledWith(null, '', '/archive')
  })

  it('offers best match only with a query', async () => {
    renderView()
    await loaded()
    const sort = screen.getByRole('combobox', { name: /Sırala/ })
    expect(sort).toHaveValue('year')
    expect(within(sort).queryByRole('option', { name: 'En uygun' })).toBeNull()
  })

  it('clears filters and the query', async () => {
    const user = userEvent.setup()
    setUrl('/archive?genre=18&q=godard&sort=title')
    renderView()
    await loaded()
    await user.click(screen.getByRole('button', { name: 'Temizle' }))
    expect(replace).toHaveBeenLastCalledWith(null, '', '/archive?sort=title')
    expect(screen.queryByRole('button', { name: /Kaldır/ })).toBeNull()
  })

  it('shows the empty line and a clear button for an empty selection', async () => {
    const user = userEvent.setup()
    setUrl('/archive?genre=18&country=FR')
    renderView()
    await loaded()
    expect(screen.getByText('Bu seçimle eşleşen film yok.')).toBeInTheDocument()
    expect(filmLinks()).toHaveLength(0)
    const clear = screen.getAllByRole('button', { name: 'Temizle' })
    expect(clear.length).toBeGreaterThan(0)
    await user.click(clear.at(-1)!)
    expect(replace).toHaveBeenLastCalledWith(null, '', '/archive')
  })

  it('keeps the server films with disabled controls when the index fails to load', async () => {
    setUrl('/archive?genre=18')
    loader.load.mockRejectedValue(new Error('offline'))
    const { container } = renderView()
    await waitFor(() => expect(filmLinks()).toHaveLength(48))
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
    for (const name of ['Tür', 'Tema', 'Ülke', 'Yıl', 'Dil'])
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: /Sırala/ })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Daha fazla göster' })).toBeNull()
  })
})
