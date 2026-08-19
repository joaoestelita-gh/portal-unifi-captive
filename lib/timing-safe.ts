/**
 * Comparação de strings em tempo constante — evita timing attacks ao verificar
 * segredos (CRON_SECRET, RADIUS_REST_SECRET, etc.).
 *
 * Implementação pura em JS (sem node:crypto) para funcionar tanto no runtime
 * Node quanto no Edge (middleware). Não faz early-return: o trabalho é fixo
 * independentemente de onde as strings diferem.
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  const enc = new TextEncoder()
  const ua = enc.encode(a ?? '')
  const ub = enc.encode(b ?? '')

  // Diferença de tamanho já entra no acumulador (sem revelar via early-return).
  let diff = ua.length ^ ub.length
  const len = Math.max(ua.length, ub.length)
  for (let i = 0; i < len; i++) {
    diff |= (ua[i] ?? 0) ^ (ub[i] ?? 0)
  }
  return diff === 0
}
