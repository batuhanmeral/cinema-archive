import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MovementsListPage } from './MovementsListPage'

const strips = [
  {
    name: 'Alman Dışavurumculuğu',
    href: '/movement/german-expressionism',
    meta: 'Almanya · 1913–1931',
    imagePath: null,
  },
  {
    name: 'Fransız Yeni Dalgası',
    href: '/movement/french-new-wave',
    meta: 'Fransa · 1958–1968',
    imagePath: '/a.jpg',
  },
]

describe('MovementsListPage', () => {
  it('shows the heading and lists the strips in the given order', () => {
    render(<MovementsListPage locale="tr" strips={strips} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Akımlar' })).toBeInTheDocument()
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByRole('link')).toHaveAttribute(
      'href',
      '/movement/german-expressionism',
    )
    expect(within(items[1]!).getByRole('link')).toHaveAttribute('href', '/movement/french-new-wave')
    expect(screen.getByText('Fransa · 1958–1968')).toBeInTheDocument()
  })

  it('uses the English heading', () => {
    render(<MovementsListPage locale="en" strips={strips} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Movements' })).toBeInTheDocument()
  })
})
