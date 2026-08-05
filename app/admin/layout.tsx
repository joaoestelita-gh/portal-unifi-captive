import type { ReactNode } from 'react'
import { getPortalSettings } from '@/app/actions/portal-settings'
import { AdminThemeScheme } from '@/components/admin/admin-theme-scheme'
import { DEFAULT_COLOR_SCHEME, isValidColorScheme } from '@/lib/color-schemes'

/**
 * Layout do painel admin.
 *
 * Lê o esquema de cores salvo no banco (server-side) e aplica via data-theme
 * antes da hidratação, evitando flash de cor. Envolve tanto o dashboard quanto
 * a tela de login em /admin.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  let scheme = DEFAULT_COLOR_SCHEME
  try {
    const settings = await getPortalSettings()
    if (isValidColorScheme(settings?.colorScheme)) {
      scheme = settings!.colorScheme as string
    }
  } catch {
    // Em caso de falha, mantém o esquema padrão.
  }

  return <AdminThemeScheme initialScheme={scheme}>{children}</AdminThemeScheme>
}
