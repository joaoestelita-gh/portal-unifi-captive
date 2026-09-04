'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Wifi, Clock, ArrowRight, Loader2, WifiOff, RefreshCw } from 'lucide-react'

interface SuccessContentProps {
  sessionMinutes: string
  userName: string
  redirectUrl: string
}

// Endpoints públicos que respondem HTTP 204 (sem corpo) quando há internet real.
// Enquanto o dispositivo estiver preso no captive portal, a requisição é
// interceptada/redirecionada e a Promise rejeita — o que sinaliza "sem acesso".
const CONNECTIVITY_ENDPOINTS = [
  'https://www.gstatic.com/generate_204',
  'https://connectivitycheck.gstatic.com/generate_204',
  'https://cloudflare.com/cdn-cgi/trace',
]

const CHECK_TIMEOUT_MS = 5000

// URL de health EXTERNO (fora da walled garden). Quando definida, é o sinal
// decisivo de internet realmente liberada — ler status 204 dela distingue
// "liberado" de "ainda cativo". Ver NEXT_PUBLIC_CONNECTIVITY_CHECK_URL no
// .env.example.
const EXTERNAL_CHECK_URL = process.env.NEXT_PUBLIC_CONNECTIVITY_CHECK_URL

type ConnectionStatus = 'checking' | 'online' | 'offline'

// Lê o status HTTP real (com CORS) de um endpoint que deve responder 204.
// Se o captive portal ainda estiver interceptando e redirecionar para uma
// página HTML, o status não será 204 (ou dará erro de CORS/rede) e tratamos
// como "sem acesso" — elimina o falso positivo do no-cors.
async function checkStatus204(url: string, signal: AbortSignal): Promise<boolean> {
  try {
    const sep = url.includes('?') ? '&' : '?'
    const res = await fetch(`${url}${sep}_=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      signal,
    })
    return res.status === 204
  } catch {
    return false
  }
}

export function SuccessContent({ sessionMinutes, userName, redirectUrl }: SuccessContentProps) {
  const [countdown, setCountdown] = useState(10)
  const [connection, setConnection] = useState<ConnectionStatus>('checking')

  const checkConnectivity = useCallback(async () => {
    setConnection('checking')

    // 1) Sinal decisivo: health EXTERNO (fora da walled garden), status 204
    //    legível. Se configurado, é autoritativo — não caímos no fallback
    //    no-cors, que reintroduziria o falso positivo que ele veio eliminar.
    if (EXTERNAL_CHECK_URL) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)
      const externalOk = await checkStatus204(EXTERNAL_CHECK_URL, controller.signal)
      clearTimeout(timeout)
      setConnection(externalOk ? 'online' : 'offline')
      return
    }

    // 2) Sem health externo: confirma que o backend do app responde 204.
    const healthController = new AbortController()
    const healthTimeout = setTimeout(() => healthController.abort(), CHECK_TIMEOUT_MS)
    const healthOk = await checkStatus204('/api/health', healthController.signal)
    clearTimeout(healthTimeout)
    if (healthOk) {
      setConnection('online')
      return
    }

    // 3) Fallback: endpoints públicos via no-cors (só distingue "resolveu" de
    //    "erro de rede", mas cobre o caso de o /api/health estar indisponível).
    for (const endpoint of CONNECTIVITY_ENDPOINTS) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)
      try {
        await fetch(`${endpoint}?_=${Date.now()}`, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal,
        })
        clearTimeout(timeout)
        setConnection('online')
        return
      } catch {
        clearTimeout(timeout)
        // Tenta o próximo endpoint da lista.
      }
    }

    setConnection('offline')
  }, [])

  // Dispara a checagem ao montar a tela.
  useEffect(() => {
    checkConnectivity()
  }, [checkConnectivity])

  // Auto-redirect countdown — só corre depois que a internet foi confirmada.
  useEffect(() => {
    if (connection !== 'online') return

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }

    if (countdown === 0) {
      window.location.href = redirectUrl
    }
  }, [connection, countdown, redirectUrl])

  const handleContinue = () => {
    window.location.href = redirectUrl
  }
  
  const formatTime = (minutes: number) => {
    if (minutes === 0) return 'Ilimitado'
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
    }
    return `${minutes} minutos`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/95 backdrop-blur shadow-2xl border-0">
        <CardContent className="pt-8 pb-6 px-6 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
          </div>
          
          {/* Success Message */}
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Conectado com Sucesso!
          </h1>
          <p className="text-muted-foreground mb-6">
            Olá, <span className="font-semibold text-foreground">{userName}</span>! Você está conectado à rede WiFi.
          </p>
          
          {/* Session Info */}
          <div className="bg-muted rounded-xl p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Wifi className="w-5 h-5" />
                <span>Status</span>
              </div>
              {connection === 'checking' && (
                <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando...
                </span>
              )}
              {connection === 'online' && (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Internet confirmada</span>
              )}
              {connection === 'offline' && (
                <span className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                  <WifiOff className="w-4 h-4" />
                  Sem acesso
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-5 h-5" />
                <span>Tempo de Sessão</span>
              </div>
              <span className="font-semibold text-foreground">
                {formatTime(parseInt(sessionMinutes))}
              </span>
            </div>
          </div>
          
          {/* Continue Button */}
          {connection === 'offline' ? (
            <Button
              onClick={checkConnectivity}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white h-12 text-base"
            >
              Tentar novamente
              <RefreshCw className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleContinue}
              disabled={connection === 'checking'}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base disabled:opacity-60"
            >
              Continuar Navegando
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          )}

          {/* Status notices */}
          {connection === 'checking' && (
            <p className="text-sm text-muted-foreground mt-4">
              Verificando o acesso à internet...
            </p>
          )}
          {connection === 'online' && countdown > 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              Redirecionando automaticamente em {countdown} segundos...
            </p>
          )}
          {connection === 'offline' && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-4">
              Ainda não detectamos acesso à internet. Aguarde alguns segundos e tente novamente.
            </p>
          )}
          
          {/* Tips */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Dica: Se a conexão não funcionar, tente desligar e ligar o WiFi do seu dispositivo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
