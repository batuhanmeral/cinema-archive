import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MovementFilms } from './MovementFilms'

const films = [
  {
    href: '/film/the-400-blows-1959',
    posterPath: '/blows.jpg',
    title: '400 Darbe',
    caption: 'François Truffaut, 1959',
    overview: null,
  },
  {
    href: '/film/breathless-1960',
    posterPath: null,
    title: 'Serseri Aşıklar',
    caption: 'Jean-Luc Godard, 1960',
    overview: 'Bir polisi öldüren küçük bir hırsız Paris’te saklanır.',
  },
]

describe('MovementFilms', () => {
  it('links each card to the film page by its title', () => {
    render(<MovementFilms films={films} locale="tr" />)
    expect(screen.getByRole('heading', { level: 2, name: 'Filmler' })).toBeInTheDocument()
    const link = screen.getByRole('link', { name: '400 Darbe' })
    expect(link).toHaveAttribute('href', '/film/the-400-blows-1959')
    expect(link.closest('li')).toHaveTextContent('François Truffaut, 1959')
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('renders no overview paragraph when the overview is missing', () => {
    render(<MovementFilms films={films} locale="tr" />)
    const card = screen.getByRole('link', { name: '400 Darbe' }).closest('li') as HTMLElement
    expect(card.querySelector('[data-testid="film-overview"]')).toBeNull()
    expect(card.textContent).not.toMatch(/null|undefined/)
  })
})
