import type { OrderStatus } from '../api/types'

export const onlyDigits = (value: string) => value.replace(/\D/g, '')

export function formatCpf(value: string) {
  const d = onlyDigits(value).slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

export function formatPhone(value: string) {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function formatCep(value: string) {
  const d = onlyDigits(value).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// O conveniado cobra um valor fixo ou uma porcentagem (pct) — ver PartnerCpt.
export function formatPrice(price: number, pct: boolean) {
  return pct ? `${price.toLocaleString('pt-BR')}% de desconto` : currency.format(price)
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

// Associado pode ser pessoa física (CPF) ou jurídica (CNPJ): a máscara
// acompanha a quantidade de dígitos digitados.
export function formatDocument(value: string) {
  const d = onlyDigits(value).slice(0, 14)
  if (d.length <= 11) return formatCpf(d)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function formatCardNumber(value: string) {
  return value.match(/.{1,4}/g)?.join(' ') ?? value
}

export const statusLabel: Record<OrderStatus, string> = {
  pendente: 'Pendente',
  finalizado: 'Finalizada',
  trancado: 'Expirada',
}

export function firstNames(name: string, count = 2) {
  return name
    .split(/\s+/)
    .slice(0, count)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}
