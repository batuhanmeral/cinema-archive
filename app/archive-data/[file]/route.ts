import { archiveDataBody, archiveDataFiles } from '@/features/archive/archive-data'

export const dynamic = 'force-static'
export const dynamicParams = false
export const generateStaticParams = () => archiveDataFiles().map((file) => ({ file }))

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  return Response.json(archiveDataBody(file))
}
