'use client'

import { useState } from 'react'
import { Wifi, User, Key, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { registerWifiUser, loginWifiUser, loginWithVoucher } from '@/app/actions/wifi'
import type { ArubaRedirectParams } from '@/lib/aruba'

interface PortalSettings {
  portalTitle: string | null
  portalSubtitle: string | null
  logoUrl: string | null
  backgroundUrl: string | null
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

  // Terms modal
  const [termsOpen, setTermsOpen] = useState(false)

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
      setError(result.error || 'Codigo invalido')
    }
    
    setLoading(false)
  }

  const primaryColor = settings.primaryColor || '#3b82f6'

  // Custom background image (falls back to the default gradient when empty)
  const bgClass = settings.backgroundUrl
    ? 'min-h-screen flex items-center justify-center p-4 bg-cover bg-center'
    : 'min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
  const bgStyle = settings.backgroundUrl
    ? { backgroundImage: `url(${settings.backgroundUrl})` }
    : undefined

  if (success) {
    return (
      <div className={bgClass} style={bgStyle}>
        <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur">
          <CardContent className="pt-8 pb-8 text-center">
            <div 
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              <Wifi className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Conectado!</h2>
            <p className="text-slate-600">{success}</p>
            <p className="text-sm text-slate-500 mt-4">Redirecionando...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={bgClass} style={bgStyle}>
      <Card className="w-full max-w-md border-0 shadow-2xl bg-white/95 backdrop-blur">
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
          <CardTitle className="text-2xl font-bold text-slate-900">
            {settings.portalTitle || 'WiFi Gratuito'}
          </CardTitle>
          <CardDescription className="text-slate-600">
            {ssid ? `Rede: ${ssid}` : (settings.portalSubtitle || 'Conecte-se à nossa rede')}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {!macAddress && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
              Aviso: MAC address nao detectado. O acesso pode nao ser autorizado automaticamente.
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
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
                  <Label htmlFor="login-email" className="text-slate-700">Email</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-10 !bg-white !text-slate-900 !border-slate-300 placeholder:!text-slate-400"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-slate-700">Senha</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Sua senha"
                      className="pl-10 !bg-white !text-slate-900 !border-slate-300 placeholder:!text-slate-400"
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
                  <Label htmlFor="register-name" className="text-slate-700">Nome completo</Label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="Seu nome"
                    className="!bg-white !text-slate-900 !border-slate-300 placeholder:!text-slate-400"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-slate-700">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="seu@email.com"
                    className="!bg-white !text-slate-900 !border-slate-300 placeholder:!text-slate-400"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-phone" className="text-slate-700">Telefone (opcional)</Label>
                  <Input
                    id="register-phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    className="!bg-white !text-slate-900 !border-slate-300 placeholder:!text-slate-400"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-slate-700">Senha</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Minimo 6 caracteres"
                    className="!bg-white !text-slate-900 !border-slate-300 placeholder:!text-slate-400"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-confirm" className="text-slate-700">Confirmar senha</Label>
                  <Input
                    id="register-confirm"
                    type="password"
                    placeholder="Confirme sua senha"
                    className="!bg-white !text-slate-900 !border-slate-300 placeholder:!text-slate-400"
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
                  <Label htmlFor="voucher-code" className="text-slate-700">Codigo de acesso</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="voucher-code"
                      type="text"
                      placeholder="Digite o codigo"
                      className="pl-10 uppercase font-mono tracking-wider !bg-white !text-slate-900 !border-slate-300 placeholder:!text-slate-400"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">
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
            <p className="text-xs text-slate-500 text-center mt-6">
              Ao conectar, você concorda com os{' '}
              <button 
                type="button"
                className="underline hover:text-slate-700"
                onClick={() => setTermsOpen(true)}
              >
                termos de uso
              </button>
            </p>
          )}

          {/* Terms of Use Modal */}
          <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Termos de Uso</DialogTitle>
                <DialogDescription className="whitespace-pre-wrap text-sm text-slate-600 mt-4">
                  {settings.termsText}
                </DialogDescription>
              </DialogHeader>
              <DialogClose asChild>
                <Button className="w-full mt-4" variant="outline">
                  Fechar
                </Button>
              </DialogClose>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
