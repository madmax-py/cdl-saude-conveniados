import { CalendarDays, ClipboardList, FilePlus2, FileText, IdCard, Stethoscope } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Order, Page, PartnerDashboard } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Alert, Spinner, StatusBadge } from '../components/ui'
import { formatDate } from '../lib/format'
import { useApi } from '../lib/useApi'

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// A API só devolve os meses que tiveram guia ("MM/AAAA"); o gráfico mostra
// sempre os últimos 6, com zero onde não houve nenhuma.
function lastSixMonths(byMonth: Record<string, number>) {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
    const key = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
    return { key, label: MONTHS[date.getMonth()], count: byMonth[key] ?? 0 }
  })
}

export default function Home() {
  const { me } = useAuth()
  const dashboard = useApi(() => api.get<PartnerDashboard>('/dashboard'), [])
  const recent = useApi(() => api.get<Page<Order>>('/orders'), [])
  const pending = useApi(() => api.get<Page<Order>>('/orders', { status: 'pendente' }), [])

  if (dashboard.loading) return <Spinner />
  if (dashboard.error || !dashboard.data) return <Alert>{dashboard.error}</Alert>

  const d = dashboard.data
  const months = lastSixMonths(d.orders_by_month)

  return (
    <div className="dash">
      <section className="hero card dash-hero">
        <div>
          <p className="hero-eyebrow">Painel do conveniado</p>
          <h1>{me?.partner.trade_name}</h1>
          <p>Confira a carteirinha do paciente, emita a guia e acompanhe seus atendimentos pelo CDL Saúde.</p>
        </div>
        <div className="hero-actions">
          <Link to="/guias/nova" className="btn btn-light"><FilePlus2 size={18} /> Gerar guia</Link>
          <Link to="/carteirinhas" className="btn btn-outline-light"><IdCard size={18} /> Consultar carteirinha</Link>
        </div>
      </section>

      {me && !me.partner.active && (
        <Alert>Seu cadastro está desativado: não é possível gerar novas guias. Entre em contato com a CDL.</Alert>
      )}

      <div className="dash-stats">
        <Stat icon={<CalendarDays size={20} />} value={d.orders_this_month} label="guias neste mês" />
        <Stat icon={<FileText size={20} />} value={d.total_orders} label="guias no total" />
        <Stat icon={<ClipboardList size={20} />} value={d.total_procedures} label="procedimentos na tabela" />
        <Stat icon={<Stethoscope size={20} />} value={d.total_specialties} label="especialidades" />
      </div>

      <section className="card dash-chart">
        <h2>Guias por mês</h2>
        <p className="muted">Últimos 6 meses</p>
        <MonthlyBars months={months} />
      </section>

      <section className="card dash-top">
        <h2>Procedimentos mais atendidos</h2>
        <p className="muted">Em todas as suas guias</p>
        {d.top_cpts.length === 0 ? (
          <p className="muted dash-empty">Ainda não há procedimentos em guias.</p>
        ) : (
          <TopList items={d.top_cpts} />
        )}
      </section>

      <section className="card dash-recent">
        <div className="section-head">
          <h2>Últimas guias</h2>
          <Link to="/guias" className="btn btn-link btn-sm">Ver todas</Link>
        </div>
        {recent.loading && <Spinner />}
        {recent.data?.data.length === 0 && <p className="muted">Nenhuma guia emitida ainda.</p>}
        <OrderList orders={recent.data?.data.slice(0, 6) ?? []} />
      </section>

      <section className="card dash-attention">
        <div className="section-head">
          <h2>Pendentes de finalizar</h2>
          {pending.data && pending.data.meta.count > 0 && <span className="badge badge-pendente">{pending.data.meta.count}</span>}
        </div>
        {pending.loading && <Spinner />}
        {pending.data?.data.length === 0 && <p className="muted">Nenhuma guia pendente.</p>}
        <OrderList orders={pending.data?.data.slice(0, 6) ?? []} compact />
        {pending.data && pending.data.meta.count > 6 && (
          <Link to="/guias" className="btn btn-link btn-sm">Ver todas as pendentes</Link>
        )}
      </section>
    </div>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="stat card">
      <span className="stat-icon">{icon}</span>
      <div>
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  )
}

// Barras verticais de uma série só: uma cor, valor do mês atual sempre visível
// e dos demais ao passar o mouse, e uma tabela equivalente para leitores de tela.
function MonthlyBars({ months }: { months: { key: string; label: string; count: number }[] }) {
  const max = Math.max(1, ...months.map((m) => m.count))
  const current = months[months.length - 1]

  return (
    <>
      <div className="bars" aria-hidden="true">
        {months.map((m) => (
          <div key={m.key} className={m.key === current.key ? 'bar-col current' : 'bar-col'}
               title={`${m.key}: ${m.count} guia${m.count === 1 ? '' : 's'}`}>
            <div className="bar-track">
              <span className="bar-value">{m.count}</span>
              <div className="bar" style={{ height: `${(m.count / max) * 100}%` }} />
            </div>
            <span className="bar-label">{m.label}</span>
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>Guias por mês</caption>
        <tbody>
          {months.map((m) => <tr key={m.key}><th>{m.key}</th><td>{m.count}</td></tr>)}
        </tbody>
      </table>
    </>
  )
}

function TopList({ items }: { items: { description: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count))
  return (
    <ol className="top-list">
      {items.map((item) => (
        <li key={item.description}>
          <div className="top-row">
            <span className="top-name">{item.description}</span>
            <span className="top-count">{item.count}</span>
          </div>
          <div className="top-track" aria-hidden="true">
            <div className="top-bar" style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  )
}

function OrderList({ orders, compact = false }: { orders: Order[]; compact?: boolean }) {
  return (
    <ul className="list">
      {orders.map((order) => (
        <li key={order.id}>
          <Link to={`/guias/${order.id}`} className={compact ? 'list-item list-item-compact' : 'list-item'}>
            {!compact && <span className="list-avatar"><FileText size={18} /></span>}
            <div className="list-body">
              <strong>{order.user?.name}</strong>
              <span className="muted">Guia #{order.id} · {formatDate(order.created_at)}</span>
            </div>
            {!compact && <StatusBadge status={order.status} />}
          </Link>
        </li>
      ))}
    </ul>
  )
}
