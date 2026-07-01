import { getPortalSettings, checkActiveSession } from '@/app/actions/wifi'
import { CaptivePortalForm } from '@/components/captive-portal-form'
import { addPortalLog } from '@/lib/portal-logs'
import { redirect } from 'next/navigation'

export interface PortalSearchParams {
  mac?: string
  ap?: string
  url?: string
  t?: string
  ssid?: string
  // Aruba Instant On parameters
  cmd?: string
  switchip?: string
  essid?: string
  apname?: string
  apmac?: string
  vcname?: string
  ip?: string
  // Aruba Instant On may send the client MAC/IP with a `client` prefix
  clientmac?: string
  clientip?: string
  // Skip auto-login (for testing)
  force?: string
}

// Shared captive portal entry logic used by both `/` and `/portal`.
// Handles UniFi and Aruba Instant On redirect parameters, logging,
// and auto-reconnect for devices with an active session.
export async function PortalEntry({ params }: { params: PortalSearchParams }) {
  const settings = await getPortalSettings()

  // UniFi sends: mac, ap, url, t, ssid
  // Aruba Instant On sends: cmd, clientmac/mac, clientip/ip, essid, apname, apmac, switchip, vcname, url
  const macAddress = params.mac || params.clientmac || ''
  const clientIp = params.ip || params.clientip || ''
  const redirectUrl = params.url || settings.successRedirectUrl || 'https://google.com'
  const ssid = params.ssid || params.essid || ''

  // Detect controller type from the redirect parameters
  const controller = params.cmd ? 'aruba' : params.ap ? 'unifi' : 'direct'

  // Aruba Instant On ECP params. `switchip` is the captive-portal domain the
  // AP wants us to authenticate against after login (e.g. securelogin.arubanetworks.com).
  const arubaParams =
    controller === 'aruba'
      ? {
          mac: macAddress,
          ip: clientIp,
          essid: params.essid,
          apname: params.apname,
          apmac: params.apmac,
          vcname: params.vcname,
          switchip: params.switchip,
          url: params.url,
        }
      : undefined

  // Log portal access for debugging (only if there are params)
  if (Object.values(params).some((v) => v)) {
    addPortalLog({
      timestamp: new Date().toISOString(),
      controller,
      mac: macAddress || null,
      ip: clientIp || null,
      ssid: params.ssid || params.essid || null,
      apName: params.apname || params.ap || null,
      params: Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined)
      ) as Record<string, string>,
    })
    console.log('[Portal] Access logged:', controller, macAddress)
  }

  // Auto-reconnect: if this MAC already has an active session, skip the form.
  // Skip when force=1 is present (useful for testing the form directly).
  if (macAddress && params.force !== '1') {
    const sessionCheck = await checkActiveSession(
      macAddress,
      controller !== 'direct' ? controller : null,
      arubaParams
    )

    if (sessionCheck.hasActiveSession) {
      console.log('[Portal] Auto-reconnect:', macAddress, sessionCheck.userName)
      redirect(sessionCheck.redirectUrl || redirectUrl)
    }
  }

  return (
    <CaptivePortalForm
      settings={{
        portalTitle: settings.portalTitle,
        portalSubtitle: settings.portalSubtitle,
        logoUrl: settings.logoUrl,
        backgroundUrl: settings.backgroundUrl,
        backgroundColor: settings.backgroundColor,
        primaryColor: settings.primaryColor,
        termsText: settings.termsText,
      }}
      macAddress={macAddress}
      redirectUrl={redirectUrl}
      ssid={ssid}
      detectedController={controller !== 'direct' ? controller : null}
      arubaParams={arubaParams}
    />
  )
}
