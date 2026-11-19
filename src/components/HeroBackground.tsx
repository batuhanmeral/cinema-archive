import Image from 'next/image'

// Bulanık tam ekran arka plan; parlaklık filtresi ve örtü, açık görsellerde metni AA'da tutar.
export function HeroBackground({
  imagePath,
  sizes,
  preload = true,
}: {
  imagePath: string | null
  sizes: string
  preload?: boolean
}) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {imagePath && (
        <Image
          src={imagePath}
          alt=""
          fill
          preload={preload}
          loading={preload ? undefined : 'lazy'}
          fetchPriority={preload ? undefined : 'high'}
          sizes={sizes}
          className="scale-108 object-cover blur-[5px] brightness-(--hero-poster-brightness)"
        />
      )}
      <div className="absolute inset-0 bg-hall/72" />
    </div>
  )
}
