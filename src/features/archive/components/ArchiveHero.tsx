import { HeroBackground } from '@/components/HeroBackground'

// Görsel bulanık, her ekranda w1280 yeter; yoğunluk koşulları yükleyicinin "original"a düşmesini önler.
const BACKDROP_SIZES = '(min-resolution: 3dppx) 400px, (min-resolution: 2dppx) 600px, 1200px'

export function ArchiveHero({
  title,
  meta,
  description,
  imagePath,
}: {
  title: string
  meta: string
  description: string
  imagePath: string | null
}) {
  return (
    <section className="relative flex min-h-svh flex-col justify-end">
      <HeroBackground imagePath={imagePath} sizes={BACKDROP_SIZES} />
      {/* Üst boşluk sabit navbarın altında kalır. */}
      <div className="wrap relative pt-24 pb-7 md:pb-14">
        <h1 className="font-display text-[clamp(4rem,9.2vw,8.25rem)] leading-[.92] font-extrabold tracking-[.005em]">
          {title}
        </h1>
        <p className="mt-4 text-[15px] text-muted">{meta}</p>
        <p className="mt-6 max-w-[60ch] text-[17px] leading-[1.7]">{description}</p>
      </div>
    </section>
  )
}
