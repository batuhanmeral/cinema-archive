import type { ComponentProps } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/features/search/load', () => ({ loadSearchData: () => new Promise(() => {}) }))

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

describe('Navbar search', () => {
  it('shows the full box from lg and the lens button below it', async () => {
    await renderNavbar('tr')
    const box = screen.getByRole('combobox', { name: 'Sitede ara' })
    expect(box.closest('.lg\\:block')).not.toBeNull()
    const lens = screen.getByRole('button', { name: 'Aramayı aç' })
    expect(lens.closest('.lg\\:hidden')).not.toBeNull()
  })

  it('never keeps the menu and the search panel open together', async () => {
    const user = userEvent.setup()
    await renderNavbar('tr')
    const lens = screen.getByRole('button', { name: 'Aramayı aç' })
    const menu = screen.getByRole('button', { name: 'Menü' })
    await user.click(menu)
    expect(menu).toHaveAttribute('aria-expanded', 'true')
    await user.click(lens)
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    const close = screen.getByRole('button', { name: 'Aramayı kapat' })
    expect(close).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
    expect(screen.getAllByRole('combobox')[1]).toHaveFocus()
    await user.click(menu)
    expect(menu).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Aramayı aç' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getAllByRole('combobox')).toHaveLength(1)
  })

  it('closes the search panel on Esc and returns focus to the lens', async () => {
    const user = userEvent.setup()
    await renderNavbar('tr')
    await user.click(screen.getByRole('button', { name: 'Aramayı aç' }))
    await user.keyboard('{Escape}')
    const lens = screen.getByRole('button', { name: 'Aramayı aç' })
    expect(lens).toHaveAttribute('aria-expanded', 'false')
    expect(lens).toHaveFocus()
  })
})
