import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { FilmView } from '../view-model'
import { TrailerAndStills } from './TrailerAndStills'

const view: FilmView = {
  title: 'İz Sürücü',
  originalTitle: 'Сталкер',
  year: 1979,
  overview: null,
  posterPath: '/stalker-poster.jpg',
  tags: [],
  index: [],
  directors: [],
  cast: [],
  stills: ['/still-a.jpg', '/still-b.jpg', '/still-c.jpg'],
  trailerKey: 'abc123',
}

const imageSources = (container: HTMLElement) =>
  [...container.querySelectorAll('img')].map((img) => img.getAttribute('src') ?? '')

describe('TrailerAndStills', () => {
  it('loads the nocookie YouTube embed only after the button is pressed', async () => {
    render(<TrailerAndStills view={view} locale="tr" />)
    expect(
      screen.getByRole('heading', { level: 2, name: 'Fragman ve kareler' }),
    ).toBeInTheDocument()
    expect(document.querySelector('iframe')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Fragmanı oynat' }))

    const iframe = document.querySelector('iframe')
    expect(iframe?.getAttribute('src')).toBe(
      'https://www.youtube-nocookie.com/embed/abc123?autoplay=1',
    )
    expect(iframe).toHaveAttribute('title', 'İz Sürücü – Fragmanı oynat')
    expect(iframe).toHaveAttribute('allow', 'autoplay; encrypted-media; picture-in-picture')
    expect(screen.queryByRole('button', { name: 'Fragmanı oynat' })).toBeNull()
  })

  it('renders no play button without a trailer', () => {
    const { container } = render(
      <TrailerAndStills view={{ ...view, trailerKey: null }} locale="en" />,
    )
    expect(
      screen.getByRole('heading', { level: 2, name: 'Trailer and stills' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
    expect(container.querySelectorAll('img')).toHaveLength(3)
    expect(container.textContent).not.toMatch(/null|undefined/)
  })

  it('renders no play button when the trailer key is not a plain YouTube id', () => {
    for (const trailerKey of ['abc"onload="x', '../../evil', 'a?b=1', '', 'x'.repeat(65)]) {
      const { container, unmount } = render(
        <TrailerAndStills view={{ ...view, trailerKey }} locale="tr" />,
      )
      expect(within(container).queryByRole('button')).toBeNull()
      unmount()
    }
  })

  it('renders nothing without stills and without a trailer', () => {
    const { container } = render(
      <TrailerAndStills view={{ ...view, stills: [], trailerKey: null }} locale="tr" />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('uses the poster as the play surface when there are no stills', () => {
    const { container } = render(<TrailerAndStills view={{ ...view, stills: [] }} locale="tr" />)
    expect(screen.getByRole('button', { name: 'Fragmanı oynat' })).toBeInTheDocument()
    const sources = imageSources(container)
    expect(sources).toHaveLength(1)
    expect(sources[0]).toContain(encodeURIComponent('/stalker-poster.jpg'))
  })

  it('still offers the trailer without stills or a poster', () => {
    const { container } = render(
      <TrailerAndStills view={{ ...view, stills: [], posterPath: null }} locale="tr" />,
    )
    expect(screen.getByRole('button', { name: 'Fragmanı oynat' })).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
})
