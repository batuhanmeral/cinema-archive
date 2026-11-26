import type { ComponentProps } from 'react'
import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Navbar } from './Navbar'

vi.mock('next/link', () => ({
  default: ({ prefetch, children, ...props }: ComponentProps<'a'> & { prefetch?: boolean }) => (
    <a {...props} data-prefetch={prefetch === false ? 'off' : undefined}>
      {children}
    </a>
  ),
}))

const navigation = vi.hoisted(() => ({ pathname: '/film/x' }))

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(),
}))

async function renderNavbar(locale: 'tr' | 'en') {
  render(<Navbar locale={locale} />)
  // İlk ölçüm requestAnimationFrame ile yapılır.
  await act(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))))
  return screen.getByRole('banner')
}

describe('Navbar', () => {
  beforeEach(() => {
    navigation.pathname = '/film/x'
  })

  it.each(['/movements', '/collections/', '/en/movements/', '/en/collections'])(
    'is solid from the top on %s',
    async (pathname) => {
      navigation.pathname = pathname
      const header = await renderNavbar(pathname.startsWith('/en') ? 'en' : 'tr')
      expect(header).toHaveClass('bg-hall')
    },
  )

  it('is transparent over the hero on a film page', async () => {
    const header = await renderNavbar('tr')
    expect(header).not.toHaveClass('bg-hall')
  })
})

it('prefetches the home link', async () => {
  await renderNavbar('tr')
  expect(screen.getByRole('link', { name: /Sinema Arşivi.*Ana sayfa/ })).not.toHaveAttribute(
    'data-prefetch',
    'off',
  )
})

it('marks itself hidden while scrolled away so sticky bars can move up', async () => {
  const header = await renderNavbar('tr')
  expect(header).not.toHaveAttribute('data-hidden')
  const scrollTo = (y: number) =>
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
      window.dispatchEvent(new Event('scroll'))
    })
  scrollTo(400)
  expect(header).toHaveAttribute('data-hidden')
  scrollTo(300)
  expect(header).not.toHaveAttribute('data-hidden')
  scrollTo(0)
})
