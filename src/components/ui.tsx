import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { OrderStatus, Page } from '../api/types'
import { statusLabel } from '../lib/format'

export function Spinner({ full = false }: { full?: boolean }) {
  return (
    <div className={full ? 'spinner spinner-full' : 'spinner'} role="status" aria-label="Carregando">
      <LoaderCircle className="spin" size={28} />
    </div>
  )
}

export function Alert({ children, tone = 'danger' }: { children: ReactNode; tone?: 'danger' | 'success' | 'info' }) {
  if (!children) return null
  return (
    <div className={`alert alert-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <p className="empty-title">{title}</p>
      {children && <div className="empty-text">{children}</div>}
    </div>
  )
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge badge-${status}`}>{statusLabel[status]}</span>
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function Pagination({ meta, onChange }: { meta: Page<unknown>['meta']; onChange: (page: number) => void }) {
  if (meta.pages <= 1) return null
  return (
    <nav className="pagination" aria-label="Paginação">
      <button className="btn btn-ghost btn-icon" disabled={meta.page <= 1} onClick={() => onChange(meta.page - 1)}
              aria-label="Página anterior">
        <ChevronLeft size={18} />
      </button>
      <span className="muted">Página {meta.page} de {meta.pages}</span>
      <button className="btn btn-ghost btn-icon" disabled={meta.page >= meta.pages} onClick={() => onChange(meta.page + 1)}
              aria-label="Próxima página">
        <ChevronRight size={18} />
      </button>
    </nav>
  )
}

export function Field({ label, error, children, hint }: { label: string; error?: string[]; hint?: string; children: ReactNode }) {
  return (
    <label className={error?.length ? 'field field-error' : 'field'}>
      <span className="field-label">{label}</span>
      {children}
      {hint && !error?.length && <span className="field-hint">{hint}</span>}
      {error?.length ? <span className="field-message">{error.join(', ')}</span> : null}
    </label>
  )
}
