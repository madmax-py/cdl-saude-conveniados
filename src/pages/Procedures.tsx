import { Ban, ClipboardList, Download, FileSpreadsheet, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { Cpt, ExportPayload, Page, PartnerCpt } from '../api/types'
import { Alert, Empty, Field, PageHeader, Pagination, Spinner } from '../components/ui'
import { formatPrice } from '../lib/format'
import { useApi, useDebounced } from '../lib/useApi'

type Kind = 'procedures' | 'specialties'

const LABELS: Record<Kind, { title: string; singular: string; subtitle: string }> = {
  procedures: {
    title: 'Procedimentos',
    singular: 'procedimento',
    subtitle: 'Exames e procedimentos que você atende pelo CDL Saúde, com o valor praticado.',
  },
  specialties: {
    title: 'Especialidades',
    singular: 'especialidade',
    subtitle: 'Consultas por especialidade que você atende pelo CDL Saúde, com o valor praticado.',
  },
}

// "120,50" ou "120.50" → 120.5
function parsePrice(value: string) {
  return Number(value.replace(/\./g, '').replace(',', '.'))
}

function priceInput(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Mesmo CSV do painel web (separado por ";", com BOM para o Excel), que pode
// ser reimportado sem ajustes.
async function exportProcedures() {
  const { partner, procedimentos } = await api.get<ExportPayload>('/procedures/export')
  const rows = [['Codigo', 'Descrição', 'Valor', 'Ativo'],
    ...procedimentos.map((p) => [p.codigo, p.descricao, p.valor.toFixed(2).replace('.', ','), p.ativo])]
  const csv = rows.map((row) => row.map((field) => `"${String(field ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `procedimentos_${(partner || 'conveniado').replace(/[^\w]+/g, '_').toLowerCase()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function Procedures({ kind }: { kind: Kind }) {
  const labels = LABELS[kind]
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const term = useDebounced(search)
  const items = useApi(() => api.get<Page<PartnerCpt>>(`/${kind}`, { search: term, page }), [kind, term, page])

  async function run(action: () => Promise<unknown>) {
    setError('')
    try {
      await action()
      items.reload()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado.')
    }
  }

  function remove(pc: PartnerCpt) {
    if (!confirm(`Excluir "${pc.cpt.description}" da sua tabela?`)) return
    run(() => api.delete(`/${kind}/${pc.id}`))
  }

  return (
    <div className="stack">
      <PageHeader
        title={labels.title}
        subtitle={labels.subtitle}
        action={
          <div className="header-actions">
            {kind === 'procedures' && (
              <>
                <button className="btn btn-ghost" onClick={() => exportProcedures().catch(() => setError('Não foi possível exportar.'))}>
                  <Download size={18} /> Exportar
                </button>
                <Link to="/procedimentos/importar" className="btn btn-ghost"><FileSpreadsheet size={18} /> Importar</Link>
              </>
            )}
            <button className="btn btn-primary" onClick={() => setAdding(true)} disabled={adding}>
              <Plus size={18} /> Adicionar
            </button>
          </div>
        }
      />

      <nav className="tabs" aria-label="Tabela">
        <NavLink to="/procedimentos" end className="tab">Procedimentos</NavLink>
        <NavLink to="/procedimentos/especialidades" className="tab">Especialidades</NavLink>
      </nav>

      {adding && (
        <AddPanel kind={kind} singular={labels.singular} onClose={() => setAdding(false)}
                  onAdded={() => { setAdding(false); items.reload() }} />
      )}

      <label className="search">
        <Search size={18} />
        <input className="input" placeholder="Buscar por nome, código ou valor" value={search}
               onChange={(e) => {
                 setSearch(e.target.value)
                 setPage(1)
               }}
               aria-label={`Buscar ${labels.title.toLowerCase()}`} />
      </label>

      <Alert>{error || items.error}</Alert>
      {items.loading && !items.data && <Spinner />}
      {items.data?.data.length === 0 && (
        <Empty icon={<ClipboardList size={32} />} title={term ? 'Nada encontrado' : `Nenhum ${labels.singular} na sua tabela`} />
      )}

      {items.data && items.data.data.length > 0 && (
        <div className={items.loading ? 'card table-card is-loading' : 'card table-card'}>
          <table className="table">
            <thead>
              <tr>
                <th>{kind === 'procedures' ? 'Procedimento' : 'Especialidade'}</th>
                <th>Valor</th>
                <th className="hide-sm">Situação</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {items.data.data.map((pc) =>
                editing === pc.id ? (
                  <tr key={pc.id}>
                    <td colSpan={4}>
                      <EditForm kind={kind} item={pc} onCancel={() => setEditing(null)}
                                onSaved={() => { setEditing(null); items.reload() }} />
                    </td>
                  </tr>
                ) : (
                  <tr key={pc.id} className={pc.active ? '' : 'row-inactive'}>
                    <td>
                      <strong>{pc.cpt.description}</strong>
                      {kind === 'procedures' && <div className="muted">Código {pc.cpt.formatted_code}</div>}
                      {!pc.active && <div className="muted show-sm">Inativo</div>}
                    </td>
                    <td className="price">{formatPrice(pc.price, pc.pct)}</td>
                    <td className="hide-sm">
                      <span className={pc.active ? 'badge badge-finalizado' : 'badge badge-trancado'}>{pc.active ? 'Ativo' : 'Inativo'}</span>
                    </td>
                    <td className="row-actions">
                      <button className="btn btn-ghost btn-icon" onClick={() => setEditing(pc.id)} aria-label={`Editar ${pc.cpt.description}`} title="Editar">
                        <Pencil size={17} />
                      </button>
                      {pc.active && (
                        <button className="btn btn-ghost btn-icon" onClick={() => run(() => api.patch(`/${kind}/${pc.id}/deactivate`))}
                                aria-label={`Desativar ${pc.cpt.description}`} title="Desativar">
                          <Ban size={17} />
                        </button>
                      )}
                      <button className="btn btn-ghost btn-icon danger" onClick={() => remove(pc)} aria-label={`Excluir ${pc.cpt.description}`} title="Excluir">
                        <Trash2 size={17} />
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
          <Pagination meta={items.data.meta} onChange={setPage} />
        </div>
      )}
    </div>
  )
}

// Campos de valor: em reais ou em % de desconto (PartnerCpt#pct). Em % o
// valor vai de 0 a 100.
function PriceFields({ price, pct, onPrice, onPct, errors }: {
  price: string
  pct: boolean
  onPrice: (v: string) => void
  onPct: (v: boolean) => void
  errors?: string[]
}) {
  return (
    <>
      <Field label={pct ? 'Desconto (%)' : 'Valor (R$)'} error={errors}>
        <input className="input" inputMode="decimal" value={price} onChange={(e) => onPrice(e.target.value)}
               placeholder={pct ? '10' : '0,00'} required />
      </Field>
      <div className="segmented" role="group" aria-label="Tipo de valor">
        <button type="button" className={!pct ? 'active' : ''} onClick={() => onPct(false)}>Valor em R$</button>
        <button type="button" className={pct ? 'active' : ''} onClick={() => onPct(true)}>% de desconto</button>
      </div>
    </>
  )
}

function EditForm({ kind, item, onCancel, onSaved }: { kind: Kind; item: PartnerCpt; onCancel: () => void; onSaved: () => void }) {
  const [price, setPrice] = useState(priceInput(item.price))
  const [pct, setPct] = useState(item.pct)
  const [active, setActive] = useState(item.active)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setErrors({})
    try {
      await api.patch(`/${kind}/${item.id}`, { price: parsePrice(price), pct, active })
      onSaved()
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message)
        setErrors(e.fields)
      }
      setBusy(false)
    }
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <strong>{item.cpt.description}</strong>
      <Alert>{error}</Alert>
      <div className="inline-form-fields">
        <PriceFields price={price} pct={pct} onPrice={setPrice} onPct={setPct} errors={errors.price} />
        <label className="check">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Ativo
        </label>
      </div>
      <div className="actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </form>
  )
}

// Busca no catálogo o que o conveniado ainda não atende e cadastra com o valor.
function AddPanel({ kind, singular, onClose, onAdded }: { kind: Kind; singular: string; onClose: () => void; onAdded: () => void }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [chosen, setChosen] = useState<Cpt | null>(null)
  const [price, setPrice] = useState('')
  const [pct, setPct] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const term = useDebounced(search)
  const available = useApi(() => api.get<Page<Cpt>>(`/${kind}/available`, { search: term, page }), [kind, term, page])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!chosen) return
    setBusy(true)
    setError('')
    setErrors({})
    try {
      await api.post(`/${kind}`, { cpt_id: chosen.id, price: parsePrice(price), pct })
      onAdded()
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message)
        setErrors(e.fields)
      }
      setBusy(false)
    }
  }

  return (
    <section className="card stack">
      <div className="section-head">
        <h2>Adicionar {singular}</h2>
        <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
      </div>

      {chosen ? (
        <form className="stack" onSubmit={submit}>
          <div className="picked">
            <span><strong>{chosen.description}</strong>{!chosen.specialty && <span className="muted"> · Código {chosen.formatted_code}</span>}</span>
            <button type="button" className="btn btn-link btn-sm" onClick={() => setChosen(null)}>Trocar</button>
          </div>
          <Alert>{error}</Alert>
          <div className="inline-form-fields">
            <PriceFields price={price} pct={pct} onPrice={setPrice} onPct={setPct} errors={errors.price} />
          </div>
          <div className="actions">
            <button className="btn btn-primary" disabled={busy || !price}>{busy ? 'Salvando…' : 'Adicionar à tabela'}</button>
          </div>
        </form>
      ) : (
        <>
          <label className="search">
            <Search size={18} />
            <input className="input" placeholder={`Buscar ${singular} pelo nome ou código`} value={search} autoFocus
                   onChange={(e) => {
                     setSearch(e.target.value)
                     setPage(1)
                   }}
                   aria-label={`Buscar ${singular} para adicionar`} />
          </label>
          <Alert>{available.error}</Alert>
          {available.loading && !available.data && <Spinner />}
          {available.data?.data.length === 0 && <p className="muted">Nada encontrado que ainda não esteja na sua tabela.</p>}
          <ul className="choice-list">
            {available.data?.data.map((cpt) => (
              <li key={cpt.id}>
                <button className="choice" onClick={() => setChosen(cpt)}>
                  <div className="list-body">
                    <strong>{cpt.description}</strong>
                    {!cpt.specialty && <span className="muted">Código {cpt.formatted_code}</span>}
                  </div>
                  <Plus size={18} className="list-icon" />
                </button>
              </li>
            ))}
          </ul>
          {available.data && <Pagination meta={available.data.meta} onChange={setPage} />}
        </>
      )}
    </section>
  )
}
