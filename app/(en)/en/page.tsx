import { HomePage } from '@/features/home/HomePage'
import { buildHomeMetadata } from '@/features/home/metadata'
import { buildHomeView } from '@/features/home/view-model'
import { getSiteEnv } from '@/lib/env'

export const generateMetadata = () => buildHomeMetadata('en', getSiteEnv().siteUrl)

export default function Page() {
  return <HomePage view={buildHomeView('en')} locale="en" />
}
