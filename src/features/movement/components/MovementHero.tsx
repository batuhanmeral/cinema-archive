import { HeroBackground } from '@/components/HeroBackground'
import type { MovementView } from '../view-model'

// Görsel bulanık, her ekranda w1280 yeter; yoğunluk koşulları yükleyicinin "original"a düşmesini önler.
const BACKDROP_SIZES = '(min-resolution: 3dppx) 400px, (min-resolution: 2dppx) 600px, 1200px'

export function MovementHero({ view }: { view: MovementView }) {
  return (
    <section className="relative flex min-h-svh flex-col justify-end">
      <HeroBackground imagePath={view.heroImage} sizes={BACKDROP_SIZES} />
      {/* Üst boşluk sabit navbarın altında kalır. */}
      <div className="wrap relative pt-24 pb-7 md:pb-14">
        <h1 className="font-display text-[clamp(3rem,9.2vw,8.25rem)] leading-[.92] font-extrabold tracking-[.005em] wrap-break-word hyphens-auto">
          {view.name}
        </h1>
        <p className="mt-4 text-[15px] text-muted">{view.meta}</p>
      </div>
    </section>
  )
}
