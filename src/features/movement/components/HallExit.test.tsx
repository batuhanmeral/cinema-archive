import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HallExit } from './HallExit'

const previous = {
  rotationSlot: 5,
  name: 'Fransız Yeni Dalgası',
  href: '/movement/a',
  meta: '',
  imagePath: null,
}
const next = {
  rotationSlot: 0,
  name: 'Alman Dışavurumculuğu',
  href: '/movement/b',
  meta: '1913–1931',
  imagePath: null,
}

describe('HallExit', () => {
  it('names both links with their direction', () => {
    render(<HallExit previous={previous} next={next} locale="tr" />)
    expect(
      screen.getByRole('link', { name: 'Önceki salon: Fransız Yeni Dalgası' }),
    ).toHaveAttribute('href', '/movement/a')
    expect(
      screen.getByRole('link', { name: 'Sonraki salon: Alman Dışavurumculuğu' }),
    ).toHaveAttribute('href', '/movement/b')
  })
})
