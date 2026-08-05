'use client'

/**
 * Wrapper de esquema de cores do painel admin.
 *
 * Aplica o atributo data-theme (preset de cores) num container que envolve
 * todo o /admin (dashboard + login). Expõe um contexto para que o seletor de
 * esquema na aba Configurações consiga fazer preview instantâneo antes de salvar.
 *
 * O modo claro/escuro continua sendo controlado pelo next-themes (classe .dark
 * no <html>); o preset é ortogonal e apenas redefine os tokens de marca.
 */

import { createContext, useContext, useState, type ReactNode } from 'react'
import { DEFAULT_COLOR_SCHEME } from '@/lib/color-schemes'

interface AdminSchemeContextValue {
  scheme: string
  setScheme: (scheme: string) => void
}

const AdminSchemeContext = createContext<AdminSchemeContextValue | null>(null)

export function useAdminScheme() {
  const ctx = useContext(AdminSchemeContext)
  if (!ctx) {
    throw new Error('useAdminScheme deve ser usado dentro de <AdminThemeScheme>')
  }
  return ctx
}

export function AdminThemeScheme({
  initialScheme,
  children,
}: {
  initialScheme: string
  children: ReactNode
}) {
  const [scheme, setScheme] = useState(initialScheme || DEFAULT_COLOR_SCHEME)

  return (
    <AdminSchemeContext.Provider value={{ scheme, setScheme }}>
      <div data-theme={scheme} className="min-h-screen bg-background transition-colors duration-300">
        {children}
      </div>
    </AdminSchemeContext.Provider>
  )
}
