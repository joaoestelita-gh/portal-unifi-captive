import { PortalEntry, type PortalSearchParams } from '@/components/portal-entry'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<PortalSearchParams>
}) {
  const params = await searchParams
  return <PortalEntry params={params} />
}
