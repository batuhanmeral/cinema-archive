import Link from 'next/link'
import type { LinkItem } from '@/lib/link-items'

export function IndexItem({ item }: { item: LinkItem }) {
  if (!item.href) return item.text
  return (
    // Kişi (M5) bağlantıları prefetch: false taşır; sayfaları henüz yok.
    <Link
      href={item.href}
      prefetch={item.prefetch}
      className="transition-colors duration-150 hover:text-accent"
    >
      {item.text}
    </Link>
  )
}
