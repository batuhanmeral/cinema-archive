import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MovementPage } from '@/features/movement/MovementPage'
import { buildMovementMetadata } from '@/features/movement/metadata'
import { movementBySlug } from '@/features/movement/queries'
import { store } from '@/lib/data'
import { getSiteEnv } from '@/lib/env'

type Props = { params: Promise<{ slug: string }> }

// Statik dışa aktarımda yalnızca bilinen akımlar üretilir; diğer slug'lar 404.
export const dynamicParams = false

export function generateStaticParams() {
  return store.movements().map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const movement = movementBySlug((await params).slug)
  if (!movement) notFound()
  return buildMovementMetadata(movement, 'en', getSiteEnv().siteUrl)
}

export default async function Page({ params }: Props) {
  return <MovementPage slug={(await params).slug} locale="en" />
}
