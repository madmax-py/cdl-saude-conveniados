// Formatos devolvidos pela API do painel do conveniado (cdl-saude, docs/api.md).

export interface Page<T> {
  data: T[]
  meta: { page: number; pages: number; count: number; per_page: number }
}

export interface Address {
  postal_code: string
  street: string
  number: string
  complement: string | null
  district: string
  city_id: number
  city: string | null
  state: string | null
}

export interface User {
  id: number
  name: string
  document_number: string
  email: string
  phone: string
  birthday: string
  gender: string
  active: boolean
  associate_id: number
  holder_id: number | null
  holder: boolean
  associate_admin: boolean
  user_group: { id: number; description: string } | null
  card_number: string
  card_valid_until: string
  address: Address
  avatar_url?: string | null
}

export interface Cpt {
  id: number
  code: string
  formatted_code: string
  description: string
  specialty: boolean
}

export interface OrderItem {
  id: number
  order_id: number
  cpt: Cpt
  price: number
  pct: boolean
}

export type OrderStatus = 'pendente' | 'finalizado' | 'trancado'

export interface Order {
  id: number
  status: OrderStatus
  entity_id: number
  partner: { id: number; trade_name: string } | null
  user: { id: number; name: string; document_number: string } | null
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

export interface Partner {
  id: number
  trade_name: string
  legal_name: string
  document_number: string
  email: string
  phone: string
  website: string | null
  active: boolean
  entity_id: number
  partner_kind_id: number
  address: Address
  // Presente quando a busca é por procedimento (?cpt_id=).
  offer?: { partner_cpt_id: number; price: number; pct: boolean }
}

export interface PartnerCpt {
  id: number
  cpt: Cpt
  price: number
  pct: boolean
  active: boolean
}

export interface State { id: number; name: string; acronym: string }
export interface City { id: number; name: string; state_id: number }
export interface UserGroup { id: number; description: string; relative: boolean }
export interface PartnerKind { id: number; code: string; description: string }

export interface TokenResponse { token: string; token_type: string; expires_in: number }

export interface Associate {
  id: number
  code: string
  trade_name: string
  legal_name: string
  document_number: string
  active: boolean
}

// GET /me
export interface Me {
  account: { id: number; name: string; email: string; avatar_url: string | null }
  partner: Partner
}

export interface PartnerDashboard {
  total_orders: number
  orders_this_month: number
  total_procedures: number
  total_specialties: number
  orders_by_month: Record<string, number>
  top_cpts: { description: string; count: number }[]
}

// Carteirinha consultada no atendimento (GET /cards e /cards/:id).
export interface Card {
  id: number
  name: string
  document_number: string
  card_number: string
  active: boolean
  holder: boolean
  associate_id: number
  qr_token?: string
}

export interface CptImportFailure {
  linha: number
  codigo: string
  codigo_formatado: string
  descricao: string
  motivo: string
}

export interface CptImportResult {
  status: 'success' | 'partial' | 'error'
  resumo: string
  linked: number
  not_found: CptImportFailure[]
  not_found_count: number
  errors: string[]
}

export interface ExportPayload {
  partner: string
  procedimentos: { codigo: string; descricao: string; valor: number; ativo: string }[]
}
