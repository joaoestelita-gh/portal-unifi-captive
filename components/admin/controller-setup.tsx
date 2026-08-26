'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Check, Wifi, Shield, Eye, EyeOff, Loader2, CheckCircle, Server, RefreshCw, Info, Router, Globe, Users, Bug, Trash2, Plus, ExternalLink, ChevronDown, Activity, ShieldCheck, KeyRound } from 'lucide-react'
import { updateControllerSettings } from '@/app/actions/wifi'
import { testUnifiConnectionV2, fetchUnifiSitesV2, fetchUnifiDetailsV2, authorizeTestMac, fetchUnifiCloudConsoles, fetchUnifiCloudSites, authorizeTestMacCloud } from '@/app/actions/controller'
import { toast } from 'sonner'

interface PortalLog {
  timestamp: string
  controller: string
  mac: string | null
  ip: string | null
  ssid: string | null
  apName: string | null
  params: Record<string, string>
}

interface ControllerSettings {
  controllerType?: string | null
  unifiControllerUrl?: string | null
  unifiUsername?: string | null
  unifiPassword?: string | null
  unifiSite?: string | null
  // UniFi Cloud
  unifiApiKey?: string | null
  unifiConsoleId?: string | null
  unifiSiteId?: string | null
  arubaControllerUrl?: string | null
  arubaClientId?: string | null
  arubaClientSecret?: string | null
  // Flags de presença de segredos (do getPortalSettingsForClient)
  hasUnifiPassword?: boolean
  hasUnifiApiKey?: boolean
  hasArubaClientSecret?: boolean
}

interface ControllerSetupProps {
  portalUrl: string
  settings: ControllerSettings
}

type ControllerTypeValue = 'none' | 'unifi' | 'unifi-cloud' | 'aruba' | 'both'
type IntegrationState = 'ok' | 'error' | 'idle'

const CONTROLLER_OPTIONS: {
  value: ControllerTypeValue
  title: string
  description: string
  icon: typeof Server
}[] = [
  { value: 'none', title: 'Portal Independente', description: 'Sem integração com controladora', icon: Globe },
  { value: 'unifi', title: 'UniFi (Local)', description: 'Login direto no console (rede local/VPN)', icon: Router },
  { value: 'unifi-cloud', title: 'UniFi Cloud', description: 'API oficial (api.ui.com) — sem túnel', icon: Globe },
  { value: 'aruba', title: 'Aruba Instant On', description: 'HP Networking', icon: Wifi },
  { value: 'both', title: 'UniFi + Aruba', description: 'Ambas as controladoras', icon: Server },
]

// ---------------------------------------------------------------------------
// Componentes auxiliares (design system: cards, tokens, transições suaves)
// ---------------------------------------------------------------------------

/** Cabeçalho de seção com "eyebrow" numerado para o layout de painel corporativo. */
function SectionCard({
  index,
  icon: Icon,
  title,
  description,
  children,
  accent = 'text-primary',
}: {
  index: number
  icon: typeof Server
  title: string
  description?: string
  children: ReactNode
  accent?: string
}) {
  return (
    <Card className="bg-card/50 border-border/50 transition-all duration-200">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-secondary/40">
            <Icon className={`h-5 w-5 ${accent}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Seção {index}</p>
            <CardTitle className="text-foreground text-balance">{title}</CardTitle>
          </div>
        </div>
        {description && <CardDescription className="pt-1">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

/** Linha de status com indicador verde/vermelho/cinza. */
function StatusRow({
  icon: Icon,
  label,
  state,
  detail,
}: {
  icon: typeof Server
  label: string
  state: IntegrationState
  detail: string
}) {
  const styles: Record<IntegrationState, { dot: string; badge: string; text: string }> = {
    ok: { dot: 'bg-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', text: 'Conectado' },
    error: { dot: 'bg-red-400', badge: 'bg-red-500/10 text-red-400 border-red-500/30', text: 'Falha' },
    idle: { dot: 'bg-muted-foreground/40', badge: 'bg-secondary text-muted-foreground border-border/50', text: 'Aguardando' },
  }
  const s = styles[state]
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-secondary/30 p-3 transition-all duration-200">
      <div className="flex items-center gap-3 min-w-0">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {state === 'ok' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${s.dot}`} />
        </span>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{label}</p>
          <p className="text-xs text-muted-foreground truncate">{detail}</p>
        </div>
      </div>
      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.badge}`}>{s.text}</span>
    </div>
  )
}

/** Painel recolhível para conteúdo instrucional longo. */
function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-secondary/20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 p-4 text-left transition-all duration-200 hover:bg-secondary/40"
      >
        <span className="text-sm font-medium text-foreground">{title}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="animate-in fade-in slide-in-from-top-1 border-t border-border/50 p-4 duration-200">{children}</div>
      )}
    </div>
  )
}

/** Estado "sem dados" reutilizável. */
function EmptyState({ icon: Icon, title, description }: { icon: typeof Server; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-secondary/20 py-10 text-center">
      <Icon className="mb-3 h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-md text-xs text-muted-foreground text-pretty">{description}</p>
    </div>
  )
}

export function ControllerSetup({ portalUrl, settings }: ControllerSetupProps) {
  // Exibe erros via toast (substitui o antigo card de mensagem para falhas)
  const showError = (message: string) => {
    toast.error('Erro', { description: message })
  }

  const [copied, setCopied] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  // Estado do último teste na sessão, usado para os indicadores de status
  const [connectionStatus, setConnectionStatus] = useState<IntegrationState>('idle')
  // Resultado detalhado do teste de conexão UniFi (mantido até o próximo teste)
  const [connectionInfo, setConnectionInfo] = useState<{
    model?: string
    version?: string
    status?: string
    siteName?: string
    totalSites?: number
    aps?: number
    switches?: number
    gateways?: number
    clientsOnline?: number
    guestsOnline?: number
  } | null>(null)

  // Controller type
  const [controllerType, setControllerType] = useState<ControllerTypeValue>(
    (settings.controllerType as ControllerTypeValue) || 'none'
  )

  // UniFi states
  const [unifiUrl, setUnifiUrl] = useState(settings.unifiControllerUrl || '')
  const [unifiUsername, setUnifiUsername] = useState(settings.unifiUsername || '')
  const [unifiPassword, setUnifiPassword] = useState(settings.unifiPassword || '')
  const [unifiSite, setUnifiSite] = useState(settings.unifiSite || 'default')
  const [unifiSites, setUnifiSites] = useState<Array<{ id: string; name: string; role: string }>>([])
  const [loadingSites, setLoadingSites] = useState(false)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [siteInfo, setSiteInfo] = useState<{
    siteName: string
    clientCount: number
    guestCount: number
    gateway: {
      name: string
      model: string
      ip: string
      lanIp?: string
      wanIp?: string
      version: string
      uptime: number
      state: string
      mac: string
    } | null
    devices: Array<{
      name: string
      model: string
      type: string
      ip: string
      mac: string
      version?: string
      state: string
      clients: number
      guests: number
    }>
  } | null>(null)

  // Ferramenta de diagnóstico: autorizar MAC de teste
  const [testMac, setTestMac] = useState('')
  const [authorizingMac, setAuthorizingMac] = useState(false)

  // UniFi Cloud states (Site Manager API + Connector Proxy)
  const [unifiApiKey, setUnifiApiKey] = useState('') // sempre vazio; segredo mascarado no servidor
  const [showApiKey, setShowApiKey] = useState(false)
  const [unifiConsoleId, setUnifiConsoleId] = useState(settings.unifiConsoleId || '')
  const [unifiSiteId, setUnifiSiteId] = useState(settings.unifiSiteId || '')
  const [cloudConsoles, setCloudConsoles] = useState<Array<{ id: string; name: string; ip?: string; version?: string }>>([])
  const [cloudSites, setCloudSites] = useState<Array<{ id: string; name: string; description?: string }>>([])
  const [loadingConsoles, setLoadingConsoles] = useState(false)
  const [loadingCloudSites, setLoadingCloudSites] = useState(false)

  // HP Aruba Instant On states
  const [arubaUrl, setArubaUrl] = useState(settings.arubaControllerUrl || '')
  const [arubaClientId, setArubaClientId] = useState(settings.arubaClientId || '')
  const [arubaClientSecret, setArubaClientSecret] = useState(settings.arubaClientSecret || '')

  // Debug logs state
  const [portalLogs, setPortalLogs] = useState<PortalLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [clearingLogs, setClearingLogs] = useState(false)

  // manual = disparado pelo usuário (mostra toast); silencioso = auto-refresh
  const fetchPortalLogs = useCallback(async (manual = false) => {
    setLoadingLogs(true)
    try {
      const res = await fetch('/api/debug/portal-logs')
      if (!res.ok) throw new Error('Falha ao carregar logs')
      const data = await res.json()
      setPortalLogs(data.logs || [])
      if (manual) toast.success('Logs atualizados')
    } catch (error) {
      console.error('Error fetching portal logs:', error)
      if (manual) showError('Não foi possível atualizar os logs de acesso.')
    }
    setLoadingLogs(false)
  }, [])

  const clearPortalLogs = async () => {
    setClearingLogs(true)
    try {
      const res = await fetch('/api/debug/portal-logs', { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha ao limpar logs')
      setPortalLogs([])
      toast.success('Logs limpos com sucesso')
    } catch (error) {
      console.error('Error clearing logs:', error)
      showError('Não foi possível limpar os logs de acesso.')
    }
    setClearingLogs(false)
  }

  // Auto-refresh logs every 5 seconds when on UniFi or Aruba
  useEffect(() => {
    if (controllerType !== 'none') {
      fetchPortalLogs()
      const interval = setInterval(fetchPortalLogs, 5000)
      return () => clearInterval(interval)
    }
  }, [controllerType, fetchPortalLogs])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    toast.success('Copiado!', { description: text })
    setTimeout(() => setCopied(null), 2000)
  }

  // Retorna true/false para que o handleTest saiba se o salvamento foi bem-sucedido.
  // silent evita toast duplicado quando chamado por dentro do "Testar Conexão".
  const handleSave = async (silent = false) => {
    setSaving(true)
    try {
      await updateControllerSettings({
        controllerType,
        unifiEnabled: controllerType === 'unifi' || controllerType === 'both',
        arubaEnabled: controllerType === 'aruba' || controllerType === 'both',
        unifiControllerUrl: unifiUrl,
        unifiUsername,
        unifiPassword, // vazio = preserva o existente (servidor)
        unifiSite,
        unifiApiKey, // vazio = preserva o existente (servidor)
        unifiConsoleId,
        unifiSiteId,
        arubaControllerUrl: arubaUrl,
        arubaClientId,
        arubaClientSecret, // vazio = preserva o existente (servidor)
      })
      if (!silent) toast.success('Configurações salvas', { description: 'As configurações da controladora foram salvas com sucesso.' })
      return true
    } catch {
      showError('Erro ao salvar configurações')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setConnectionInfo(null)
    try {
      await handleSave(true)
      const result = await testUnifiConnectionV2(unifiUrl, unifiUsername, unifiPassword, unifiSite)
      if (result.success) {
        // Exibe o card visual com os detalhes da controladora
        setConnectionInfo(result.details ?? {})
        setConnectionStatus('ok')
        toast.success('Conexão estabelecida', { description: 'A controladora UniFi respondeu com sucesso.' })
      } else {
        setConnectionStatus('error')
        showError(result.message)
      }
    } catch (error) {
      setConnectionStatus('error')
      showError(error instanceof Error ? error.message : 'Falha inesperada ao testar conexão. Verifique os dados e tente novamente.')
    }
    setTesting(false)
  }

  const handleFetchSites = async () => {
    if (!unifiUrl || !unifiUsername || !unifiPassword) {
      showError('Preencha URL, usuário e senha primeiro')
      return
    }

    setLoadingSites(true)

    try {
      const result = await fetchUnifiSitesV2(unifiUrl, unifiUsername, unifiPassword)
      if (result.success && result.sites.length > 0) {
        setUnifiSites(result.sites.map(s => ({ id: s.id, name: s.name, role: 'admin' })))
        toast.success('Sites sincronizados', { description: `${result.sites.length} site(s) encontrado(s).` })
        // Auto-select first site if none selected
        if (!unifiSite || unifiSite === 'default') {
          setUnifiSite(result.sites[0].id)
        }
      } else {
        showError(result.error || 'Nenhum site encontrado')
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Falha ao buscar sites. Verifique as credenciais.')
    }

    setLoadingSites(false)
  }

  const handleFetchSiteInfo = async () => {
    if (!unifiUrl || !unifiUsername || !unifiPassword || !unifiSite) {
      showError('Preencha todos os campos e selecione um site')
      return
    }

    setLoadingInfo(true)

    try {
      const result = await fetchUnifiDetailsV2(unifiUrl, unifiUsername, unifiPassword, unifiSite)
      if (result.success && result.info) {
        setSiteInfo(result.info)
        toast.success('Informações carregadas', { description: 'Os detalhes do site foram atualizados.' })
      } else {
        showError(result.error || 'Falha ao buscar informações do site')
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Falha ao buscar informações. Verifique a conexão com o controller.')
    }

    setLoadingInfo(false)
  }

  const handleAuthorizeTestMac = async () => {
    if (!unifiUrl || !unifiUsername || !unifiPassword) {
      showError('Configure e salve as credenciais do UniFi antes de autorizar um MAC de teste.')
      return
    }
    setAuthorizingMac(true)
    try {
      const result = await authorizeTestMac(unifiUrl, unifiUsername, unifiPassword, unifiSite, testMac, 5)
      if (result.success) {
        toast.success('MAC autorizado', { description: result.message })
      } else {
        showError(result.message)
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Falha ao autorizar o MAC de teste.')
    }
    setAuthorizingMac(false)
  }

  // --- UniFi Cloud handlers ---

  const handleFetchConsoles = async () => {
    setLoadingConsoles(true)
    try {
      // Persiste a API key antes (para o fallback no servidor e para o teste E2E)
      await handleSave(true)
      const result = await fetchUnifiCloudConsoles(unifiApiKey || undefined)
      if (result.success && result.consoles.length > 0) {
        setCloudConsoles(result.consoles)
        setConnectionStatus('ok')
        toast.success('Consoles encontrados', { description: `${result.consoles.length} console(s) na conta.` })
        if (!unifiConsoleId) setUnifiConsoleId(result.consoles[0].id)
      } else {
        setConnectionStatus('error')
        showError(result.error || 'Nenhum console encontrado')
      }
    } catch (error) {
      setConnectionStatus('error')
      showError(error instanceof Error ? error.message : 'Falha ao buscar consoles.')
    }
    setLoadingConsoles(false)
  }

  const handleFetchCloudSites = async () => {
    if (!unifiConsoleId) {
      showError('Selecione um console primeiro.')
      return
    }
    setLoadingCloudSites(true)
    try {
      await handleSave(true)
      const result = await fetchUnifiCloudSites(unifiApiKey || undefined, unifiConsoleId)
      if (result.success && result.sites.length > 0) {
        setCloudSites(result.sites)
        toast.success('Sites sincronizados', { description: `${result.sites.length} site(s) encontrado(s).` })
        if (!unifiSiteId) setUnifiSiteId(result.sites[0].id)
      } else {
        showError(result.error || 'Nenhum site encontrado')
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Falha ao buscar sites.')
    }
    setLoadingCloudSites(false)
  }

  const handleAuthorizeTestMacCloud = async () => {
    if (!unifiConsoleId || !unifiSiteId) {
      showError('Selecione console e site antes de autorizar um MAC de teste.')
      return
    }
    setAuthorizingMac(true)
    try {
      await handleSave(true)
      const result = await authorizeTestMacCloud(unifiApiKey || undefined, unifiConsoleId, unifiSiteId, testMac, 5)
      if (result.success) {
        toast.success('MAC autorizado', { description: result.message })
      } else {
        showError(result.message)
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Falha ao autorizar o MAC de teste.')
    }
    setAuthorizingMac(false)
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const fullPortalUrl = `${portalUrl}/portal`
  const showUnifi = controllerType === 'unifi' || controllerType === 'both'
  const showAruba = controllerType === 'aruba' || controllerType === 'both'
  const showUnifiCloud = controllerType === 'unifi-cloud'

  // Portal-logs card, compartilhado por ambas as controladoras (Seção 5)
  const logsCard = (
    <SectionCard index={5} icon={Bug} title="Logs de Acesso ao Portal" accent="text-amber-400"
      description="Acompanhe os redirecionamentos recebidos das controladoras em tempo real (atualização automática a cada 5s)">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchPortalLogs(true)}
          disabled={loadingLogs || clearingLogs}
          className="transition-all duration-200"
        >
          {loadingLogs ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <RefreshCw className="w-4 h-4 sm:mr-2" />}
          <span className="hidden sm:inline">{loadingLogs ? 'Atualizando...' : 'Atualizar'}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={clearPortalLogs}
          disabled={clearingLogs || portalLogs.length === 0}
          className="transition-all duration-200"
        >
          {clearingLogs ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <Trash2 className="w-4 h-4 sm:mr-2" />}
          <span className="hidden sm:inline">{clearingLogs ? 'Limpando...' : 'Limpar'}</span>
        </Button>
      </div>
      {portalLogs.length === 0 ? (
        <EmptyState
          icon={Bug}
          title="Nenhum acesso registrado ainda"
          description="Conecte um dispositivo na rede WiFi Guest para que os redirecionamentos apareçam aqui."
        />
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {portalLogs.map((log, i) => (
            <div key={i} className="p-3 bg-background/50 rounded-lg border border-border/30 text-sm transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  log.controller === 'unifi' ? 'bg-blue-500/20 text-blue-400' :
                  log.controller === 'aruba' ? 'bg-green-500/20 text-green-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {log.controller === 'unifi' ? 'UniFi' : log.controller === 'aruba' ? 'Aruba' : 'Direto'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div>
                  <span className="text-muted-foreground">MAC:</span>{' '}
                  <span className={log.mac ? 'text-green-400 font-mono' : 'text-yellow-400'}>
                    {log.mac || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">IP:</span>{' '}
                  <span className="text-foreground font-mono">{log.ip || 'N/A'}</span>
                </div>
                {log.ssid && (
                  <div>
                    <span className="text-muted-foreground">SSID:</span>{' '}
                    <span className="text-foreground">{log.ssid}</span>
                  </div>
                )}
                {log.apName && (
                  <div>
                    <span className="text-muted-foreground">AP:</span>{' '}
                    <span className="text-foreground">{log.apName}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )

  return (
    <div className="space-y-6">
      {/* URL do Portal */}
      <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Wifi className="w-5 h-5 text-cyan-400" />
            URL do Portal Captivo
          </CardTitle>
          <CardDescription>
            Configure esta URL na sua controladora WiFi como External Portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-background/50 rounded-xl border border-cyan-500/20 mb-4">
            <p className="text-xs text-muted-foreground mb-2">URL do portal captivo</p>
            <code className="text-sm text-cyan-400 font-mono break-all">{fullPortalUrl}</code>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1 border-border/50 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all duration-200"
              onClick={() => {
                navigator.clipboard.writeText(fullPortalUrl)
                toast.success('URL copiada com sucesso!', { description: fullPortalUrl, duration: 3000 })
                setCopied('portal-url')
                setTimeout(() => setCopied(null), 2000)
              }}
            >
              {copied === 'portal-url' ? <Check className="w-4 h-4 mr-2 text-green-400" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied === 'portal-url' ? 'Copiado!' : 'Copiar URL'}
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-border/50 hover:border-primary/50 hover:text-primary hover:bg-primary/10 transition-all duration-200"
              onClick={() => window.open(fullPortalUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Portal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Seleção de Tipo de Controladora */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Server className="w-5 h-5 text-primary" />
            Tipo de Controladora
          </CardTitle>
          <CardDescription>Selecione o tipo de controladora WiFi que você utiliza</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CONTROLLER_OPTIONS.map((option) => {
              const isSelected = controllerType === option.value
              const Icon = option.icon
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setControllerType(option.value)}
                  className={`group relative overflow-hidden p-4 rounded-xl border-2 text-left transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    isSelected
                      ? 'border-primary bg-primary/10 -translate-y-0.5 shadow-md shadow-primary/10 ring-2 ring-primary/30'
                      : 'border-border/50 bg-secondary/30 hover:border-primary/50 hover:bg-secondary/60 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/5'
                  }`}
                >
                  <div
                    className={`absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all duration-200 ease-out ${
                      isSelected ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                    }`}
                  >
                    <Check className="h-3 w-3" />
                  </div>
                  <Icon
                    className={`mb-2 h-5 w-5 transition-colors duration-200 ${
                      isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                  />
                  <div className={`font-medium transition-colors duration-200 ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {option.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 text-pretty">{option.description}</div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {controllerType === 'none' ? (
        /* Estado sem controladora */
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-8 text-center">
            <Server className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Selecione um tipo de controladora acima para configurar a integração</p>
            <p className="text-sm text-muted-foreground/70 mt-2">
              O portal funcionará em modo manual, sem autorização automática de dispositivos
            </p>
          </CardContent>
        </Card>
      ) : showUnifiCloud ? (
        /* ============================================================= */
        /* UNIFI CLOUD — Site Manager API + Connector Proxy              */
        /* ============================================================= */
        <>
          <SectionCard index={1} icon={Globe} title="UniFi Cloud (API oficial)"
            description="Integração via api.ui.com — o portal libera clientes sem túnel/VPN para a rede local. Requer console UniFi OS com firmware recente e uma API key gerada em unifi.ui.com → Settings → API.">
            <div className="space-y-4">
              {/* API key */}
              <div className="space-y-2">
                <Label htmlFor="unifi-api-key" className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4" /> API Key
                </Label>
                <div className="relative">
                  <Input
                    id="unifi-api-key"
                    type={showApiKey ? 'text' : 'password'}
                    value={unifiApiKey}
                    onChange={(e) => setUnifiApiKey(e.target.value)}
                    placeholder={settings.hasUnifiApiKey ? '•••••••• (chave salva — deixe em branco para manter)' : 'Cole a API key do UniFi'}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowApiKey((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  A chave é criptografada em repouso e nunca retorna ao navegador.
                </p>
              </div>

              {/* Console */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Server className="w-4 h-4" /> Console</Label>
                <div className="flex gap-2">
                  <select
                    value={unifiConsoleId}
                    onChange={(e) => setUnifiConsoleId(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">{cloudConsoles.length ? 'Selecione um console' : (unifiConsoleId || 'Busque os consoles')}</option>
                    {cloudConsoles.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}{c.ip ? ` (${c.ip})` : ''}</option>
                    ))}
                    {unifiConsoleId && !cloudConsoles.some((c) => c.id === unifiConsoleId) && (
                      <option value={unifiConsoleId}>{unifiConsoleId} (salvo)</option>
                    )}
                  </select>
                  <Button variant="outline" onClick={handleFetchConsoles} disabled={loadingConsoles}>
                    {loadingConsoles ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <RefreshCw className="w-4 h-4 sm:mr-2" />}
                    <span className="hidden sm:inline">Buscar consoles</span>
                  </Button>
                </div>
              </div>

              {/* Site */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Wifi className="w-4 h-4" /> Site</Label>
                <div className="flex gap-2">
                  <select
                    value={unifiSiteId}
                    onChange={(e) => setUnifiSiteId(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">{cloudSites.length ? 'Selecione um site' : (unifiSiteId || 'Busque os sites')}</option>
                    {cloudSites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                    {unifiSiteId && !cloudSites.some((s) => s.id === unifiSiteId) && (
                      <option value={unifiSiteId}>{unifiSiteId} (salvo)</option>
                    )}
                  </select>
                  <Button variant="outline" onClick={handleFetchCloudSites} disabled={loadingCloudSites || !unifiConsoleId}>
                    {loadingCloudSites ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <RefreshCw className="w-4 h-4 sm:mr-2" />}
                    <span className="hidden sm:inline">Buscar sites</span>
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave()} disabled={saving} className="bg-primary hover:bg-primary/90">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Salvar configuração
                </Button>
              </div>
            </div>
          </SectionCard>

          {/* Diagnóstico: autorizar MAC de teste (ponta-a-ponta) */}
          <SectionCard index={2} icon={ShieldCheck} title="Diagnóstico" accent="text-emerald-400"
            description="Autoriza um MAC real por 5 min via Connector Proxy — valida credenciais de escrita de ponta a ponta.">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={testMac}
                onChange={(e) => setTestMac(e.target.value)}
                placeholder="aa:bb:cc:dd:ee:ff"
                className="flex-1"
              />
              <Button onClick={handleAuthorizeTestMacCloud} disabled={authorizingMac || !testMac.trim() || !unifiConsoleId || !unifiSiteId}>
                {authorizingMac ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <ShieldCheck className="w-4 h-4 sm:mr-2" />}
                <span className="hidden sm:inline">Autorizar MAC de teste</span>
              </Button>
            </div>
          </SectionCard>

          {logsCard}
        </>
      ) : (
        <>
          {/* ============================================================= */}
          {/* SEÇÃO 1 — Status da Integração                                */}
          {/* ============================================================= */}
          <SectionCard index={1} icon={Activity} title="Status da Integração"
            description="Visão geral do estado de cada componente da integração nesta sessão">
            <div className="grid gap-3 sm:grid-cols-2">
              <StatusRow icon={Globe} label="Portal Captivo" state="ok" detail="Endpoint publicado e ativo" />
              {showUnifi && (
                <StatusRow
                  icon={Router}
                  label="UniFi Controller"
                  state={connectionStatus}
                  detail={
                    connectionStatus === 'ok'
                      ? 'Último teste de conexão bem-sucedido'
                      : connectionStatus === 'error'
                      ? 'Último teste de conexão falhou'
                      : 'Conexão ainda não testada nesta sessão'
                  }
                />
              )}
              {showAruba && (
                <StatusRow
                  icon={Wifi}
                  label="Aruba Instant On"
                  state="ok"
                  detail="Integração por redirect + RADIUS (sem teste de API)"
                />
              )}
            </div>
          </SectionCard>

          {/* ============================================================= */}
          {/* SEÇÃO 2 — Informações da Controladora (somente leitura)        */}
          {/* ============================================================= */}
          <SectionCard index={2} icon={Info} title="Informações da Controladora"
            description="Dados obtidos da controladora (somente leitura). Use as ferramentas de diagnóstico para atualizar.">
            {showUnifi && (
              <div className="space-y-4">
                {connectionInfo ? (
                  (() => {
                    const statusRaw = (connectionInfo.status || 'online').toLowerCase()
                    const isOnline = !['offline', 'down', 'disconnected', 'error'].some((s) => statusRaw.includes(s))
                    const fmt = (v?: number) => (v === undefined || v === null ? '—' : String(v))
                    const statTiles = [
                      { label: 'Versão UniFi', value: connectionInfo.version ? `v${connectionInfo.version}` : '—' },
                      { label: 'Modelo da Controladora', value: connectionInfo.model || '—' },
                      { label: 'APs Conectados', value: fmt(connectionInfo.aps) },
                      { label: 'Switches', value: fmt(connectionInfo.switches) },
                      { label: 'Clientes Online', value: fmt(connectionInfo.clientsOnline) },
                      { label: 'Total de Sites', value: fmt(connectionInfo.totalSites) },
                      { label: 'Convidados Online', value: fmt(connectionInfo.guestsOnline) },
                    ]
                    return (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
                        {connectionInfo.siteName && (
                          <p className="text-sm text-muted-foreground">Site ativo: <span className="text-foreground font-medium">{connectionInfo.siteName}</span></p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
                            <p className="text-xs text-muted-foreground">Status</p>
                            <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
                              {isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          {statTiles.map((tile) => (
                            <div key={tile.label} className="rounded-xl border border-border/50 bg-secondary/30 p-3">
                              <p className="text-xs text-muted-foreground text-pretty">{tile.label}</p>
                              <p className="mt-1 text-lg font-semibold text-foreground truncate">{tile.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()
                ) : (
                  <EmptyState
                    icon={Router}
                    title="Sem dados da controladora UniFi"
                    description="Use “Testar Conexão” nas Ferramentas de Diagnóstico para carregar modelo, versão, APs, switches e clientes."
                  />
                )}

                {/* Detalhes do Cloud Gateway (após "Ver Detalhes") */}
                {siteInfo && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4 rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-4">
                    <div className="flex items-center gap-2">
                      <Router className="w-5 h-5 text-green-400" />
                      <span className="font-medium text-foreground">Cloud Gateway — {siteInfo.siteName}</span>
                    </div>
                    {siteInfo.gateway && (
                      <div className="p-4 bg-background/50 rounded-lg border border-border/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Server className="w-5 h-5 text-green-400" />
                            <span className="font-medium text-foreground">{siteInfo.gateway.name}</span>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            siteInfo.gateway.state === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {siteInfo.gateway.state === 'online' ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div><span className="text-muted-foreground">Modelo</span><p className="font-mono text-foreground">{siteInfo.gateway.model}</p></div>
                          <div><span className="text-muted-foreground">IP LAN</span><p className="font-mono text-foreground">{siteInfo.gateway.lanIp || siteInfo.gateway.ip}</p></div>
                          <div><span className="text-muted-foreground">IP WAN</span><p className="font-mono text-foreground">{siteInfo.gateway.wanIp || '-'}</p></div>
                          <div><span className="text-muted-foreground">Versão</span><p className="font-mono text-foreground">{siteInfo.gateway.version}</p></div>
                          <div><span className="text-muted-foreground">MAC</span><p className="font-mono text-foreground text-xs">{siteInfo.gateway.mac}</p></div>
                          <div><span className="text-muted-foreground">Uptime</span><p className="font-mono text-foreground">{formatUptime(siteInfo.gateway.uptime)}</p></div>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-background/50 rounded-lg border border-border/50 text-center">
                        <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-foreground">{siteInfo.clientCount}</p>
                        <p className="text-xs text-muted-foreground">Clientes Total</p>
                      </div>
                      <div className="p-3 bg-background/50 rounded-lg border border-border/50 text-center">
                        <Wifi className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-foreground">{siteInfo.guestCount}</p>
                        <p className="text-xs text-muted-foreground">Guests</p>
                      </div>
                      <div className="p-3 bg-background/50 rounded-lg border border-border/50 text-center">
                        <Server className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-foreground">{siteInfo.devices.length}</p>
                        <p className="text-xs text-muted-foreground">Dispositivos</p>
                      </div>
                      <div className="p-3 bg-background/50 rounded-lg border border-border/50 text-center">
                        <Globe className="w-5 h-5 text-green-400 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-foreground">{siteInfo.devices.filter((d) => d.state === 'online').length}</p>
                        <p className="text-xs text-muted-foreground">Online</p>
                      </div>
                    </div>
                    {siteInfo.devices.length > 1 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">Outros Dispositivos</h4>
                        <div className="space-y-2">
                          {siteInfo.devices.filter((d) => d.type !== 'ugw' && d.type !== 'udm' && d.type !== 'usg').map((device, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-background/30 rounded border border-border/30">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${device.state === 'online' ? 'bg-green-400' : 'bg-red-400'}`} />
                                <span className="text-sm text-foreground">{device.name}</span>
                                <span className="text-xs text-muted-foreground">({device.model})</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{device.ip}</span>
                                <span>{device.clients} clientes</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {showAruba && (
              <div className={`space-y-2 rounded-xl border border-border/50 bg-secondary/30 p-4 ${showUnifi ? 'mt-2' : ''}`}>
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-foreground">Aruba Instant On</span>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Método</dt><dd className="text-foreground">Redirect + RADIUS</dd></div>
                  <div><dt className="text-xs text-muted-foreground">API pública</dt><dd className="text-foreground">Não aplicável</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Autenticação</dt><dd className="text-foreground">FreeRADIUS externo</dd></div>
                </dl>
              </div>
            )}
          </SectionCard>

          {/* ============================================================= */}
          {/* SEÇÃO 3 — Configuração                                         */}
          {/* ============================================================= */}
          <SectionCard index={3} icon={Shield} title="Configuração" accent="text-blue-400"
            description="Credenciais e parâmetros de integração da(s) controladora(s)">
            {showUnifi && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Router className="h-4 w-4 text-blue-400" /> UniFi Controller
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-muted-foreground">URL do Controller</Label>
                    <Input
                      placeholder="https://192.168.1.1 ou https://unifi.seudominio.com"
                      value={unifiUrl}
                      onChange={(e) => setUnifiUrl(e.target.value)}
                      className="bg-secondary/50 border-border/50 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Usuário</Label>
                    <Input placeholder="admin" value={unifiUsername} onChange={(e) => setUnifiUsername(e.target.value)} className="bg-secondary/50 border-border/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Senha</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Senha do UniFi"
                        value={unifiPassword}
                        onChange={(e) => setUnifiPassword(e.target.value)}
                        className="bg-secondary/50 border-border/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-muted-foreground">Site / Dispositivo</Label>
                    <div className="flex gap-2">
                      {unifiSites.length > 0 ? (
                        <select
                          value={unifiSite}
                          onChange={(e) => setUnifiSite(e.target.value)}
                          className="flex-1 h-9 rounded-md border border-border/50 bg-secondary/50 px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {unifiSites.map((site) => (
                            <option key={site.id} value={site.id}>{site.name} ({site.id})</option>
                          ))}
                        </select>
                      ) : (
                        <Input placeholder="default" value={unifiSite} onChange={(e) => setUnifiSite(e.target.value)} className="flex-1 bg-secondary/50 border-border/50" />
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleFetchSites}
                        disabled={loadingSites || !unifiUrl || !unifiUsername || !unifiPassword}
                        className="shrink-0 transition-all duration-200"
                      >
                        {loadingSites ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        <span className="ml-2 hidden sm:inline">{loadingSites ? 'Sincronizando...' : 'Sincronizar Sites'}</span>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Clique em &quot;Sincronizar Sites&quot; para listar os dispositivos disponíveis</p>
                  </div>
                </div>
                <div className="pt-1">
                  <Button onClick={() => handleSave()} disabled={saving || testing || loadingInfo} className="bg-primary hover:bg-primary/90 transition-all duration-200">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    {saving ? 'Salvando...' : 'Salvar Configuração'}
                  </Button>
                </div>
                <CollapsibleSection title="Como configurar no UniFi">
                  <div className="text-sm text-muted-foreground space-y-3">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-bold shrink-0">1</div>
                      <p>Acesse seu UniFi Controller e vá em <strong className="text-foreground">Settings &gt; WiFi</strong></p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-bold shrink-0">2</div>
                      <p>Ative <strong className="text-foreground">Guest Hotspot</strong> na rede desejada</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-bold shrink-0">3</div>
                      <p>Selecione <strong className="text-foreground">External Portal Server</strong></p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-bold shrink-0">4</div>
                      <div>
                        <p>Cole a URL no campo <strong className="text-foreground">Custom Portal URL</strong>:</p>
                        <div className="flex items-center gap-2 mt-2 p-2 bg-secondary/30 rounded">
                          <code className="flex-1 text-cyan-400 font-mono text-xs">{fullPortalUrl}</code>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(fullPortalUrl, 'unifi-url')}>
                            {copied === 'unifi-url' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="pt-1">
                      <Button asChild variant="outline" size="sm" className="gap-2">
                        <a href="/docs/unifi" target="_blank" rel="noopener noreferrer">
                          Mais detalhes
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CollapsibleSection>
              </div>
            )}

            {showAruba && (
              <div className={`space-y-4 ${showUnifi ? 'border-t border-border/50 pt-4' : ''}`}>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Wifi className="h-4 w-4 text-green-400" /> HP Aruba Instant On
                </div>
                <div className="p-4 bg-background/50 rounded-lg border border-green-500/30 space-y-3">
                  <div>
                    <h4 className="font-medium text-foreground">Autenticação via RADIUS</h4>
                    <p className="text-sm text-muted-foreground">
                      Este portal autentica os convidados do Aruba Instant On exclusivamente por um servidor RADIUS externo (FreeRADIUS). No AP, use &quot;Autenticação de Convidado (padrão)&quot; e aponte o servidor RADIUS para a sua VPS.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg">
                    <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground">
                      O FreeRADIUS precisa estar instalado e configurado na sua VPS (veja docs/INSTALACAO-FREERADIUS.md). O modo &quot;Confirmação do Portal de Convidados&quot; não é suportado.
                    </span>
                  </div>
                </div>
                <div className="pt-1">
                  <Button onClick={() => handleSave()} disabled={saving} className="bg-primary hover:bg-primary/90 transition-all duration-200">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    {saving ? 'Salvando...' : 'Salvar Configuração'}
                  </Button>
                </div>
                <CollapsibleSection title="Passo a passo no App/Portal Aruba">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-sm font-bold shrink-0">1</div>
                      <div className="pt-0.5">
                        <p className="text-foreground font-medium">Acesse o Aruba Instant On</p>
                        <p className="text-sm text-muted-foreground">Use o app mobile ou <strong>portal.arubainstanton.com</strong></p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-sm font-bold shrink-0">2</div>
                      <div className="pt-0.5">
                        <p className="text-foreground font-medium">Selecione sua rede Guest</p>
                        <p className="text-sm text-muted-foreground">Vá em <strong>Redes</strong> e selecione a rede de visitantes</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-sm font-bold shrink-0">3</div>
                      <div className="pt-0.5">
                        <p className="text-foreground font-medium">Configure o Portal Captivo</p>
                        <p className="text-sm text-muted-foreground">Em <strong>Segurança &gt; Tipo de Portal</strong>, selecione <strong>Portal Captivo Externo</strong></p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-sm font-bold shrink-0">4</div>
                      <div className="pt-0.5">
                        <p className="text-foreground font-medium">Cole a URL do Portal</p>
                        <p className="text-sm text-muted-foreground mb-2">No campo <strong>URL do Servidor</strong>, cole:</p>
                        <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg border border-border/50">
                          <code className="flex-1 text-cyan-400 font-mono text-sm break-all">{fullPortalUrl}</code>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => copyToClipboard(fullPortalUrl, 'aruba-url')}>
                            {copied === 'aruba-url' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-sm font-bold shrink-0">5</div>
                      <div className="pt-0.5">
                        <p className="text-foreground font-medium">Adicione domínios permitidos</p>
                        <p className="text-sm text-muted-foreground mb-2">Em <strong>Domínios Permitidos</strong>, adicione seu domínio:</p>
                        <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg border border-border/50">
                          <code className="flex-1 text-cyan-400 font-mono text-sm">{portalUrl.replace('https://', '').replace('http://', '')}</code>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => copyToClipboard(portalUrl.replace('https://', '').replace('http://', ''), 'aruba-domain')}>
                            {copied === 'aruba-domain' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-sm font-bold shrink-0">6</div>
                      <div className="pt-0.5">
                        <p className="text-foreground font-medium">Salve as configurações</p>
                        <p className="text-sm text-muted-foreground">Pronto! O portal WiFi está configurado.</p>
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>
                <CollapsibleSection title="Configuração do servidor RADIUS">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Campos do portal externo:</p>
                      <ul className="space-y-1">
                        {[
                          ['Tipo', 'Externa'],
                          ['URL do portal', 'https://portal.centernet.inf.br/portal'],
                          ['URL de redirecionamento', 'https://www.google.com.br/'],
                          ['Domínios permitidos', 'portal.centernet.inf.br'],
                        ].map(([label, value]) => (
                          <li key={label} className="flex items-start gap-2 text-xs">
                            <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground"><span className="text-foreground">{label}:</span> {value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Seção Servidor RADIUS:</p>
                      <ul className="space-y-1">
                        {[
                          ['Servidor / Endereço IP', 'IP público da sua VPS (onde roda o FreeRADIUS)'],
                          ['Porta de autenticação', '1812'],
                          ['Porta de accounting', '1813'],
                          ['Segredo compartilhado', 'mesmo Shared Secret do clients.conf'],
                        ].map(([label, value]) => (
                          <li key={label} className="flex items-start gap-2 text-xs">
                            <Plus className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground"><span className="text-foreground">{label}:</span> {value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use a mesma grafia exata do domínio na URL do portal e em Domínios permitidos (<span className="text-foreground">portal.centernet.inf.br</span>), e prefira https. O AP precisa alcançar a VPS nas portas UDP 1812/1813.
                    </p>
                  </div>
                </CollapsibleSection>
                <CollapsibleSection title="Como funciona o fluxo e parâmetros recebidos">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg"><Wifi className="w-4 h-4 text-blue-400" /><span>Cliente conecta</span></div>
                      <span className="text-muted-foreground">→</span>
                      <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg"><Server className="w-4 h-4 text-green-400" /><span>Aruba redireciona</span></div>
                      <span className="text-muted-foreground">→</span>
                      <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg"><Shield className="w-4 h-4 text-cyan-400" /><span>Nosso Portal</span></div>
                      <span className="text-muted-foreground">→</span>
                      <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg"><CheckCircle className="w-4 h-4 text-green-400" /><span>Acesso liberado</span></div>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>Quando o Aruba redireciona para o portal, envia estes parâmetros:</p>
                      <div className="p-3 bg-background/50 rounded-lg font-mono text-xs overflow-x-auto">
                        <code className="text-cyan-400">{fullPortalUrl}?cmd=login&amp;mac=XX:XX:XX&amp;switchip=X.X.X.X</code>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div><code className="text-cyan-400">mac</code> - MAC do cliente</div>
                        <div><code className="text-cyan-400">switchip</code> - IP do AP</div>
                        <div><code className="text-cyan-400">cmd</code> - Comando (login)</div>
                        <div><code className="text-cyan-400">url</code> - URL original</div>
                      </div>
                    </div>
                  </div>
                </CollapsibleSection>
              </div>
            )}
          </SectionCard>

          {/* ============================================================= */}
          {/* SEÇÃO 4 — Ferramentas de Diagnóstico                          */}
          {/* ============================================================= */}
          <SectionCard index={4} icon={ShieldCheck} title="Ferramentas de Diagnóstico" accent="text-emerald-400"
            description="Valide a integração de ponta a ponta antes de colocar em produção">
            {showUnifi ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleTest}
                    disabled={saving || testing || loadingInfo || !unifiUrl || !unifiUsername || !unifiPassword}
                    variant="outline"
                    className="transition-all duration-200"
                  >
                    {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                    {testing ? 'Testando...' : 'Testar Conexão'}
                  </Button>
                  <Button
                    onClick={handleFetchSiteInfo}
                    disabled={saving || testing || loadingInfo || !unifiUrl || !unifiUsername || !unifiPassword || !unifiSite}
                    variant="outline"
                    className="transition-all duration-200"
                  >
                    {loadingInfo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Info className="w-4 h-4 mr-2" />}
                    {loadingInfo ? 'Carregando...' : 'Ver Detalhes'}
                  </Button>
                </div>

                {/* Autorizar MAC de teste */}
                <div className="rounded-xl border border-border/50 bg-secondary/30 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-medium text-foreground">Autorizar MAC de teste</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-pretty">
                    Executa uma autorização real (5 min) na controladora UniFi para validar que as credenciais têm permissão de liberação de convidados.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="aa:bb:cc:dd:ee:ff"
                      value={testMac}
                      onChange={(e) => setTestMac(e.target.value)}
                      className="flex-1 bg-secondary/50 border-border/50 font-mono"
                    />
                    <Button
                      onClick={handleAuthorizeTestMac}
                      disabled={authorizingMac || !testMac.trim() || !unifiUrl || !unifiUsername || !unifiPassword}
                      className="bg-emerald-600 hover:bg-emerald-600/90 text-white transition-all duration-200 shrink-0"
                    >
                      {authorizingMac ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                      {authorizingMac ? 'Autorizando...' : 'Autorizar MAC'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Wifi}
                title="Sem diagnóstico por API para Aruba"
                description="O Aruba Instant On usa redirect + RADIUS e não expõe API de autorização. Valide a integração observando os redirecionamentos na seção de Logs."
              />
            )}
          </SectionCard>

          {/* ============================================================= */}
          {/* SEÇÃO 5 — Logs                                                */}
          {/* ============================================================= */}
          {logsCard}
        </>
      )}
    </div>
  )
}
