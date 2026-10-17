import type { ReactNode } from 'react'

export function FilmSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="wrap pt-(--section-gap)">
      <h2 className="mb-3.5 font-display text-[28px] font-bold tracking-[.01em] md:mb-5 md:text-[30px]">
        {title}
      </h2>
      {children}
    </section>
  )
}
