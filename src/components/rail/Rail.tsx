'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { arrowVisibility } from './rail-state'

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
  const [arrows, setArrows] = useState({ start: false, end: false })

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const update = () =>
      setArrows(arrowVisibility(track.scrollLeft, track.clientWidth, track.scrollWidth))
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
        type="button"
        aria-label={t.previous}
        onClick={() => scrollPage(-1)}
        className={`${ARROW_CLASS} left-0 -translate-x-1/2 ${arrows.start ? '' : 'invisible opacity-0'}`}
      >
        <ArrowLeft size={22} strokeWidth={1.25} aria-hidden />
      </button>
      <button
        type="button"
        aria-label={t.next}
        onClick={() => scrollPage(1)}
        className={`${ARROW_CLASS} right-0 translate-x-1/2 ${arrows.end ? '' : 'invisible opacity-0'}`}
      >
        <ArrowRight size={22} strokeWidth={1.25} aria-hidden />
      </button>
      {/* Odaklanabilir bölge: bağlantısız kartlarda da şerit klavyeyle kaydırılabilsin. */}
      <div
        ref={trackRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex w-max gap-3 *:flex-none *:snap-start md:gap-5">{children}</ul>
      </div>
    </div>
  )
}
