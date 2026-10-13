import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FilmPage } from '@/features/film/FilmPage'
import { buildFilmMetadata } from '@/features/film/metadata'
import { store } from '@/lib/data'
import { getSiteEnv } from '@/lib/env'

type Props = { params: Promise<{ slug: string }> }

// Statik dışa aktarımda yalnızca bilinen filmler üretilir; diğer slug'lar 404.
export const dynamicParams = false

export function generateStaticParams() {
  return store.films().map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const film = store.filmBySlug((await params).slug)
  if (!film) notFound()
  return buildFilmMetadata(film, 'en', getSiteEnv().siteUrl)
}

export default async function Page({ params }: Props) {
  return <FilmPage slug={(await params).slug} locale="en" />
}
