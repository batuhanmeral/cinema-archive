import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PerdeFrameData } from '../view-model'
import { PerdeFrame } from './PerdeFrame'

const films = Array.from({ length: 16 }, (_, i) => ({
  href: `/film/film-${i + 1}`,
  title: `Film ${i + 1}`,
  caption: 'Director, 1960',
  overview: null,
  image: null,
}))
const frame: PerdeFrameData = {
  slot: 5,
  name: 'Fransız Yeni Dalgası',
  href: '/movement/french-new-wave',
  meta: '1958–1967 · Fransa · 16 film',
  films: films.slice(0, 1),
  total: 16,
  dataUrl: '/home-data/perde-tr-french-new-wave.json',
}
const counterText = (expected: string) => (_text: string, element: Element | null) =>
  element?.tagName === 'SPAN' && element.textContent === expected

const response = (body: unknown = films) =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()))
  vi.stubGlobal(
    'PointerEvent',
    class extends MouseEvent {
      readonly pointerType: string

      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init)
        this.pointerType = init.pointerType ?? ''
      }
    },
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function renderFrame() {
  const view = render(<PerdeFrame frame={frame} locale="tr" />)
  return { ...view, root: view.container.querySelector<HTMLElement>('[data-perde-slot]')! }
}

describe('PerdeFrame', () => {
  it('renders linked movement and initial film without empty overview or image', () => {
    const { container, root } = renderFrame()
    expect(root).toHaveAttribute('data-perde-slot', 'w5')
    expect(screen.getByRole('link', { name: frame.name })).toHaveAttribute('href', frame.href)
    expect(screen.getByRole('link', { name: 'Film 1' })).toHaveAttribute('href', '/film/film-1')
    expect(screen.getByText(counterText('1 / 16'))).toBeInTheDocument()
    expect(screen.queryByText('Akıma git')).not.toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[data-overview]')).toBeNull()
    expect(container.querySelector('[aria-live]')).toHaveAttribute('aria-live', 'polite')
    expect(container.querySelector('[aria-live]')).toHaveAttribute('aria-atomic', 'true')
    expect(screen.getByText('Diğer filmler için kaydır')).toHaveClass('md:hidden')
    expect(screen.getByRole('button', { name: 'Sonraki film' })).toHaveClass('hidden', 'md:grid')
  })
  it('keeps the overview outside the film announcements', () => {
    const overviewText = 'Filmin özeti'
    const { container } = render(
      <PerdeFrame
        frame={{ ...frame, films: [{ ...films[0]!, overview: overviewText }] }}
        locale="tr"
      />,
    )
    const overview = screen.getByText(overviewText)
    const liveRegion = container.querySelector('[aria-live]')!
    expect(overview).toBeVisible()
    expect(overview.closest('.animate-perde-fade')).not.toBeNull()
    expect(liveRegion).not.toContainElement(overview)
    expect(liveRegion).toHaveTextContent('Film 1')
    expect(liveRegion).toHaveTextContent('Director, 1960')
    expect(liveRegion).toHaveTextContent('1 / 16')
  })
  it('loads once, advances, wraps backwards and keeps every film reachable', async () => {
    renderFrame()
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki film' }))
    await screen.findByText(counterText('2 / 16'))
    fireEvent.click(screen.getByRole('button', { name: 'Önceki film' }))
    fireEvent.click(screen.getByRole('button', { name: 'Önceki film' }))
    expect(screen.getByText(counterText('16 / 16'))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki film' }))
    expect(screen.getByText(counterText('1 / 16'))).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('queues three rapid presses behind a single request', async () => {
    let resolve!: (value: ReturnType<typeof response>) => void
    vi.mocked(fetch).mockReturnValue(
      new Promise((done) => {
        resolve = done
      }) as Promise<Response>,
    )
    renderFrame()
    const next = screen.getByRole('button', { name: 'Sonraki film' })
    fireEvent.click(next)
    fireEvent.click(next)
    fireEvent.click(next)
    expect(fetch).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolve(response())
    })
    expect(screen.getByText(counterText('4 / 16'))).toBeInTheDocument()
  })
  it.each(['network', 'http', 'invalid', 'short'])(
    'keeps the initial film on %s failure',
    async (kind) => {
      if (kind === 'network') vi.mocked(fetch).mockRejectedValue(new Error('offline'))
      else
        vi.mocked(fetch).mockResolvedValue(
          kind === 'http'
            ? new Response(null, { status: 503 })
            : (response(kind === 'invalid' ? [{ bad: 1 }] : films.slice(0, 2)) as Response),
        )
      const { container } = renderFrame()
      fireEvent.click(screen.getByRole('button', { name: 'Sonraki film' }))
      await act(async () => {})
      expect(screen.getByText(counterText('1 / 16'))).toBeInTheDocument()
      expect(container.textContent).not.toContain('undefined')
    },
  )
  it('handles arrow keys on the frame but ignores links', async () => {
    const { root } = renderFrame()
    fireEvent.keyDown(root, { key: 'ArrowRight' })
    await screen.findByText(counterText('2 / 16'))
    fireEvent.keyDown(screen.getByRole('link', { name: 'Film 2' }), { key: 'ArrowRight' })
    expect(screen.getByText(counterText('2 / 16'))).toBeInTheDocument()
    fireEvent.keyDown(root, { key: 'ArrowLeft' })
    expect(screen.getByText(counterText('1 / 16'))).toBeInTheDocument()
  })
  it('advances after a horizontal touch swipe', async () => {
    const { root } = renderFrame()
    fireEvent.pointerDown(root, { pointerType: 'touch', clientX: 160, clientY: 60 })
    fireEvent.pointerUp(root, { pointerType: 'touch', clientX: 100, clientY: 65 })
    await screen.findByText(counterText('2 / 16'))
  })
  it('keeps the current film when the mouse is dragged horizontally', async () => {
    const { root } = renderFrame()
    await act(async () => {
      fireEvent.pointerDown(root, { pointerType: 'mouse', clientX: 160, clientY: 60 })
      fireEvent.pointerUp(root, { pointerType: 'mouse', clientX: 100, clientY: 65 })
    })
    expect(screen.getByText(counterText('1 / 16'))).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('never advances automatically and does not load a hidden frame on idle', async () => {
    vi.useFakeTimers()
    const { root } = renderFrame()
    Object.defineProperty(root, 'checkVisibility', { value: () => false })
    await act(async () => {
      vi.advanceTimersByTime(15000)
    })
    expect(screen.getByText(counterText('1 / 16'))).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('loads a visible frame on idle without changing its film', async () => {
    vi.useFakeTimers()
    const { root } = renderFrame()
    Object.defineProperty(root, 'checkVisibility', { value: () => true })
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByText(counterText('1 / 16'))).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(frame.dataUrl)
    vi.useRealTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Sonraki film' }))
    await waitFor(() => expect(screen.getByText(counterText('2 / 16'))).toBeInTheDocument())
  })
})
