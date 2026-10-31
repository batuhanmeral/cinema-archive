import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageToggle } from './LanguageToggle'

const navigation = vi.hoisted(() => ({ pathname: '/film/stalker-1979', search: '' }))

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}))

describe('LanguageToggle', () => {
  beforeEach(() => {
    navigation.pathname = '/film/stalker-1979'
    navigation.search = ''
  })

  it('shows the current language and links to the English page', () => {
    render(<LanguageToggle locale="tr" />)
    const link = screen.getByRole('link', { name: /İngilizce sürüme geç/ })
    expect(link).toHaveTextContent('TR')
    expect(link).toHaveAttribute('href', '/en/film/stalker-1979')
    expect(link).toHaveAttribute('hreflang', 'en')
    // Görünen metin erişilebilir adın içinde olmalı (WCAG 2.5.3).
    expect(link).toHaveAccessibleName('TR İngilizce sürüme geç')
  })

  it('keeps the query when switching to Turkish', () => {
    navigation.pathname = '/en/archive'
    navigation.search = 'genre=878'
    render(<LanguageToggle locale="en" />)
    const link = screen.getByRole('link', { name: /Switch to Turkish/ })
    expect(link).toHaveTextContent('EN')
    expect(link).toHaveAttribute('href', '/arsiv?genre=878')
  })
})
