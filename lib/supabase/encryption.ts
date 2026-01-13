import CryptoJS from 'crypto-js'

// Server-side encryption secret (must be set in .env)
const getServerSecret = () => {
  const secret = process.env.ENCRYPTION_SECRET_KEY
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET_KEY environment variable is not set')
  }
  return secret
}

/**
 * Encrypts an API key using AES-256 encryption
 * @param apiKey - The plaintext API key to encrypt
 * @param userId - The user's ID (used to derive per-user encryption key)
 * @returns Encrypted API key as a string
 */
export function encryptApiKey(apiKey: string, userId: string): string {
  const serverSecret = getServerSecret()
  const userSecret = CryptoJS.SHA256(userId + serverSecret).toString()
  const encrypted = CryptoJS.AES.encrypt(apiKey, userSecret).toString()
  return encrypted
}

/**
 * Decrypts an encrypted API key
 * @param encryptedKey - The encrypted API key
 * @param userId - The user's ID (used to derive per-user encryption key)
 * @returns Decrypted plaintext API key
 */
export function decryptApiKey(encryptedKey: string, userId: string): string {
  const serverSecret = getServerSecret()
  const userSecret = CryptoJS.SHA256(userId + serverSecret).toString()
  const decrypted = CryptoJS.AES.decrypt(encryptedKey, userSecret)
  const plaintext = decrypted.toString(CryptoJS.enc.Utf8)

  if (!plaintext) {
    throw new Error('Failed to decrypt API key - invalid encryption key or corrupted data')
  }

  return plaintext
}
