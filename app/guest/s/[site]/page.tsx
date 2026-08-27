import { PortalEntry, type PortalSearchParams } from '@/components/portal-entry'

/**
 * Rota que captura o redirect do UniFi quando configurado com IP no External Portal.
 *
 * O UniFi redireciona para: http://IP/guest/s/{site}/?mac=XX&ap=XX&ssid=XX&url=XX
 * Esta rota captura esses parâmetros e renderiza o portal normalmente.
 *
 * Assim o admin pode configurar apenas o IP no campo "External Portal Server"
 * sem precisar de URL completa (que algumas versões do firmware não aceitam).
 */
export default async function UnifiGuestPage({
  searchParams,
}: {
  searchParams: Promise<PortalSearchParams>
}) {
  const params = await searchParams
  return <PortalEntry params={params} />
}
