import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NavLinks } from './NavLinks'

function current(pathname: string, locale: 'tr' | 'en' = 'tr') {
  render(<NavLinks locale={locale} pathname={pathname} variant="bar" />)
  return screen
    .queryAllByRole('link')
    .filter((link) => link.getAttribute('aria-current') === 'page')
}

describe('NavLinks', () => {
  it.each([
    ['/movements', 'tr', 'Akımlar'],
    ['/movement/french-new-wave', 'tr', 'Akımlar'],
    ['/en/movements', 'en', 'Movements'],
    ['/en/movement/french-new-wave', 'en', 'Movements'],
    ['/collections', 'tr', 'Koleksiyonlar'],
    ['/collection/yesilcam-classics', 'tr', 'Koleksiyonlar'],
    ['/en/collection/x', 'en', 'Collections'],
  ] as const)('marks the section for %s', (pathname, locale, name) => {
    const links = current(pathname, locale)
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveTextContent(name)
  })

  it('marks nothing on a film page', () => {
    expect(current('/film/x')).toHaveLength(0)
  })
})
