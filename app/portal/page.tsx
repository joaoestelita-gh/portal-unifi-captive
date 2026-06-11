import { PortalEntry, type PortalSearchParams } from '@/components/portal-entry'

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<PortalSearchParams>
}) {
  const params = await searchParams
  return <PortalEntry params={params} />
}
