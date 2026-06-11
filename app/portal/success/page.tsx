import { getPortalSettings } from '@/app/actions/wifi'
import { SuccessContent } from './success-content'

export default async function PortalSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ minutes?: string; name?: string; redirect?: string; url?: string }>
}) {
  const params = await searchParams
  const settings = await getPortalSettings()
  
  const sessionMinutes = params.minutes || '120'
  const userName = params.name || 'Visitante'
  // Use redirect from params, or fall back to settings, or default to google
  const redirectUrl = params.redirect || params.url || settings.successRedirectUrl || 'https://google.com'
  
  return (
    <SuccessContent 
      sessionMinutes={sessionMinutes}
      userName={userName}
      redirectUrl={redirectUrl}
    />
  )
}
