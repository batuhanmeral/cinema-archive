import { ROTATION, ROTATION_EPOCH_MS, WEEK_MS } from '../rotation'
import { weekCss } from '../week-css'

export function WeekStyle({ buildWeek }: { buildWeek: number }) {
  return (
    <>
      <style id="week-css" suppressHydrationWarning>
        {weekCss(buildWeek, ROTATION.length)}
      </style>
      <script
        type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `{var w=Math.floor((Date.now()-${ROTATION_EPOCH_MS})/${WEEK_MS});var n=${ROTATION.length};document.getElementById('week-css').textContent=(${weekCss.toString()})(((w%n)+n)%n,n)}`,
        }}
      />
    </>
  )
}
