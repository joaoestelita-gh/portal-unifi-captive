'use client'

import { useState } from 'react'
import { Wifi, User, Key, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { registerWifiUser, loginWifiUser, loginWithVoucher } from '@/app/actions/wifi'
import type { ArubaRedirectParams } from '@/lib/aruba'

interface PortalSettings {
  portalTitle: string | null
  portalSubtitle: string | null
  logoUrl: string | null
  backgroundUrl: string | null
  backgroundColor: string | null
  primaryColor: string | null
  termsText: string | null
}

interface CaptivePortalFormProps {
  settings: PortalSettings
  macAddress: string
  redirectUrl?: string
  apMac?: string
  ssid?: string
  detectedController?: string | null
  arubaParams?: ArubaRedirectParams
}

export function CaptivePortalForm({ settings, macAddress, redirectUrl = 'https://google.com', ssid, detectedController, arubaParams }: CaptivePortalFormProps) {
  const [activeTab, setActiveTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  
  // Register form
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPhone, setRegisterPhone] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('')
  
  // Voucher form
  const [voucherCode, setVoucherCode] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const result = await loginWifiUser(loginEmail, loginPassword, macAddress, detectedController, arubaParams)
    
    if (result.success) {
      // Build success page URL with parameters
      const successUrl = new URL('/portal/success', window.location.origin)
      successUrl.searchParams.set('minutes', String(result.sessionMinutes))
      successUrl.searchParams.set('name', result.userName || 'Visitante')
      if (redirectUrl && redirectUrl !== 'http://conectar') {
        successUrl.searchParams.set('redirect', redirectUrl)
      }
      
      // If controller returned a redirect URL (e.g., Aruba), use that
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl
      } else {
        window.location.href = successUrl.toString()
      }
    } else {
      setError(result.error || 'Erro ao fazer login')
    }
    
    setLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    if (registerPassword !== registerConfirmPassword) {
      setError('As senhas não coincidem')
      setLoading(false)
      return
    }
    
    if (registerPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      setLoading(false)
      return
    }
    
    const result = await registerWifiUser({
      name: registerName,
      email: registerEmail,
      phone: registerPhone || undefined,
      password: registerPassword,
    })
    
    if (result.success) {
      if (result.requiresApproval) {
        setSuccess('Cadastro realizado! Aguarde a aprovação do administrador.')
      } else {
        setSuccess('Cadastro realizado! Agora você pode fazer login.')
        setActiveTab('login')
      }
    } else {
      setError(result.error || 'Erro ao cadastrar')
    }
    
    setLoading(false)
  }

  const handleVoucher = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const result = await loginWithVoucher(voucherCode, macAddress, detectedController, arubaParams)
    
    if (result.success) {
      // Build success page URL with parameters
      const successUrl = new URL('/portal/success', window.location.origin)
      successUrl.searchParams.set('minutes', String(result.sessionMinutes))
      successUrl.searchParams.set('name', 'Visitante')
      if (redirectUrl && redirectUrl !== 'http://conectar') {
        successUrl.searchParams.set('redirect', redirectUrl)
      }
      
      // If controller returned a redirect URL (e.g., Aruba), use that
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl
      } else {
        window.location.href = successUrl.toString()
      }
    } else {
      setError(result.error || 'Código inválido')
    }
    
    setLoading(false)
  }

  const primaryColor = settings.primaryColor || '#3b82f6'

  // Background priority: custom image > solid color > default gradient
  const baseBgClass = 'min-h-screen flex items-center justify-center p-4'
  const bgClass = settings.backgroundUrl
    ? `${baseBgClass} bg-cover bg-center`
    : settings.backgroundColor
      ? baseBgClass
      : `${baseBgClass} bg-gradient-to-br from-background via-muted to-background`
  const bgStyle = settings.backgroundUrl
    ? { backgroundImage: `url(${settings.backgroundUrl})` }
    : settings.backgroundColor
      ? { backgroundColor: settings.backgroundColor }
      : undefined

  if (success) {
    return (
      <div className={bgClass} style={bgStyle}>
        <Card className="w-full max-w-md border-0 shadow-2xl bg-card/95 backdrop-blur">
          <CardContent className="pt-8 pb-8 text-center">
            <div 
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              <Wifi className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Conectado!</h2>
            <p className="text-muted-foreground">{success}</p>
            <p className="text-sm text-muted-foreground mt-4">Redirecionando...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={bgClass} style={bgStyle}>
      <Card className="w-full max-w-md border-0 shadow-2xl bg-card/95 backdrop-blur">
        <CardHeader className="text-center pb-2">
          {settings.logoUrl ? (
            <img 
              src={settings.logoUrl} 
              alt="Logo" 
              className="h-16 mx-auto mb-4 object-contain"
            />
          ) : (
            <div 
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              <Wifi className="w-8 h-8 text-white" />
            </div>
          )}
          <CardTitle className="text-2xl font-bold text-foreground">
            {settings.portalTitle || 'WiFi Gratuito'}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {ssid ? `Rede: ${ssid}` : (settings.portalSubtitle || 'Conecte-se à nossa rede')}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {!macAddress && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600 dark:text-amber-400 text-sm">
              Aviso: MAC address não detectado. O acesso pode não ser autorizado automaticamente.
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="login" className="text-sm">Entrar</TabsTrigger>
              <TabsTrigger value="register" className="text-sm">Cadastrar</TabsTrigger>
              <TabsTrigger value="voucher" className="text-sm">Código</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-foreground">Email</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-10"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-foreground">Senha</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Sua senha"
                      className="pl-10"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  style={{ backgroundColor: primaryColor }}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  Conectar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name" className="text-foreground">Nome completo</Label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="Seu nome"
                    className="!bg-white !text-foreground !border-slate-300 placeholder:!text-muted-foreground"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-foreground">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="seu@email.com"
                    className="!bg-white !text-foreground !border-slate-300 placeholder:!text-muted-foreground"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-phone" className="text-foreground">Telefone (opcional)</Label>
                  <Input
                    id="register-phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    className="!bg-white !text-foreground !border-slate-300 placeholder:!text-muted-foreground"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-foreground">Senha</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    className="!bg-white !text-foreground !border-slate-300 placeholder:!text-muted-foreground"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-confirm" className="text-foreground">Confirmar senha</Label>
                  <Input
                    id="register-confirm"
                    type="password"
                    placeholder="Confirme sua senha"
                    className="!bg-white !text-foreground !border-slate-300 placeholder:!text-muted-foreground"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  style={{ backgroundColor: primaryColor }}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  Cadastrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="voucher">
              <form onSubmit={handleVoucher} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="voucher-code" className="text-foreground">Código de acesso</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="voucher-code"
                      type="text"
                      placeholder="Digite o código"
                      className="pl-10 uppercase font-mono tracking-wider"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Insira o código fornecido pelo estabelecimento
                </p>
                <Button 
                  type="submit" 
                  className="w-full"
                  style={{ backgroundColor: primaryColor }}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  Conectar
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {settings.termsText && (
            <p className="text-xs text-muted-foreground text-center mt-6">
              Ao conectar, você concorda com os{' '}
              <button 
                type="button"
                className="underline hover:text-foreground text-muted-foreground"
                onClick={() => alert(settings.termsText)}
              >
                termos de uso
              </button>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
