/**
 * Esquemas de cores fechados (presets) do painel admin.
 *
 * Cada esquema corresponde a um bloco [data-theme="id"] em globals.css.
 * Aqui ficam apenas os metadados para o seletor (rótulo, descrição e amostras
 * de cor para o preview). As cores reais aplicadas vêm dos tokens CSS.
 */

export interface ColorSchemeMeta {
  id: string
  label: string
  description: string
  /** Amostras (primary, accent, background) para o mini-preview do seletor. */
  swatches: {
    primary: string
    accent: string
    background: string
  }
}

export const COLOR_SCHEMES: ColorSchemeMeta[] = [
  {
    id: 'default',
    label: 'Padrão',
    description: 'Ciano e verde — o tema original do portal.',
    swatches: { primary: 'oklch(0.6 0.13 200)', accent: 'oklch(0.62 0.15 160)', background: 'oklch(0.12 0 0)' },
  },
  {
    id: 'grafana',
    label: 'Grafana',
    description: 'Laranja e índigo, ideal para dashboards de dados.',
    swatches: { primary: 'oklch(0.68 0.18 48)', accent: 'oklch(0.6 0.16 265)', background: 'oklch(0.12 0 0)' },
  },
  {
    id: 'unifi',
    label: 'UniFi Site Manager',
    description: 'Azul-índigo profundo, alinhado à controladora UniFi.',
    swatches: { primary: 'oklch(0.58 0.19 262)', accent: 'oklch(0.64 0.13 238)', background: 'oklch(0.12 0 0)' },
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare',
    description: 'Âmbar dourado sobre tons neutros escuros.',
    swatches: { primary: 'oklch(0.74 0.16 65)', accent: 'oklch(0.55 0.09 252)', background: 'oklch(0.12 0 0)' },
  },
  {
    id: 'github',
    label: 'GitHub',
    description: 'Verde e azul, visual corporativo e discreto.',
    swatches: { primary: 'oklch(0.65 0.15 150)', accent: 'oklch(0.6 0.16 255)', background: 'oklch(0.12 0 0)' },
  },
  {
    id: 'azure',
    label: 'Azure Portal',
    description: 'Azul-céu e teal, clássico da nuvem Microsoft.',
    swatches: { primary: 'oklch(0.6 0.14 245)', accent: 'oklch(0.66 0.1 220)', background: 'oklch(0.12 0 0)' },
  },
]

export const DEFAULT_COLOR_SCHEME = 'default'

/** IDs válidos, para validação. */
export const COLOR_SCHEME_IDS = COLOR_SCHEMES.map((s) => s.id)

/** Retorna true se o id informado é um esquema conhecido. */
export function isValidColorScheme(id: string | null | undefined): boolean {
  return !!id && COLOR_SCHEME_IDS.includes(id)
}
