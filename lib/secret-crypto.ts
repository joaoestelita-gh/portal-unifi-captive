/**
 * Secret Crypto — Criptografia simétrica de segredos em repouso (AES-256-GCM).
 *
 * Usado para NÃO guardar credenciais de controladora (senha UniFi/Aruba, API key)
 * em texto plano no banco. Diferente de `lib/crypto.ts`, que faz apenas hashing
 * bcrypt de SENHAS DE USUÁRIO (one-way). Aqui precisamos de reversibilidade para
 * reautenticar na controladora.
 *
 * Formato do valor armazenado: `enc:v1:<iv_b64>:<tag_b64>:<ciphertext_b64>`.
 * Valores sem esse prefixo são tratados como texto plano legado (compatibilidade
 * com registros gravados antes desta mudança) e retornados como estão.
 *
 * Chave: derivada de `SETTINGS_ENC_KEY` (recomendado) ou, como fallback, de
 * `BETTER_AUTH_SECRET` (já obrigatório). SHA-256 do segredo → 32 bytes.
 *
 * IMPORTANTE: módulo server-only. Nunca importar em client components.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const PREFIX = 'enc:v1'
const ALGO = 'aes-256-gcm'
const IV_BYTES = 12

/** Deriva uma chave de 32 bytes a partir do segredo de ambiente. */
function getKey(): Buffer {
  const raw = process.env.SETTINGS_ENC_KEY || process.env.BETTER_AUTH_SECRET
  if (!raw) {
    throw new Error(
      '[secret-crypto] Defina SETTINGS_ENC_KEY (ou BETTER_AUTH_SECRET) para criptografar segredos em repouso.'
    )
  }
  return createHash('sha256').update(raw).digest()
}

/** Verifica se um valor já está no formato criptografado desta biblioteca. */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(`${PREFIX}:`)
}

/**
 * Criptografa um segredo. Strings vazias/nulas são retornadas como '' (nada a proteger).
 * Se o valor já estiver criptografado, é retornado inalterado (idempotente).
 */
export function encryptSecret(plain: string | null | undefined): string {
  if (!plain) return ''
  if (isEncrypted(plain)) return plain

  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    PREFIX,
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':')
}

/**
 * Descriptografa um segredo. Aceita:
 * - valores no formato `enc:v1:...` → descriptografa;
 * - valores em texto plano legado → retorna como estão (compatibilidade);
 * - vazio/nulo → retorna ''.
 */
export function decryptSecret(value: string | null | undefined): string {
  if (!value) return ''
  if (!isEncrypted(value)) return value // texto plano legado

  const parts = value.split(':')
  // ['enc', 'v1', iv, tag, ciphertext]
  if (parts.length !== 5) {
    throw new Error('[secret-crypto] Valor criptografado malformado.')
  }
  const [, , ivB64, tagB64, ctB64] = parts

  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const plain = Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(),
  ])
  return plain.toString('utf8')
}

/**
 * Máscara para exibição: retorna um placeholder fixo se houver segredo, ou ''.
 * Nunca revela tamanho nem conteúdo.
 */
export function maskSecret(value: string | null | undefined): string {
  return value ? '••••••••' : ''
}
