import { ArrowLeft, Check, CheckCircle2, Lock, Plus, Printer, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { Order, Page, PartnerCpt } from '../api/types'
import { Alert, Pagination, Spinner, StatusBadge } from '../components/ui'
import { formatCpf, formatDateTime, formatPrice } from '../lib/format'
import { printOrder } from '../lib/printOrder'
import { useApi, useDebounced } from '../lib/useApi'

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const order = useApi(() => api.get<Order>(`/orders/${id}`), [id])
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Só guia pendente recebe itens novos ou é finalizada.
  const editable = order.data?.status === 'pendente'

  async function run(action: () => Promise<unknown>) {
    setError('')
    setBusy(true)
    try {
      await action()
      order.reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm('Excluir esta guia? Essa ação não pode ser desfeita.')) return
    setBusy(true)
    try {
      await api.delete(`/orders/${id}`)
      navigate('/guias', { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado.')
      setBusy(false)
    }
  }

  if (order.loading && !order.data) return <Spinner />
  if (!order.data) return <Alert>{order.error}</Alert>

  const o = order.data
  const items = o.items ?? []
  const linked = new Set(items.map((item) => item.cpt.id))

  return (
    <div className="stack">
      <Link to="/guias" className="btn btn-ghost btn-sm back"><ArrowLeft size={16} /> Guias</Link>

      <header className="page-header">
        <div>
          <h1>Guia #{o.id}</h1>
          <p className="muted">Emitida em {formatDateTime(o.created_at)}</p>
        </div>
        <StatusBadge status={o.status} />
      </header>

      <Alert>{error}</Alert>

      <section className="card detail-grid">
        <div>
          <span className="detail-label">Paciente</span>
          <span>{o.user?.name}</span>
        </div>
        <div>
          <span className="detail-label">CPF</span>
          <span>{o.user && formatCpf(o.user.document_number)}</span>
        </div>
        <div>
          <span className="detail-label">Total</span>
          <span className="price">{formatPrice(items.filter((i) => !i.pct).reduce((sum, i) => sum + i.price, 0), false)}</span>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Procedimentos</h2>
          {editable && !adding && (
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}>
              <Plus size={16} /> Adicionar
            </button>
          )}
        </div>

        {items.length === 0 && <p className="muted">Nenhum procedimento nesta guia ainda.</p>}
        <ul className="list">
          {items.map((item) => (
            <li key={item.id} className="list-item">
              <div className="list-body">
                <strong>{item.cpt.description}</strong>
                <span className="muted">
                  {item.cpt.specialty ? 'Especialidade' : `Código ${item.cpt.formatted_code}`}
                </span>
              </div>
              <span className="price">{formatPrice(item.price, item.pct)}</span>
              {editable && (
                <button
                  className="btn btn-ghost btn-icon danger"
                  disabled={busy}
                  onClick={() => run(() => api.delete(`/orders/${id}/items/${item.id}`))}
                  aria-label={`Remover ${item.cpt.description}`}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </li>
          ))}
        </ul>

        {adding && (
          <AddProcedure
            linked={linked}
            busy={busy}
            onAdd={(cptId) => run(() => api.post(`/orders/${id}/items`, { cpt_id: cptId }))}
            onClose={() => setAdding(false)}
          />
        )}
      </section>

      <div className="actions">
        {o.status === 'finalizado' && items.length > 0 && (
          <button className="btn btn-primary" disabled={busy} onClick={() => run(() => printOrder(o.id))}>
            <Printer size={18} /> Imprimir guia
          </button>
        )}
        {editable && (
          <button
            className="btn btn-primary"
            disabled={busy || items.length === 0}
            onClick={() => run(() => api.patch(`/orders/${id}/finalize`))}
            title={items.length === 0 ? 'Adicione ao menos um procedimento' : undefined}
          >
            <CheckCircle2 size={18} /> Finalizar guia
          </button>
        )}
        {o.status !== 'trancado' && (
          // "Trancar" do painel web: a guia vence e não pode mais ser usada.
          <button className="btn btn-ghost" disabled={busy}
                  onClick={() => confirm('Expirar esta guia? Ela não poderá mais ser usada.') && run(() => api.patch(`/orders/${id}/lock`))}>
            <Lock size={18} /> Expirar guia
          </button>
        )}
        <button className="btn btn-danger-outline" disabled={busy} onClick={remove}>
          <Trash2 size={18} /> Excluir guia
        </button>
      </div>

      {o.status === 'finalizado' && (
        <Alert tone="info">Guia finalizada. Imprima as duas vias e colete as assinaturas no atendimento.</Alert>
      )}
    </div>
  )
}

// Busca na tabela do próprio conveniado (procedimentos e especialidades
// ativos), com o valor de cada um. Fica aberta para adicionar vários.
function AddProcedure({ linked, busy, onAdd, onClose }: {
  linked: Set<number>
  busy: boolean
  onAdd: (cptId: number) => Promise<unknown>
  onClose: () => void
}) {
  const [kind, setKind] = useState<'procedures' | 'specialties'>('procedures')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const term = useDebounced(search)
  const fetched = useApi(() => api.get<Page<PartnerCpt>>(`/${kind}`, { search: term, page }), [kind, term, page])
  const results = { ...fetched, data: fetched.data && { ...fetched.data, data: fetched.data.data.filter((pc) => pc.active) } }

  return (
    <div className="add-procedure">
      <div className="add-procedure-head">
        <label className="search">
          <Search size={18} />
          <input
            className="input"
            placeholder="Buscar por nome, código ou valor"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            autoFocus
            aria-label="Buscar procedimento para adicionar"
          />
        </label>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>Concluir</button>
      </div>
      <div className="segmented" role="group" aria-label="Tipo">
        <button className={kind === 'procedures' ? 'active' : ''} onClick={() => { setKind('procedures'); setPage(1) }}>Procedimentos</button>
        <button className={kind === 'specialties' ? 'active' : ''} onClick={() => { setKind('specialties'); setPage(1) }}>Especialidades</button>
      </div>

      <Alert>{results.error}</Alert>
      {results.loading && !results.data && <Spinner />}
      {results.data?.data.length === 0 && (
        <p className="muted">{term ? 'Nenhum procedimento encontrado.' : 'O conveniado não tem procedimentos disponíveis.'}</p>
      )}

      <ul className={results.loading ? 'list is-loading' : 'list'}>
        {results.data?.data.map((pc) => {
          const inOrder = linked.has(pc.cpt.id)
          return (
            <li key={pc.id} className="list-item">
              <div className="list-body">
                <strong>{pc.cpt.description}</strong>
                <span className="muted">{pc.cpt.specialty ? 'Especialidade' : `Código ${pc.cpt.formatted_code}`}</span>
              </div>
              <span className="price">{formatPrice(pc.price, pc.pct)}</span>
              {inOrder ? (
                <span className="in-order"><Check size={16} /> Na guia</span>
              ) : (
                <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onAdd(pc.cpt.id)}
                        aria-label={`Adicionar ${pc.cpt.description}`}>
                  <Plus size={16} /> Adicionar
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {results.data && <Pagination meta={results.data.meta} onChange={setPage} />}
    </div>
  )
}
