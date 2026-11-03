import type { ReactNode } from 'react'

const HEADING_CLASS = 'font-display text-[28px] font-bold tracking-[.01em] md:text-[30px]'

export function FilmSection({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="wrap pt-(--section-gap)">
      {/* h2 + div seçicisine dayanan testler için başlık, eylem yokken kardeş kalır. */}
      {action ? (
        <div className="mb-4 flex items-baseline justify-between gap-4 md:mb-5">
          <h2 className={HEADING_CLASS}>{title}</h2>
          {action}
        </div>
      ) : (
        <h2 className={`mb-4 md:mb-5 ${HEADING_CLASS}`}>{title}</h2>
      )}
      {children}
    </section>
  )
}
