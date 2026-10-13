import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FilmView } from '../view-model'
import { FilmHero } from './FilmHero'

const view: FilmView = {
  title: 'İz Sürücü',
  originalTitle: 'Сталкер',
  year: 1979,
  overview: 'Bir rehber iki adamı Bölge’nin içine götürür.',
  posterPath: '/stalker-tr.jpg',
  tags: [
    { text: 'Bilim-Kurgu', href: '/arsiv?genre=878' },
    { text: 'Distopya', href: '/arsiv?theme=4565' },
  ],
  index: [
    { key: 'genre', label: 'Tür', items: [{ text: 'Bilim-Kurgu', href: '/arsiv?genre=878' }] },
    { key: 'runtime', label: 'Süre', items: [{ text: '163 dk' }] },
    {
      key: 'writer',
      label: 'Senaryo',
      items: [
        { text: 'Arkady Strugatsky' },
        { text: 'Andrei Tarkovsky', href: '/kisi/andrei-tarkovsky' },
      ],
    },
  ],
  directors: [],
  cast: [],
  stills: [],
  trailerKey: null,
}

describe('FilmHero', () => {
  it('renders the title as the page heading and tags as links', () => {
    render(<FilmHero view={view} locale="tr" />)
    expect(screen.getByRole('heading', { level: 1, name: 'İz Sürücü' })).toBeInTheDocument()
    expect(screen.getByText('Сталкер')).toBeInTheDocument()
    const tags = screen.getByTestId('film-tags')
    expect(tags).toHaveTextContent('Bilim-KurguDistopya')
    expect(within(tags).getByRole('link', { name: 'Distopya' })).toHaveAttribute(
      'href',
      '/arsiv?theme=4565',
    )
  })

  it('renders the index as label and value pairs, linking only items with a page', () => {
    render(<FilmHero view={view} locale="tr" />)
    expect(screen.getByText('Süre').tagName).toBe('DT')
    expect(screen.getByText('163 dk').closest('a')).toBeNull()
    const writers = screen.getByText('Senaryo').nextElementSibling as HTMLElement
    expect(writers).toHaveTextContent('Arkady Strugatsky, Andrei Tarkovsky')
    expect(within(writers).getAllByRole('link')).toHaveLength(1)
    expect(within(writers).getByRole('link', { name: 'Andrei Tarkovsky' })).toHaveAttribute(
      'href',
      '/kisi/andrei-tarkovsky',
    )
  })

  it('renders no overview paragraph and no "null" text when the overview is missing', () => {
    const { container } = render(<FilmHero view={{ ...view, overview: null }} locale="tr" />)
    expect(container.textContent).not.toMatch(/null|undefined/)
    expect(container.querySelector('[data-testid="film-overview"]')).toBeNull()
  })

  it('still renders without a poster, original title or tags', () => {
    const { container } = render(
      <FilmHero view={{ ...view, posterPath: null, originalTitle: null, tags: [] }} locale="en" />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(screen.queryByTestId('film-tags')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/null|undefined/)
  })
})
