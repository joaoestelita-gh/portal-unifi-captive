import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

/**
 * Encrypts/decrypts sensitive controller credentials (passwords, secrets)
 * before storing them in the database.
 *
 * Uses AES-256-GCM with a key derived from the ENCRYPTION_KEY env variable.
 * If ENCRYPTION_KEY is not set, falls back to a default (NOT secure for production).
 *
 * Set ENCRYPTION_KEY in your .env to a random 32+ character string:
 *   ENCRYPTION_KEY="your-random-secret-key-at-least-32-chars"
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT = 'portal-unifi-captive-salt' // Static salt for key derivation

function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY
  if (!envKey) {
    console.warn(
      '[Crypto] ENCRYPTION_KEY not set! Using fallback key. Set ENCRYPTION_KEY in your .env for production.'
    )
  }
  const secret = envKey || 'default-insecure-key-change-in-production'
  // Derive a 32-byte key from the secret using scrypt
  return scryptSync(secret, SALT, 32)
}

/**
 * Encrypt a plaintext string.
 * Returns a base64-encoded string containing IV + AuthTag + Ciphertext.
 * Returns empty string if input is empty/null.
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return ''

  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Combine: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'hex'),
  ])

  return combined.toString('base64')
}

/**
 * Decrypt a previously encrypted string.
 * Input should be the base64-encoded value from encrypt().
 * Returns empty string if input is empty/null.
 * Returns the original value if decryption fails (handles migration from plaintext).
 */
export function decrypt(encryptedBase64: string): string {
  if (!encryptedBase64) return ''

  try {
    const combined = Buffer.from(encryptedBase64, 'base64')

    // Check minimum length (IV + AuthTag + at least 1 byte ciphertext)
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
      // Probably a plaintext value (pre-migration), return as-is
      return encryptedBase64
    }

    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    const key = getEncryptionKey()
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(ciphertext.toString('hex'), 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch {
    // If decryption fails, the value is likely still in plaintext (pre-migration)
    // Return it as-is to allow gradual migration
    return encryptedBase64
  }
}

/**
 * Check if a value appears to be encrypted (base64 with minimum length).
 */
export function isEncrypted(value: string): boolean {
  if (!value || value.length < 44) return false // Min base64 length for our format
  try {
    const decoded = Buffer.from(value, 'base64')
    return decoded.length >= IV_LENGTH + AUTH_TAG_LENGTH + 1
  } catch {
    return false
  }
}
