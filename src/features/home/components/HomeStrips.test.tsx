import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildHomeView } from '../view-model'
import { HomeStrips } from './HomeStrips'

describe('HomeStrips', () => {
  it('renders all rotation slots in a reorderable grid with week notes', () => {
    const view = buildHomeView('tr', 0)
    const { container } = render(<HomeStrips strips={view.strips} locale="tr" />)
    const strips = container.querySelectorAll('[data-home-strip]')
    expect(strips).toHaveLength(18)
    expect(screen.getByRole('list')).toHaveClass('grid')
    strips.forEach((strip, i) => {
      expect(strip).toHaveAttribute('data-home-strip', `w${i}`)
      expect(strip.querySelector('[data-strip-slot]')).toHaveAttribute('data-strip-slot', `w${i}`)
    })
  })
})
