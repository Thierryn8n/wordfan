const MOBILE_UA_RE =
  /android|iphone|ipod|ipad|iemobile|blackberry|bb10|opera mini|windows phone|mobile|tablet|silk|kindle|playbook|webos/i

/** Detecta celulares/tablets pelo user-agent (defesa no servidor). */
export function isMobileUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false
  return MOBILE_UA_RE.test(ua)
}
