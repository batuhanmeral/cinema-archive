import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MovementStrip } from './MovementStrip'

describe('MovementStrip', () => {
  it('links the whole strip by the movement name and shows the meta', () => {
    render(
      <MovementStrip
        name="Alman Dışavurumculuğu"
        href="/movement/german-expressionism"
        meta="Almanya · 1913–1931"
        imagePath="/caligari.jpg"
        height="exit"
      />,
    )
    expect(screen.getByRole('link', { name: 'Alman Dışavurumculuğu' })).toHaveAttribute(
      'href',
      '/movement/german-expressionism',
    )
    expect(screen.getByText('Almanya · 1913–1931')).toBeInTheDocument()
  })

  it('renders only the hall background without an image', () => {
    const { container } = render(
      <MovementStrip
        name="Romanya Yeni Dalgası"
        href="/movement/romanian-new-wave"
        meta="Romanya · 2001–"
        imagePath={null}
        height="strip"
      />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('link', { name: 'Romanya Yeni Dalgası' })).toBeInTheDocument()
  })
})
