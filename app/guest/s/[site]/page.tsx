import { PortalEntry, type PortalSearchParams } from '@/components/portal-entry'

/**
 * Endpoint canônico do UniFi External Hotspot: /guest/s/<site>/
 *
 * O UniFi Network redireciona o cliente para este path com os parâmetros
 * ap, id, t, url e ssid na query string. O `site` vem do path e é injetado
 * nos params para auditoria da sessão. Toda a lógica é compartilhada com
 * `/` e `/portal` via PortalEntry.
 */
export default async function GuestPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ site: string }>
  searchParams: Promise<PortalSearchParams>
}) {
  const [{ site }, sp] = await Promise.all([params, searchParams])
  return <PortalEntry params={{ ...sp, site }} />
}
