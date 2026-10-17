'use client'

import { Play } from 'lucide-react'
import { useState, type ReactNode } from 'react'

const PLAYER_ALLOW = 'autoplay; encrypted-media; picture-in-picture'

/** Kapak görselini gösterir; YouTube iframe'i yalnızca basınca eklenir (öncesinde üçüncü taraf isteği yok). */
export function TrailerPlayer({
  src,
  title,
  label,
  children,
}: {
  src: string
  title: string
  label: string
  children: ReactNode
}) {
  const [playing, setPlaying] = useState(false)

  if (playing) {
    return (
      <iframe
        // Düğme kaybolunca klavye odağı oynatıcıya geçsin.
        ref={(frame) => frame?.focus()}
        src={src}
        title={title}
        allow={PLAYER_ALLOW}
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 size-full border-0"
      />
    )
  }

  return (
    <>
      {children}
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-hall/55 py-2 pr-4 pl-3 text-[13px] font-medium transition-colors duration-200 hover:bg-hall/80 md:bottom-5 md:left-5"
      >
        <Play size={14} fill="currentColor" aria-hidden />
        {label}
      </button>
    </>
  )
}
