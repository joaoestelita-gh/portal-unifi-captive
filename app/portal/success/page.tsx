import { getPortalSettings } from '@/app/actions/wifi'
import { sanitizeRedirectUrl } from '@/lib/validations'
import { DEFAULT_SUCCESS_REDIRECT_URL } from '@/lib/constants'
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
  // `redirect`/`url` vêm da query e são controlados pelo cliente — sanitiza para
  // impedir open-redirect (esta página é pública e vai direto para window.location).
  // Fallback: config do admin, depois o padrão do sistema.
  const redirectUrl =
    sanitizeRedirectUrl(params.redirect) ||
    sanitizeRedirectUrl(params.url) ||
    settings.successRedirectUrl ||
    DEFAULT_SUCCESS_REDIRECT_URL
  
  return (
    <SuccessContent 
      sessionMinutes={sessionMinutes}
      userName={userName}
      redirectUrl={redirectUrl}
    />
  )
}
