'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { HeroBackground } from '@/components/HeroBackground'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { slotAttr } from '@/lib/rotation'
import { perdeStep, swipeDirection } from '../perde-state'
import { perdeFilmsFileSchema, type PerdeFilm } from '../schemas'
import type { PerdeFrameData } from '../view-model'

const IDLE_DELAY_MS = 2000
const ARROW_CLASS =
  'absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full text-arrow transition-colors duration-200 hover:bg-surface hover:text-text md:grid'

export function PerdeFrame({ frame, locale }: { frame: PerdeFrameData; locale: Locale }) {
  const root = useRef<HTMLDivElement>(null)
  const [films, setFilms] = useState(frame.films)
  const [index, setIndex] = useState(0)
  const loaded = useRef<PerdeFilm[] | null>(null)
  const inFlight = useRef<Promise<void> | null>(null)
  const pending = useRef(0)
  const mounted = useRef(true)
  const pointer = useRef<{ x: number; y: number } | null>(null)

  const load = useCallback(() => {
    if (loaded.current) return Promise.resolve()
    if (inFlight.current) return inFlight.current
    inFlight.current = (async () => {
      try {
        const response = await fetch(frame.dataUrl)
        if (!response.ok) return
        const parsed = perdeFilmsFileSchema.safeParse(await response.json())
        if (!parsed.success || parsed.data.length !== frame.total || !mounted.current) return
        loaded.current = parsed.data
        setFilms(parsed.data)
        const delta = pending.current
        setIndex(
          (current) =>
            (((current + delta) % parsed.data.length) + parsed.data.length) % parsed.data.length,
        )
      } catch {
        // Çevrimdışı veya bozuk JSON durumunda derleme karesi kullanılmaya devam eder.
      } finally {
        pending.current = 0
        inFlight.current = null
      }
    })()
    return inFlight.current
  }, [frame.dataUrl, frame.total])

  useEffect(() => {
    mounted.current = true
    const onIdle = () => {
      if (root.current?.checkVisibility()) void load()
    }
    const idle = typeof window.requestIdleCallback === 'function'
    const timer = idle
      ? window.requestIdleCallback(onIdle)
      : window.setTimeout(onIdle, IDLE_DELAY_MS)
    return () => {
      mounted.current = false
      if (idle) window.cancelIdleCallback(timer)
      else window.clearTimeout(timer)
    }
  }, [load])

  function navigate(direction: -1 | 1) {
    if (loaded.current) setIndex((current) => perdeStep(current, direction, loaded.current!.length))
    else {
      pending.current += direction
      void load()
    }
  }

  const film = films[index]!
  const t = messages[locale].home
  return (
    <div
      ref={root}
      data-perde-slot={slotAttr(frame.slot)}
      role="group"
      aria-label={frame.name}
      tabIndex={0}
      className="wrap absolute inset-0 flex touch-pan-y flex-col justify-end pt-24 pb-7 outline-offset-[-4px] md:pb-14"
      onKeyDown={(event) => {
        if ((event.target as HTMLElement).closest('a')) return
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
        event.preventDefault()
        navigate(event.key === 'ArrowLeft' ? -1 : 1)
      }}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse') return
        pointer.current = { x: event.clientX, y: event.clientY }
      }}
      onPointerCancel={() => {
        pointer.current = null
      }}
      onPointerUp={(event) => {
        if (event.pointerType === 'mouse' || !pointer.current) return
        const direction = swipeDirection(
          event.clientX - pointer.current.x,
          event.clientY - pointer.current.y,
        )
        pointer.current = null
        if (direction) navigate(direction)
      }}
    >
      <div
        key={`background-${index}`}
        className="absolute inset-0 animate-perde-fade motion-reduce:animate-none"
      >
        <HeroBackground imagePath={film.image} sizes="100vw" preload={false} />
      </div>
      <button
        type="button"
        aria-label={t.previousFilm}
        className={`${ARROW_CLASS} left-8`}
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={22} strokeWidth={1.5} aria-hidden />
      </button>
      <button
        type="button"
        aria-label={t.nextFilm}
        className={`${ARROW_CLASS} right-8`}
        onClick={() => navigate(1)}
      >
        <ArrowRight size={22} strokeWidth={1.5} aria-hidden />
      </button>
      <div className="relative min-w-0">
        <h1 className="font-display text-[64px] leading-[.92] font-extrabold wrap-break-word md:text-[clamp(4rem,9.2vw,8.25rem)]">
          <Link href={frame.href} className="transition-colors hover:text-accent">
            {frame.name}
          </Link>
        </h1>
        <p className="mt-4 text-[13px] text-muted md:text-[15px]">{frame.meta}</p>
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {`${film.title} · ${film.caption} · ${index + 1} / ${frame.total}`}
        </div>
        <div className="mt-7 md:mt-10">
          <div
            key={`film-${index}`}
            className="flex min-w-0 flex-col gap-5 animate-perde-fade motion-reduce:animate-none md:flex-row md:items-end md:justify-between md:gap-12"
          >
            <div className="min-w-0 max-w-[58ch]">
              <p className="font-display text-[28px] leading-none font-bold wrap-break-word md:text-[40px]">
                <Link href={film.href} className="transition-colors hover:text-accent">
                  {film.title}
                </Link>
              </p>
              <p className="mt-2 text-[13px] text-muted md:text-sm">{film.caption}</p>
              {film.overview && (
                <p
                  data-overview
                  className="mt-3 line-clamp-3 text-sm leading-relaxed md:mt-4 md:text-[15px]"
                >
                  {film.overview}
                </p>
              )}
            </div>
            <span className="shrink-0 font-display text-[22px] font-bold whitespace-nowrap text-muted md:text-[28px]">
              <span className="text-text">{index + 1}</span>
              {` / ${frame.total}`}
            </span>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted md:hidden">{t.swipe}</p>
      </div>
    </div>
  )
}
