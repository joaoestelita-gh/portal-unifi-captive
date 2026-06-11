'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Wifi, Clock, ArrowRight } from 'lucide-react'

interface SuccessContentProps {
  sessionMinutes: string
  userName: string
  redirectUrl: string
}

export function SuccessContent({ sessionMinutes, userName, redirectUrl }: SuccessContentProps) {
  const [countdown, setCountdown] = useState(10)
  
  // Auto-redirect countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
    
    if (countdown === 0) {
      window.location.href = redirectUrl
    }
  }, [countdown, redirectUrl])
  
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
      <Card className="w-full max-w-md bg-white/95 backdrop-blur shadow-2xl border-0">
        <CardContent className="pt-8 pb-6 px-6 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-emerald-600" />
          </div>
          
          {/* Success Message */}
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Conectado com Sucesso!
          </h1>
          <p className="text-slate-600 mb-6">
            Ola, <span className="font-semibold">{userName}</span>! Voce esta conectado a rede WiFi.
          </p>
          
          {/* Session Info */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <Wifi className="w-5 h-5" />
                <span>Status</span>
              </div>
              <span className="font-semibold text-emerald-600">Ativo</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-5 h-5" />
                <span>Tempo de Sessao</span>
              </div>
              <span className="font-semibold text-slate-800">
                {formatTime(parseInt(sessionMinutes))}
              </span>
            </div>
          </div>
          
          {/* Continue Button */}
          <Button 
            onClick={handleContinue}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base"
          >
            Continuar Navegando
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          
          {/* Auto-redirect notice */}
          {countdown > 0 && (
            <p className="text-sm text-slate-500 mt-4">
              Redirecionando automaticamente em {countdown} segundos...
            </p>
          )}
          
          {/* Tips */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Dica: Se a conexao nao funcionar, tente desligar e ligar o WiFi do seu dispositivo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
