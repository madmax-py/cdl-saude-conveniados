import { ArrowLeft, Building2, Check, ChevronRight, IdCard, Search, Trash2, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { Associate, Card, Order, Page, PartnerCpt } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Alert, Empty, PageHeader, Pagination, Spinner } from '../components/ui'
import { formatCpf, formatDocument, formatPrice } from '../lib/format'
import { useApi, useDebounced } from '../lib/useApi'

interface Patient { id: number; name: string; document_number: string }

// Dois passos: paciente (pela carteirinha ou pelo associado) → procedimentos da
// tabela do próprio conveniado. Vindo da carteirinha, o paciente já chega escolhido.
export default function NewOrder() {
  const navigate = useNavigate()
  const location = useLocation()
  const { me } = useAuth()
  const [patient, setPatient] = useState<Patient | null>((location.state as { patient?: Patient } | null)?.patient ?? null)
  const [selected, setSelected] = useState<Map<number, PartnerCpt>>(new Map())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function toggle(pc: PartnerCpt) {
    const next = new Map(selected)
    if (next.has(pc.cpt.id)) next.delete(pc.cpt.id)
    else next.set(pc.cpt.id, pc)
    setSelected(next)
  }

  async function create() {
    if (!patient) return
    setError('')
    setBusy(true)
    try {
      const order = await api.post<Order>('/orders', { user_id: patient.id, cpt_ids: [...selected.keys()] })
      navigate(`/guias/${order.id}`, { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado.')
      setBusy(false)
    }
  }

  if (me && !me.partner.active) {
    return (
      <div className="stack">
        <PageHeader title="Nova guia" />
        <Alert>Não é possível gerar novas guias: seu cadastro está desativado. Entre em contato com a CDL.</Alert>
      </div>
    )
  }

  const step = patient ? 2 : 1

  return (
    <div className="stack">
      <Link to="/guias" className="btn btn-ghost btn-sm back"><ArrowLeft size={16} /> Guias</Link>
      <PageHeader title="Nova guia" subtitle="Identifique o paciente e escolha os procedimentos." />

      <ol className="steps" aria-label="Etapas">
        {['Paciente', 'Procedimentos'].map((label, i) => (
          <li key={label} className={step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}>
            <span className="step-dot">{step > i + 1 ? <Check size={14} /> : i + 1}</span>
            <span className="step-label">{label}</span>
          </li>
        ))}
      </ol>

      {patient && (
        <div className="picked">
          <span><span className="muted">Paciente:</span> <strong>{patient.name}</strong> <span className="muted">· CPF {formatCpf(patient.document_number)}</span></span>
          <button className="btn btn-link btn-sm" onClick={() => setPatient(null)}>Trocar</button>
        </div>
      )}

      {step === 1 && <PatientStep onPick={setPatient} />}
      {step === 2 && (
        <>
          <ProcedureStep selected={selected} onToggle={toggle} />
          <OrderSummary selected={[...selected.values()]} onRemove={toggle} />
          <Alert>{error}</Alert>
          <div className="actions">
            <button className="btn btn-primary" disabled={busy} onClick={create}>
              {busy ? 'Gerando…' : selected.size ? `Gerar guia com ${selected.size} procedimento${selected.size > 1 ? 's' : ''}` : 'Gerar guia sem procedimentos'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function PatientStep({ onPick }: { onPick: (patient: Patient) => void }) {
  const [mode, setMode] = useState<'card' | 'associate'>('card')
  return (
    <section className="stack">
      <div className="segmented" role="group" aria-label="Como encontrar o paciente">
        <button className={mode === 'card' ? 'active' : ''} onClick={() => setMode('card')}><IdCard size={16} /> Pela carteirinha</button>
        <button className={mode === 'associate' ? 'active' : ''} onClick={() => setMode('associate')}><Building2 size={16} /> Pelo associado</button>
      </div>
      {mode === 'card' ? <CardSearch onPick={onPick} /> : <AssociateBrowser onPick={onPick} />}
    </section>
  )
}

function CardSearch({ onPick }: { onPick: (patient: Patient) => void }) {
  const [input, setInput] = useState('')
  const [term, setTerm] = useState('')
  const cards = useApi(() => (term ? api.get<Page<Card>>('/cards', { search: term }) : Promise.resolve(null)), [term])

  function submit(event: FormEvent) {
    event.preventDefault()
    setTerm(input.trim())
  }

  return (
    <>
      <form className="filters" onSubmit={submit}>
        <label className="search">
          <Search size={18} />
          <input className="input" placeholder="CPF, número da carteirinha ou nome completo" value={input} autoFocus
                 onChange={(e) => setInput(e.target.value)} aria-label="Buscar paciente" />
        </label>
        <button className="btn btn-primary" disabled={!input.trim()}>Buscar</button>
      </form>
      <Alert>{cards.error}</Alert>
      {cards.loading && term && <Spinner />}
      {cards.data?.data.length === 0 && (
        <Empty icon={<IdCard size={32} />} title="Nenhuma carteirinha encontrada">Tente pelo associado do paciente.</Empty>
      )}
      <ul className="choice-list">
        {cards.data?.data.map((c) => (
          <li key={c.id}>
            <button className="choice" disabled={!c.active} onClick={() => onPick(c)}>
              <UserRound size={20} className="list-icon" />
              <div className="list-body">
                <strong>{c.name}</strong>
                <span className="muted">CPF {formatCpf(c.document_number)} · {c.holder ? 'Titular' : 'Dependente'}</span>
              </div>
              {!c.active && <span className="badge badge-trancado">Inativa</span>}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

// Associados da mesma entidade do conveniado → usuários ativos do escolhido.
function AssociateBrowser({ onPick }: { onPick: (patient: Patient) => void }) {
  const [associate, setAssociate] = useState<Associate | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const term = useDebounced(search)
  const associates = useApi(
    () => (associate ? Promise.resolve(null) : api.get<Page<Associate>>('/associates', { search: term, page })),
    [associate, term, page],
  )
  const users = useApi(
    () => (associate ? api.get<{ data: Patient[] }>(`/associates/${associate.id}/users`) : Promise.resolve(null)),
    [associate],
  )

  if (associate) {
    return (
      <>
        <div className="picked">
          <span><span className="muted">Associado:</span> <strong>{associate.trade_name}</strong></span>
          <button className="btn btn-link btn-sm" onClick={() => setAssociate(null)}>Trocar</button>
        </div>
        <Alert>{users.error}</Alert>
        {users.loading && <Spinner />}
        {users.data?.data.length === 0 && <p className="muted">Este associado não tem usuários ativos.</p>}
        <ul className="choice-list">
          {users.data?.data.map((u) => (
            <li key={u.id}>
              <button className="choice" onClick={() => onPick(u)}>
                <UserRound size={20} className="list-icon" />
                <div className="list-body">
                  <strong>{u.name}</strong>
                  <span className="muted">CPF {formatCpf(u.document_number)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </>
    )
  }

  return (
    <>
      <label className="search">
        <Search size={18} />
        <input className="input" placeholder="Nome ou CNPJ do associado" value={search} autoFocus
               onChange={(e) => {
                 setSearch(e.target.value)
                 setPage(1)
               }}
               aria-label="Buscar associado" />
      </label>
      <Alert>{associates.error}</Alert>
      {associates.loading && !associates.data && <Spinner />}
      {associates.data?.data.length === 0 && <Empty icon={<Building2 size={32} />} title="Nenhum associado encontrado" />}
      <ul className="choice-list">
        {associates.data?.data.map((a) => (
          <li key={a.id}>
            <button className="choice" onClick={() => setAssociate(a)}>
              <Building2 size={20} className="list-icon" />
              <div className="list-body">
                <strong>{a.trade_name}</strong>
                <span className="muted">{formatDocument(a.document_number)}</span>
              </div>
              <ChevronRight size={18} className="muted" />
            </button>
          </li>
        ))}
      </ul>
      {associates.data && <Pagination meta={associates.data.meta} onChange={setPage} />}
    </>
  )
}

// Procedimentos e especialidades ativos da tabela do próprio conveniado.
function ProcedureStep({ selected, onToggle }: { selected: Map<number, PartnerCpt>; onToggle: (pc: PartnerCpt) => void }) {
  const [kind, setKind] = useState<'procedures' | 'specialties'>('procedures')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const term = useDebounced(search)
  const items = useApi(() => api.get<Page<PartnerCpt>>(`/${kind}`, { search: term, page }), [kind, term, page])
  const active = items.data?.data.filter((pc) => pc.active) ?? []

  return (
    <section className="card stack">
      <div className="filters">
        <label className="search">
          <Search size={18} />
          <input className="input" placeholder="Buscar por nome, código ou valor" value={search} autoFocus
                 onChange={(e) => {
                   setSearch(e.target.value)
                   setPage(1)
                 }}
                 aria-label="Buscar procedimento" />
        </label>
        <div className="segmented" role="group" aria-label="Tipo">
          <button className={kind === 'procedures' ? 'active' : ''} onClick={() => { setKind('procedures'); setPage(1) }}>Procedimentos</button>
          <button className={kind === 'specialties' ? 'active' : ''} onClick={() => { setKind('specialties'); setPage(1) }}>Especialidades</button>
        </div>
      </div>
      <Alert>{items.error}</Alert>
      {items.loading && !items.data && <Spinner />}
      {items.data && active.length === 0 && <p className="muted">Nenhum item ativo encontrado na sua tabela.</p>}
      <ul className={items.loading ? 'list is-loading' : 'list'}>
        {active.map((pc) => {
          const checked = selected.has(pc.cpt.id)
          return (
            <li key={pc.id}>
              <label className={checked ? 'list-item check-row checked' : 'list-item check-row'}>
                <input type="checkbox" checked={checked} onChange={() => onToggle(pc)} />
                <div className="list-body">
                  <strong>{pc.cpt.description}</strong>
                  <span className="muted">{pc.cpt.specialty ? 'Especialidade' : `Código ${pc.cpt.formatted_code}`}</span>
                </div>
                <span className="price">{formatPrice(pc.price, pc.pct)}</span>
              </label>
            </li>
          )
        })}
      </ul>
      {items.data && <Pagination meta={items.data.meta} onChange={setPage} />}
    </section>
  )
}

// Soma só os valores em reais; os de desconto percentual aparecem à parte.
function OrderSummary({ selected, onRemove }: { selected: PartnerCpt[]; onRemove: (pc: PartnerCpt) => void }) {
  if (selected.length === 0) return null
  const total = selected.filter((pc) => !pc.pct).reduce((sum, pc) => sum + pc.price, 0)
  const withDiscount = selected.filter((pc) => pc.pct).length

  return (
    <section className="card">
      <div className="section-head">
        <h2>Selecionados ({selected.length})</h2>
        <strong className="price">{formatPrice(total, false)}</strong>
      </div>
      {withDiscount > 0 && (
        <p className="muted">
          O total não inclui {withDiscount === 1 ? 'o item' : `os ${withDiscount} itens`} com desconto percentual.
        </p>
      )}
      <ul className="list">
        {selected.map((pc) => (
          <li key={pc.cpt.id} className="list-item list-item-compact">
            <div className="list-body"><strong>{pc.cpt.description}</strong></div>
            <span className="price">{formatPrice(pc.price, pc.pct)}</span>
            <button className="btn btn-ghost btn-icon danger" onClick={() => onRemove(pc)} aria-label={`Remover ${pc.cpt.description}`}>
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
