import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PersonCard } from '../view-model'
import { CastSection } from './CastSection'

const director: PersonCard = {
  name: 'Andrei Tarkovsky',
  role: 'Yönetmen',
  profilePath: '/tarkovsky.jpg',
  href: '/kisi/andrei-tarkovsky',
}

const cast: PersonCard[] = [
  { name: 'Alexander Kaidanovsky', role: 'Stalker', profilePath: '/kaidanovsky.jpg' },
  { name: 'Yevgeni Kostin', role: 'Kafenin sahibi', profilePath: null },
]

const card = (name: string) => screen.getByText(name).closest('li') as HTMLElement

describe('CastSection', () => {
  it('shows a person icon box when a photo is missing', () => {
    render(<CastSection directors={[director]} cast={cast} locale="tr" />)
    const withoutPhoto = card('Yevgeni Kostin')
    expect(withoutPhoto.querySelector('img')).toBeNull()
    expect(withoutPhoto.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(card('Alexander Kaidanovsky').querySelector('img')).not.toBeNull()
  })

  it('puts the director before the cast strip and links people with pages', () => {
    render(<CastSection directors={[director]} cast={cast} locale="tr" />)
    expect(
      screen.getByRole('heading', { level: 2, name: 'Yönetmen ve oyuncular' }),
    ).toBeInTheDocument()

    const strip = screen.getByRole('region', { name: 'Yönetmen ve oyuncular' })
    const directorCard = card('Andrei Tarkovsky')
    expect(strip).not.toContainElement(directorCard)
    expect(
      directorCard.compareDocumentPosition(strip) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(within(strip).getByText('Alexander Kaidanovsky')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Andrei Tarkovsky' })).toHaveAttribute(
      'href',
      '/kisi/andrei-tarkovsky',
    )
    expect(screen.queryByRole('link', { name: 'Alexander Kaidanovsky' })).toBeNull()
    expect(within(directorCard).getByText('Yönetmen')).toBeInTheDocument()
  })

  it('labels the strip arrows', () => {
    render(<CastSection directors={[]} cast={cast} locale="en" />)
    expect(screen.getByRole('button', { name: 'Previous', hidden: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next', hidden: true })).toBeInTheDocument()
  })

  it('renders no role line when the character is empty', () => {
    render(
      <CastSection
        directors={[]}
        cast={[{ name: 'Nameless Extra', role: '', profilePath: null }]}
        locale="tr"
      />,
    )
    const extra = card('Nameless Extra')
    expect(extra.textContent).toBe('Nameless Extra')
    expect(extra.querySelectorAll('p')).toHaveLength(1)
  })

  it('shows at most 20 cast members', () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      name: `Actor ${i}`,
      role: `Role ${i}`,
      profilePath: null,
    }))
    render(<CastSection directors={[]} cast={many} locale="tr" />)
    expect(within(screen.getByRole('region')).getAllByRole('listitem')).toHaveLength(20)
    expect(screen.queryByText('Actor 20')).toBeNull()
  })

  it('renders nothing without directors and cast', () => {
    const { container } = render(<CastSection directors={[]} cast={[]} locale="tr" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the directors alone without an empty strip', () => {
    render(<CastSection directors={[director]} cast={[]} locale="tr" />)
    expect(screen.queryByRole('region')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(card('Andrei Tarkovsky')).toBeInTheDocument()
  })
})
