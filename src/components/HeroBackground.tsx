import Image from 'next/image'

// Bulanık tam ekran arka plan; parlaklık filtresi ve örtü, açık görsellerde metni AA'da tutar.
export function HeroBackground({ imagePath, sizes }: { imagePath: string | null; sizes: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {imagePath && (
        <Image
          src={imagePath}
          alt=""
          fill
          preload
          sizes={sizes}
          className="scale-108 object-cover blur-[5px] brightness-(--hero-poster-brightness)"
        />
      )}
      <div className="absolute inset-0 bg-hall/72" />
    </div>
  )
}
