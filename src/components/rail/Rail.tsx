'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { arrowVisibility, focusAfterArrowChange } from './rail-state'

// Bir basışta görünür genişliğin %80'i kayar; önceki sayfanın son kartı göz ucunda kalır.
const SCROLL_STEP = 0.8
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

type Direction = -1 | 1

const ARROW_CLASS =
  'absolute top-[calc(var(--rail-image-h)/2)] z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full text-arrow transition-[opacity,color,background-color] duration-200 hover:bg-surface hover:text-text md:grid'

/**
 * Yatay kaydırmalı şerit. Çocuklar `<li>` olmalı. Oklar görselin ortasına hizalanır:
 * kapsayıcı `--rail-image-h` değişkenini kart görselinin yüksekliğine ayarlar.
 */
export function Rail({
  label,
  locale,
  children,
}: {
  label: string
  locale: Locale
  children: ReactNode
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<HTMLButtonElement>(null)
  const endRef = useRef<HTMLButtonElement>(null)
  const [arrows, setArrows] = useState({ start: false, end: false })

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const update = () => {
      const next = arrowVisibility(track.scrollLeft, track.clientWidth, track.scrollWidth)
      const active = document.activeElement
      const focused =
        active === startRef.current ? 'start' : active === endRef.current ? 'end' : null
      const target = focusAfterArrowChange(focused, next)
      if (!target) {
        setArrows(next)
        return
      }
      // Karşı ok ancak DOM güncellenince odaklanabilir; bu yüzden durum hemen işlenir.
      flushSync(() => setArrows(next))
      const targets = { start: startRef, end: endRef, track: trackRef }
      targets[target].current?.focus()
    }
    update()
    track.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      track.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const scrollPage = (direction: Direction) => {
    const track = trackRef.current
    if (!track) return
    const reduceMotion = window.matchMedia(REDUCED_MOTION).matches
    track.scrollBy({
      left: direction * track.clientWidth * SCROLL_STEP,
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }

  const t = messages[locale].rail
  return (
    <div className="relative min-w-0">
      <button
        ref={startRef}
        type="button"
        aria-label={t.previous}
        onClick={() => scrollPage(-1)}
        className={`${ARROW_CLASS} left-0 -translate-x-1/2 ${arrows.start ? '' : 'invisible opacity-0'}`}
      >
        <ArrowLeft size={22} strokeWidth={1.25} aria-hidden />
      </button>
      <button
        ref={endRef}
        type="button"
        aria-label={t.next}
        onClick={() => scrollPage(1)}
        className={`${ARROW_CLASS} right-0 translate-x-1/2 ${arrows.end ? '' : 'invisible opacity-0'}`}
      >
        <ArrowRight size={22} strokeWidth={1.25} aria-hidden />
      </button>
      {/* Odaklanabilir bölge: bağlantısız kartlarda da şerit klavyeyle kaydırılabilsin.
          4 px iç boşluk (eksi dış boşlukla dengelenir) kenar kartların odak çizgisini kırpılmaktan korur. */}
      <div
        ref={trackRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="-m-1 snap-x snap-mandatory scroll-px-1 overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex w-max gap-3 *:flex-none *:snap-start md:gap-5">{children}</ul>
      </div>
    </div>
  )
}
