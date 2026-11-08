import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { weekIndex } from '../rotation'
import { weekCss } from '../week-css'
import { WeekStyle } from './WeekStyle'

afterEach(() => {
  vi.useRealTimers()
  document.head.innerHTML = ''
})

describe('WeekStyle', () => {
  it('replaces the build week before paint using the current instant', () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 10, 9, 21))
    const html = renderToString(<WeekStyle buildWeek={0} />)
    document.head.innerHTML = '<style id="week-css"></style>'
    const script = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1]
    expect(script).toBeTruthy()
    new Function(script!)()
    expect(document.getElementById('week-css')?.textContent).toBe(
      weekCss(weekIndex(Date.now()), 18),
    )
  })
})
