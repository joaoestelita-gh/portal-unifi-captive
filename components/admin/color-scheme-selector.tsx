'use client'

/**
 * Seletor de esquema de cores (presets fechados) do painel admin.
 *
 * Mostra cards com amostras de cor. Ao clicar, aplica o preview instantâneo
 * (via contexto AdminThemeScheme) e propaga a escolha para o formulário pai,
 * que persiste no banco ao salvar as configurações.
 */

import { Check } from 'lucide-react'
import { COLOR_SCHEMES } from '@/lib/color-schemes'
import { useAdminScheme } from '@/components/admin/admin-theme-scheme'
import { cn } from '@/lib/utils'

export function ColorSchemeSelector({
  value,
  onChange,
}: {
  value: string
  onChange: (scheme: string) => void
}) {
  const { setScheme } = useAdminScheme()

  const handleSelect = (id: string) => {
    setScheme(id) // preview imediato
    onChange(id) // marca para salvar
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {COLOR_SCHEMES.map((scheme) => {
        const selected = value === scheme.id
        return (
          <button
            key={scheme.id}
            type="button"
            onClick={() => handleSelect(scheme.id)}
            aria-pressed={selected}
            aria-label={`Esquema de cores ${scheme.label}`}
            className={cn(
              'group relative flex flex-col gap-3 rounded-lg border p-3 text-left transition-all duration-200',
              'hover:border-primary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected ? 'border-primary ring-2 ring-primary/40' : 'border-border bg-card/50'
            )}
          >
            {/* Amostras de cor */}
            <div className="flex items-center gap-1.5">
              <span
                className="h-6 w-6 rounded-full border border-border/60"
                style={{ backgroundColor: scheme.swatches.primary }}
              />
              <span
                className="h-6 w-6 rounded-full border border-border/60"
                style={{ backgroundColor: scheme.swatches.accent }}
              />
              <span
                className="h-6 w-6 rounded-full border border-border/60"
                style={{ backgroundColor: scheme.swatches.background }}
              />
              {selected && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{scheme.label}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground line-clamp-2">
                {scheme.description}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
