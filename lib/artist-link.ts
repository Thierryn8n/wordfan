import 'server-only'
import crypto from 'crypto'

/**
 * Gera/decodifica um token opaco que representa o id do artista, para o link
 * permanente de acesso ao próprio perfil: `dominio/a/<token>`.
 *
 * Usa AES-256-GCM. O IV é derivado de forma determinística do id (HMAC), então
 * o mesmo artista sempre gera o MESMO token — o link é estável e pode ser
 * repassado uma vez e reutilizado para sempre. A autenticação do GCM garante
 * que tokens adulterados sejam rejeitados na decodificação.
 */
const SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT || 'wordfan-artist-link-fallback'
const KEY = crypto.createHash('sha256').update(SECRET).digest()

export function encodeArtistToken(artistId: string): string {
  const iv = crypto.createHmac('sha256', KEY).update(artistId).digest().subarray(0, 12)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const enc = Buffer.concat([cipher.update(artistId, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64url')
}

export function decodeArtistToken(token: string): string | null {
  try {
    const buf = Buffer.from(token, 'base64url')
    if (buf.length < 28) return null
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const enc = buf.subarray(28)
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv)
    decipher.setAuthTag(tag)
    const dec = Buffer.concat([decipher.update(enc), decipher.final()])
    return dec.toString('utf8')
  } catch {
    return null
  }
}
