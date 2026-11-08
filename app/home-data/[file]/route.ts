import { homeDataBody, homeDataFiles } from '@/features/home/home-data'

export const dynamic = 'force-static'
export const dynamicParams = false
export const generateStaticParams = () => homeDataFiles().map((file) => ({ file }))

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  return Response.json(homeDataBody(file))
}
