// Kaynağı baştaki betiğe gömülür; dış kapsamdaki değişkenlere başvurmaz.
export function weekCss(week: number, count: number): string {
  const a = `w${week}`
  const b = `w${(week + 1) % count}`
  const c = `w${(week + 2) % count}`
  const d = `w${(week + 3) % count}`
  return (
    `[data-perde-slot]:not([data-perde-slot=${a}]){display:none!important}` +
    `[data-home-strip]:not([data-home-strip=${a}]):not([data-home-strip=${b}]):not([data-home-strip=${c}]):not([data-home-strip=${d}]){display:none!important}` +
    `[data-home-strip=${a}]{order:0}[data-home-strip=${b}]{order:1}` +
    `[data-home-strip=${c}]{order:2}[data-home-strip=${d}]{order:3}` +
    `@media (max-width:767px){[data-home-strip=${c}],[data-home-strip=${d}]{display:none!important}}` +
    `[data-strip-slot=${a}] [data-note=current],[data-strip-slot=${b}] [data-note=next]{display:inline!important}`
  )
}
