'use client'

import { useState, FormEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Wifi, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { loginAdmin } from '@/app/actions/auth'

export default function AdminLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
  }

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
  }

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await loginAdmin(email, password)
      
      if (result.error) {
        setError(result.error)
      } else {
        router.push('/admin')
        router.refresh()
      }
    } catch {
      setError('Erro ao fazer login')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a]">
      <Card className="w-full max-w-md bg-[#141414] border-[#262626] shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg">
            <Wifi className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Painel Administrativo</CardTitle>
          <CardDescription className="text-gray-400">Acesse o painel de gerenciamento do portal WiFi</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-300">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="admin@exemplo.com"
                value={email}
                onChange={handleEmailChange}
                required
                autoComplete="email"
                className="w-full h-11 px-3 rounded-md border border-[#333] bg-[#1a1a1a] text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-300">Senha</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={handlePasswordChange}
                required
                autoComplete="current-password"
                className="w-full h-11 px-3 rounded-md border border-[#333] bg-[#1a1a1a] text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 font-medium bg-cyan-600 hover:bg-cyan-700 text-white" 
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Entrar
            </Button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-[#262626] text-center">
            <p className="text-xs text-gray-500">
              Portal WiFi Captive - Sistema de Gerenciamento
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
