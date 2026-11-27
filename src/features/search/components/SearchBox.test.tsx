import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { useRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ArchiveFilm, ArchiveGroup } from '@/features/archive/schemas'
import { createMatcher } from '@/features/search/matcher'
import { SearchBox } from './SearchBox'
import { useSlashFocus } from './use-slash-focus'

vi.mock('next/link', () => ({
  default: ({ prefetch, children, ...props }: ComponentProps<'a'> & { prefetch?: boolean }) => (
    <a {...props} data-prefetch={String(prefetch)}>
      {children}
    </a>
  ),
}))
vi.mock('next/image', () => ({
  default: ({ fill, alt, ...props }: ComponentProps<'img'> & { fill?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} data-fill={String(fill)} {...props} />
  ),
}))

const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))

const loader = vi.hoisted(() => ({ load: vi.fn<(locale: string) => Promise<unknown>>() }))
vi.mock('@/features/search/load', () => ({ loadSearchData: loader.load }))

const film = (slug: string, title: string, director: string, year: number): ArchiveFilm => ({
  slug,
  title,
  otherTitle: title,
  originalTitle: title,
  year,
  directors: [director],
  poster: null,
  genres: [],
  themes: [],
  countries: [],
  languages: [],
  votes: 0,
})
const films = [
  film('breathless-1960', 'Serseri Aşıklar', 'Jean-Luc Godard', 1960),
  film('contempt-1963', 'Nefret', 'Jean-Luc Godard', 1963),
  film('stalker-1979', 'İz Sürücü', 'Andrei Tarkovsky', 1979),
]
const groups: ArchiveGroup[] = [
  {
    kind: 'movement',
    slug: 'french-new-wave',
    name: 'Fransız Yeni Dalgası',
    otherName: 'French New Wave',
    filmCount: 22,
    image: null,
  },
]
const index = { films, groups }
const data = { index, matcher: createMatcher(index) }

beforeEach(() => {
  router.push.mockReset()
  loader.load.mockReset()
  loader.load.mockResolvedValue(data)
})

const input = () => screen.getByRole('combobox', { name: 'Sitede ara' })

async function typeInto(text: string) {
  const user = userEvent.setup()
  await user.click(input())
  await user.type(input(), text)
  await screen.findByRole('listbox')
  return user
}

describe('SearchBox', () => {
  it('loads the index once on first focus, not on render', async () => {
    const user = userEvent.setup()
    render(<SearchBox locale="tr" variant="bar" />)
    expect(loader.load).not.toHaveBeenCalled()
    await user.click(input())
    await user.tab()
    await user.click(input())
    expect(loader.load).toHaveBeenCalledTimes(1)
    expect(loader.load).toHaveBeenCalledWith('tr')
  })

  it('opens a listbox from two characters with combobox attributes', async () => {
    render(<SearchBox locale="tr" variant="bar" />)
    const user = userEvent.setup()
    await user.click(input())
    await user.type(input(), 'g')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    await user.type(input(), 'o')
    const listbox = await screen.findByRole('listbox')
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    expect(input()).toHaveAttribute('aria-controls', listbox.id)
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Serseri AşıklarFilm · 1960',
      'NefretFilm · 1963',
      'Tüm sonuçlar (2 film)',
    ])
  })

  it('moves the highlight with the arrows and opens the row on Enter', async () => {
    render(<SearchBox locale="tr" variant="bar" />)
    const user = await typeInto('godard')
    await user.keyboard('{ArrowDown}')
    const first = screen.getAllByRole('option')[0]!
    expect(input()).toHaveAttribute('aria-activedescendant', first.id)
    expect(first).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowUp}')
    expect(input()).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Tüm sonuçlar (2 film)' }).id,
    )
    await user.keyboard('{ArrowDown}{Enter}')
    expect(router.push).toHaveBeenCalledWith('/film/breathless-1960')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('opens the archive with the query on Enter without a highlight', async () => {
    render(<SearchBox locale="en" variant="bar" />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: 'Search the site' }))
    await user.type(screen.getByRole('combobox'), 'godard')
    await screen.findByRole('listbox')
    await user.keyboard('{Enter}')
    expect(router.push).toHaveBeenCalledWith('/en/archive?q=godard')
  })

  it('lists movements first and finds Turkish titles without diacritics', async () => {
    render(<SearchBox locale="tr" variant="bar" />)
    const user = await typeInto('yeni dalga')
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Fransız Yeni DalgasıAkım · 22 film')
    await user.clear(input())
    await user.type(input(), 'iz surucu')
    expect(await screen.findByRole('option', { name: /İz Sürücü/ })).toHaveAttribute(
      'href',
      '/film/stalker-1979',
    )
  })

  it('shows "Sonuç yok" without an archive row when nothing matches', async () => {
    render(<SearchBox locale="tr" variant="bar" />)
    const user = userEvent.setup()
    await user.click(input())
    await user.type(input(), 'qqqqqq')
    expect(await screen.findByText('Sonuç yok')).toBeInTheDocument()
    expect(screen.queryByRole('option')).toBeNull()
    await user.keyboard('{Enter}')
    expect(router.push).not.toHaveBeenCalled()
  })

  it('closes on Esc, then clears the text on a second Esc', async () => {
    render(<SearchBox locale="tr" variant="bar" />)
    const user = await typeInto('godard')
    await user.keyboard('{ArrowDown}{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(input()).not.toHaveAttribute('aria-activedescendant')
    expect(input()).toHaveValue('godard')
    await user.keyboard('{Escape}')
    expect(input()).toHaveValue('')
  })

  it('announces the number of result rows politely', async () => {
    render(<SearchBox locale="tr" variant="bar" />)
    await typeInto('godard')
    expect(screen.getByText('2 sonuç')).toHaveAttribute('aria-live', 'polite')
  })

  it('stays closed when the index fails and retries on the next focus', async () => {
    loader.load.mockRejectedValueOnce(new Error('offline'))
    render(
      <>
        <SearchBox locale="tr" variant="bar" />
        <button type="button">elsewhere</button>
      </>,
    )
    const user = userEvent.setup()
    await user.click(input())
    await user.type(input(), 'godard')
    await act(() => Promise.resolve())
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))
    await user.click(input())
    expect(loader.load).toHaveBeenCalledTimes(2)
    await screen.findByRole('listbox')
  })

  it('closes when focus leaves the box', async () => {
    render(
      <>
        <SearchBox locale="tr" variant="bar" />
        <button type="button">elsewhere</button>
      </>,
    )
    const user = await typeInto('godard')
    await user.click(screen.getByRole('button', { name: 'elsewhere' }))
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('calls onNavigate after choosing a row', async () => {
    const onNavigate = vi.fn()
    render(<SearchBox locale="tr" variant="panel" onNavigate={onNavigate} />)
    const user = await typeInto('godard')
    await user.click(screen.getByRole('option', { name: /Nefret/ }))
    expect(router.push).toHaveBeenCalledWith('/film/contempt-1963')
    expect(onNavigate).toHaveBeenCalled()
  })

  it('in the panel, a second Esc asks to close the panel', async () => {
    const onEscape = vi.fn()
    render(<SearchBox locale="tr" variant="panel" onEscape={onEscape} />)
    const user = await typeInto('godard')
    await user.keyboard('{Escape}')
    expect(onEscape).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')
    expect(onEscape).toHaveBeenCalledTimes(1)
  })
})

function SlashHarness({ onActivate }: { onActivate?: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  useSlashFocus(ref, onActivate)
  return (
    <>
      <input ref={ref} aria-label="target" />
      <input aria-label="other" />
      <textarea aria-label="notes" />
      <select aria-label="pick">
        <option>a</option>
      </select>
    </>
  )
}

describe('useSlashFocus', () => {
  it('focuses the input on "/" from the page and swallows the character', () => {
    render(<SlashHarness />)
    const event = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true })
    document.body.dispatchEvent(event)
    expect(screen.getByRole('textbox', { name: 'target' })).toHaveFocus()
    expect(event.defaultPrevented).toBe(true)
  })

  it.each(['other', 'notes', 'pick'])('ignores "/" while typing in %s', (name) => {
    render(<SlashHarness />)
    const field = screen.getByLabelText(name)
    field.focus()
    fireEvent.keyDown(field, { key: '/' })
    expect(field).toHaveFocus()
  })

  it('ignores "/" with a modifier key', () => {
    render(<SlashHarness />)
    fireEvent.keyDown(document.body, { key: '/', ctrlKey: true })
    expect(screen.getByRole('textbox', { name: 'target' })).not.toHaveFocus()
  })

  it('calls onActivate instead of focusing when given', async () => {
    const onActivate = vi.fn()
    render(<SlashHarness onActivate={onActivate} />)
    fireEvent.keyDown(document.body, { key: '/' })
    await waitFor(() => expect(onActivate).toHaveBeenCalledTimes(1))
  })
})
