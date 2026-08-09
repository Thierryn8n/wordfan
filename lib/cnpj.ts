// Validação e formatação de CNPJ (com dígitos verificadores)

export function onlyDigits(v: string) {
  return (v || '').replace(/\D/g, '')
}

/** Alias: apenas os 14 dígitos, sem máscara. */
export function normalizeCnpj(v: string) {
  return onlyDigits(v).slice(0, 14)
}

export function formatCNPJ(v: string) {
  const d = onlyDigits(v).slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function isValidCNPJ(input: string): boolean {
  const cnpj = onlyDigits(input)
  if (cnpj.length !== 14) return false
  // rejeita sequências repetidas (00000000000000, etc.)
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  const calc = (base: string) => {
    let sum = 0
    let pos = base.length - 7
    for (let i = 0; i < base.length; i++) {
      sum += Number(base[i]) * pos--
      if (pos < 2) pos = 9
    }
    const result = sum % 11
    return result < 2 ? 0 : 11 - result
  }

  const base12 = cnpj.slice(0, 12)
  const dig1 = calc(base12)
  if (dig1 !== Number(cnpj[12])) return false
  const dig2 = calc(base12 + String(dig1))
  if (dig2 !== Number(cnpj[13])) return false
  return true
}
