'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Check, Wifi, Shield, Eye, EyeOff, Loader2, CheckCircle, XCircle, Server, RefreshCw, Info, Router, Globe, Users, Bug, Trash2, Plus } from 'lucide-react'
import { updateControllerSettings, testControllerConnection, fetchUnifiSites, fetchUnifiSiteInfo } from '@/app/actions/wifi'

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
  arubaControllerUrl?: string | null
  arubaClientId?: string | null
  arubaClientSecret?: string | null
  arubaAuthMode?: string | null
}

interface ControllerSetupProps {
  portalUrl: string
  settings: ControllerSettings
}

export function ControllerSetup({ portalUrl, settings }: ControllerSetupProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // Controller type
  const [controllerType, setControllerType] = useState<'none' | 'unifi' | 'aruba' | 'both'>(
    (settings.controllerType as 'none' | 'unifi' | 'aruba' | 'both') || 'none'
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
      version: string
      state: string
      clients: number
      guests: number
    }>
  } | null>(null)

  // HP Aruba Instant On states
  const [arubaUrl, setArubaUrl] = useState(settings.arubaControllerUrl || '')
  const [arubaClientId, setArubaClientId] = useState(settings.arubaClientId || '')
  const [arubaClientSecret, setArubaClientSecret] = useState(settings.arubaClientSecret || '')
  const [arubaAuthMode, setArubaAuthMode] = useState(settings.arubaAuthMode || 'confirmation')

  // Debug logs state
  const [portalLogs, setPortalLogs] = useState<PortalLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  const fetchPortalLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch('/api/debug/portal-logs')
      const data = await res.json()
      setPortalLogs(data.logs || [])
    } catch (error) {
      console.error('Error fetching portal logs:', error)
    }
    setLoadingLogs(false)
  }, [])

  const clearPortalLogs = async () => {
    try {
      await fetch('/api/debug/portal-logs', { method: 'DELETE' })
      setPortalLogs([])
    } catch (error) {
      console.error('Error clearing logs:', error)
    }
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
    setTimeout(() => setCopied(null), 2000)
  }

  const handleSave = async () => {
    setSaving(true)
    setTestResult(null)
    try {
      await updateControllerSettings({
        controllerType,
        unifiEnabled: controllerType === 'unifi' || controllerType === 'both',
        arubaEnabled: controllerType === 'aruba' || controllerType === 'both',
        unifiControllerUrl: unifiUrl,
        unifiUsername,
        unifiPassword,
        unifiSite,
        arubaControllerUrl: arubaUrl,
        arubaClientId,
        arubaClientSecret,
        arubaAuthMode,
      })
      setTestResult({ success: true, message: 'Configuracoes salvas com sucesso!' })
    } catch {
      setTestResult({ success: false, message: 'Erro ao salvar configuracoes' })
    }
    setSaving(false)
  }

const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      await handleSave()
      const result = await testControllerConnection(controllerType)
      if (result.success) {
        setTestResult({ success: true, message: result.message || 'Conexao estabelecida!' })
      } else {
        setTestResult({ success: false, message: result.error || 'Falha na conexao' })
      }
    } catch {
      setTestResult({ success: false, message: 'Erro ao testar conexao' })
    }
    setTesting(false)
  }

  const handleFetchSites = async () => {
    if (!unifiUrl || !unifiUsername || !unifiPassword) {
      setTestResult({ success: false, message: 'Preencha URL, usuario e senha primeiro' })
      return
    }
    
    setLoadingSites(true)
    setTestResult(null)
    
    try {
      const result = await fetchUnifiSites(unifiUrl, unifiUsername, unifiPassword)
      if (result.success && result.sites.length > 0) {
        setUnifiSites(result.sites)
        setTestResult({ success: true, message: `${result.sites.length} site(s) encontrado(s)!` })
        // Auto-select first site if none selected
        if (!unifiSite || unifiSite === 'default') {
          setUnifiSite(result.sites[0].id)
        }
      } else {
        setTestResult({ success: false, message: result.error || 'Nenhum site encontrado' })
      }
    } catch {
      setTestResult({ success: false, message: 'Erro ao buscar sites' })
    }
    
setLoadingSites(false)
  }

  const handleFetchSiteInfo = async () => {
    if (!unifiUrl || !unifiUsername || !unifiPassword || !unifiSite) {
      setTestResult({ success: false, message: 'Preencha todos os campos e selecione um site' })
      return
    }
    
    setLoadingInfo(true)
    setTestResult(null)
    
    try {
      const result = await fetchUnifiSiteInfo(unifiUrl, unifiUsername, unifiPassword, unifiSite)
      if (result.success && result.info) {
        setSiteInfo(result.info)
        setTestResult({ success: true, message: 'Informacoes carregadas!' })
      } else {
        setTestResult({ success: false, message: result.error || 'Erro ao buscar informacoes' })
      }
    } catch {
      setTestResult({ success: false, message: 'Erro ao buscar informacoes' })
    }
    
    setLoadingInfo(false)
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
          <div className="flex items-center gap-2 p-3 bg-background/50 rounded-lg border border-border">
            <code className="flex-1 text-sm text-cyan-400 font-mono">{fullPortalUrl}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(fullPortalUrl, 'portal-url')}
            >
              {copied === 'portal-url' ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Selecao de Tipo de Controladora */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Server className="w-5 h-5 text-primary" />
            Tipo de Controladora
          </CardTitle>
          <CardDescription>
            Selecione o tipo de controladora WiFi que voce utiliza
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setControllerType('none')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                controllerType === 'none'
                  ? 'border-primary bg-primary/10'
                  : 'border-border/50 hover:border-border bg-secondary/30'
              }`}
            >
              <div className="font-medium text-foreground">Nenhuma</div>
              <div className="text-xs text-muted-foreground mt-1">Autorizacao manual</div>
            </button>
            <button
              onClick={() => setControllerType('unifi')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                controllerType === 'unifi'
                  ? 'border-primary bg-primary/10'
                  : 'border-border/50 hover:border-border bg-secondary/30'
              }`}
            >
              <div className="font-medium text-foreground">UniFi</div>
              <div className="text-xs text-muted-foreground mt-1">Cloud Key, UDM</div>
            </button>
            <button
              onClick={() => setControllerType('aruba')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                controllerType === 'aruba'
                  ? 'border-primary bg-primary/10'
                  : 'border-border/50 hover:border-border bg-secondary/30'
              }`}
            >
              <div className="font-medium text-foreground">HP Aruba</div>
              <div className="text-xs text-muted-foreground mt-1">Instant On</div>
            </button>
            <button
              onClick={() => setControllerType('both')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                controllerType === 'both'
                  ? 'border-primary bg-primary/10'
                  : 'border-border/50 hover:border-border bg-secondary/30'
              }`}
            >
              <div className="font-medium text-foreground">Ambas</div>
              <div className="text-xs text-muted-foreground mt-1">UniFi + Aruba</div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Mensagem de resultado */}
      {testResult && (
        <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
          testResult.success 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {testResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {testResult.message}
        </div>
      )}

      {/* Configuracoes UniFi */}
      {(controllerType === 'unifi' || controllerType === 'both') && (
        <>
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Shield className="w-5 h-5 text-blue-400" />
                Configuracoes UniFi Controller
              </CardTitle>
              <CardDescription>
                Dados de acesso ao seu UniFi Controller para autorizacao automatica
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <Label className="text-muted-foreground">Usuario</Label>
                  <Input
                    placeholder="admin"
                    value={unifiUsername}
                    onChange={(e) => setUnifiUsername(e.target.value)}
                    className="bg-secondary/50 border-border/50"
                  />
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
                          <option key={site.id} value={site.id}>
                            {site.name} ({site.id})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        placeholder="default"
                        value={unifiSite}
                        onChange={(e) => setUnifiSite(e.target.value)}
                        className="flex-1 bg-secondary/50 border-border/50"
                      />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleFetchSites}
                      disabled={loadingSites || !unifiUrl || !unifiUsername || !unifiPassword}
                      className="shrink-0"
                    >
                      {loadingSites ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span className="ml-2 hidden sm:inline">Buscar Sites</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clique em &quot;Buscar Sites&quot; para listar os dispositivos disponiveis
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handleSave} 
                  disabled={saving || testing}
                  className="bg-primary hover:bg-primary/90"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Salvar
                </Button>
                <Button 
                  onClick={handleTest} 
                  disabled={saving || testing || !unifiUrl || !unifiUsername || !unifiPassword}
                  variant="outline"
                >
                  {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                  Testar Conexao
                </Button>
                <Button 
                  onClick={handleFetchSiteInfo} 
                  disabled={loadingInfo || !unifiUrl || !unifiUsername || !unifiPassword || !unifiSite}
                  variant="outline"
                >
                  {loadingInfo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Info className="w-4 h-4 mr-2" />}
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Informacoes do Cloud Gateway */}
          {siteInfo && (
            <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Router className="w-5 h-5 text-green-400" />
                  Informacoes do Cloud Gateway
                </CardTitle>
                <CardDescription>
                  Site: {siteInfo.siteName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Gateway Principal */}
                {siteInfo.gateway && (
                  <div className="p-4 bg-background/50 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Server className="w-5 h-5 text-green-400" />
                        <span className="font-medium text-foreground">{siteInfo.gateway.name}</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        siteInfo.gateway.state === 'online' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {siteInfo.gateway.state === 'online' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Modelo</span>
                        <p className="font-mono text-foreground">{siteInfo.gateway.model}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">IP LAN</span>
                        <p className="font-mono text-foreground">{siteInfo.gateway.lanIp || siteInfo.gateway.ip}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">IP WAN</span>
                        <p className="font-mono text-foreground">{siteInfo.gateway.wanIp || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Versao</span>
                        <p className="font-mono text-foreground">{siteInfo.gateway.version}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">MAC</span>
                        <p className="font-mono text-foreground text-xs">{siteInfo.gateway.mac}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Uptime</span>
                        <p className="font-mono text-foreground">{formatUptime(siteInfo.gateway.uptime)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Estatisticas */}
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
                    <p className="text-2xl font-bold text-foreground">
                      {siteInfo.devices.filter(d => d.state === 'online').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Online</p>
                  </div>
                </div>

                {/* Lista de Dispositivos */}
                {siteInfo.devices.length > 1 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">Outros Dispositivos</h4>
                    <div className="space-y-2">
                      {siteInfo.devices.filter(d => d.type !== 'ugw' && d.type !== 'udm' && d.type !== 'usg').map((device, i) => (
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
              </CardContent>
            </Card>
          )}

          {/* Instrucoes UniFi */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base text-foreground">Como configurar no UniFi</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-bold shrink-0">1</div>
                <p>Acesse seu UniFi Controller e va em <strong className="text-foreground">Settings &gt; WiFi</strong></p>
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
            </CardContent>
          </Card>

          {/* Debug Logs UniFi */}
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Bug className="w-5 h-5 text-amber-400" />
                  Logs de Acesso ao Portal
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={fetchPortalLogs} disabled={loadingLogs}>
                    {loadingLogs ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearPortalLogs}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                Acompanhe os redirecionamentos recebidos do UniFi em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              {portalLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bug className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum acesso registrado ainda.</p>
                  <p className="text-xs mt-1">Conecte um dispositivo na rede WiFi Guest para testar.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {portalLogs.map((log, i) => (
                    <div key={i} className="p-3 bg-background/50 rounded-lg border border-border/30 text-sm">
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
            </CardContent>
          </Card>
        </>
      )}

      {/* Configuracoes HP Aruba Instant On */}
      {(controllerType === 'aruba' || controllerType === 'both') && (
        <>
          {/* Instrucoes HP Aruba - Principal */}
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Shield className="w-5 h-5 text-green-400" />
                Configurar HP Aruba Instant On
              </CardTitle>
              <CardDescription>
                O Aruba Instant On usa o metodo de Portal Captivo Externo via redirect
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Seletor de modo de autenticacao Aruba */}
              <div className="p-4 bg-background/50 rounded-lg border border-green-500/30 space-y-3">
                <div>
                  <h4 className="font-medium text-foreground">Modo de autenticacao</h4>
                  <p className="text-sm text-muted-foreground">
                    Escolha o modo que esta configurado no AP (Redes &rarr; Portal do convidado &rarr; Autenticacao). Os dois lados precisam coincidir.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setArubaAuthMode('confirmation')}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      arubaAuthMode === 'confirmation'
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-border bg-background/50 hover:border-green-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {arubaAuthMode === 'confirmation' && <CheckCircle className="w-4 h-4 text-green-400" />}
                      <span className="font-medium text-foreground">Confirmacao (padrao)</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      &quot;Confirmacao do Portal de Convidados&quot;. Nao precisa de servidor RADIUS. Recomendado para comecar.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setArubaAuthMode('radius')}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      arubaAuthMode === 'radius'
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-border bg-background/50 hover:border-green-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {arubaAuthMode === 'radius' && <CheckCircle className="w-4 h-4 text-green-400" />}
                      <span className="font-medium text-foreground">RADIUS</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      &quot;Autenticacao de Convidado&quot;. Exige um servidor FreeRADIUS na VPS (veja docs/INSTALACAO-FREERADIUS.md).
                    </p>
                  </button>
                </div>
                {arubaAuthMode === 'confirmation' && (
                  <div className="flex items-start gap-2 p-3 bg-green-500/10 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground">
                      No AP, selecione &quot;Confirmacao do Portal de Convidados&quot; e adicione o dominio do portal em &quot;Dominios permitidos&quot;.
                    </span>
                  </div>
                )}
                {arubaAuthMode === 'radius' && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg">
                      <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-foreground">
                        No AP, selecione &quot;Autenticacao de Convidado (padrao)&quot; e aponte o servidor RADIUS para o IP da sua VPS. O FreeRADIUS precisa estar configurado (veja docs/INSTALACAO-FREERADIUS.md).
                      </span>
                    </div>

                    {/* O que muda na tela do Aruba ao escolher RADIUS */}
                    <div className="p-3 rounded-lg border border-border bg-background/50 space-y-3">
                      <p className="text-xs font-medium text-foreground">
                        Na tela do Aruba (Portal do convidado &rarr; Autenticacao), o que muda:
                      </p>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">
                          Campos do portal externo (continuam iguais ao modo Confirmacao):
                        </p>
                        <ul className="space-y-1">
                          {[
                            ['Tipo', 'Externa'],
                            ['URL do portal', 'https://portal.centerent.inf.br/portal'],
                            ['URL de redirecionamento', 'https://www.google.com.br/'],
                            ['Dominios permitidos', 'portal.centerent.inf.br'],
                          ].map(([label, value]) => (
                            <li key={label} className="flex items-start gap-2 text-xs">
                              <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                              <span className="text-muted-foreground">
                                <span className="text-foreground">{label}:</span> {value}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">
                          Campos novos que aparecem (secao Servidor RADIUS):
                        </p>
                        <ul className="space-y-1">
                          {[
                            ['Servidor / Endereco IP', 'IP publico da sua VPS (onde roda o FreeRADIUS)'],
                            ['Porta de autenticacao', '1812'],
                            ['Porta de accounting', '1813'],
                            ['Segredo compartilhado', 'mesmo Shared Secret do clients.conf'],
                          ].map(([label, value]) => (
                            <li key={label} className="flex items-start gap-2 text-xs">
                              <Plus className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <span className="text-muted-foreground">
                                <span className="text-foreground">{label}:</span> {value}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Use a mesma grafia exata do dominio na URL do portal e em Dominios permitidos (cuidado com <span className="text-foreground">centerent</span> vs <span className="text-foreground">centernet</span>), e prefira https. O AP precisa alcancar a VPS nas portas UDP 1812/1813.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-background/50 rounded-lg border border-green-500/30">
                <p className="text-sm text-muted-foreground mb-3">
                  O Aruba Instant On nao possui API publica. A integracao funciona via <strong className="text-foreground">redirect</strong>: 
                  quando o cliente conecta ao WiFi, o Aruba redireciona para nosso portal, e apos o login, 
                  redirecionamos de volta para liberar o acesso.
                </p>
                <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                  <span className="text-sm text-foreground">Nenhuma configuracao de API necessaria neste painel</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Siga os passos abaixo no App ou Portal Aruba:</h4>
                
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
                    <p className="text-sm text-muted-foreground">Va em <strong>Redes</strong> e selecione a rede de visitantes</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-sm font-bold shrink-0">3</div>
                  <div className="pt-0.5">
                    <p className="text-foreground font-medium">Configure o Portal Captivo</p>
                    <p className="text-sm text-muted-foreground">Em <strong>Seguranca &gt; Tipo de Portal</strong>, selecione <strong>Portal Captivo Externo</strong></p>
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
                    <p className="text-foreground font-medium">Adicione dominios permitidos</p>
                    <p className="text-sm text-muted-foreground mb-2">Em <strong>Dominios Permitidos</strong>, adicione seu dominio:</p>
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
                    <p className="text-foreground font-medium">Salve as configuracoes</p>
                    <p className="text-sm text-muted-foreground">Pronto! O portal WiFi esta configurado.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="bg-primary hover:bg-primary/90"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Salvar Configuracao
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Como funciona */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base text-foreground">Como funciona o fluxo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                  <Wifi className="w-4 h-4 text-blue-400" />
                  <span>Cliente conecta</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                  <Server className="w-4 h-4 text-green-400" />
                  <span>Aruba redireciona</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>Nosso Portal</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Acesso liberado</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parametros Aruba */}
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-foreground">Parametros recebidos do Aruba</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Quando o Aruba redireciona para o portal, envia estes parametros:</p>
              <div className="p-3 bg-background/50 rounded-lg font-mono text-xs overflow-x-auto">
                <code className="text-cyan-400">{fullPortalUrl}?cmd=login&amp;mac=XX:XX:XX&amp;switchip=X.X.X.X</code>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div><code className="text-cyan-400">mac</code> - MAC do cliente</div>
                <div><code className="text-cyan-400">switchip</code> - IP do AP</div>
                <div><code className="text-cyan-400">cmd</code> - Comando (login)</div>
                <div><code className="text-cyan-400">url</code> - URL original</div>
              </div>
            </CardContent>
          </Card>

          {/* Debug Logs Aruba */}
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Bug className="w-5 h-5 text-amber-400" />
                  Logs de Acesso ao Portal
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={fetchPortalLogs} disabled={loadingLogs}>
                    {loadingLogs ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearPortalLogs}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                Acompanhe os redirecionamentos recebidos do Aruba Instant On em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              {portalLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bug className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum acesso registrado ainda.</p>
                  <p className="text-xs mt-1">Conecte um dispositivo na rede WiFi Guest para testar.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {portalLogs.map((log, i) => (
                    <div key={i} className="p-3 bg-background/50 rounded-lg border border-border/30 text-sm">
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
            </CardContent>
          </Card>
        </>
      )}

      {/* Quando nenhum selecionado */}
      {controllerType === 'none' && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-8 text-center">
            <Server className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Selecione um tipo de controladora acima para configurar a integracao</p>
            <p className="text-sm text-muted-foreground/70 mt-2">
              O portal funcionara em modo manual, sem autorizacao automatica de dispositivos
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
