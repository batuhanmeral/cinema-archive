import type { Metadata } from 'next'
import { ArchivePage } from '@/features/archive/ArchivePage'
import { buildArchiveMetadata } from '@/features/archive/metadata'
import { getSiteEnv } from '@/lib/env'

export function generateMetadata(): Metadata {
  return buildArchiveMetadata('en', getSiteEnv().siteUrl)
}

export default function Page() {
  return <ArchivePage locale="en" />
}
