import { IdCard, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Card, Page } from '../api/types'
import { Alert, Empty, PageHeader, Pagination, Spinner } from '../components/ui'
import { formatCardNumber, formatCpf } from '../lib/format'
import { useApi } from '../lib/useApi'

// Consulta feita no atendimento: o nome precisa ser o completo, e CPF ou número
// da carteirinha valem com ou sem pontuação. Sem busca a API não lista ninguém.
export default function Cards() {
  const [input, setInput] = useState('')
  const [term, setTerm] = useState('')
  const [page, setPage] = useState(1)
  const cards = useApi(
    () => (term ? api.get<Page<Card>>('/cards', { search: term, page }) : Promise.resolve(null)),
    [term, page],
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    setTerm(input.trim())
    setPage(1)
  }

  return (
    <div className="stack">
      <PageHeader title="Carteirinhas" subtitle="Confira se o paciente tem o CDL Saúde antes do atendimento." />

      <form className="filters" onSubmit={submit}>
        <label className="search">
          <Search size={18} />
          <input className="input" placeholder="Nome completo, CPF ou número da carteirinha" value={input} autoFocus
                 onChange={(e) => setInput(e.target.value)} aria-label="Buscar carteirinha" />
        </label>
        <button className="btn btn-primary" disabled={!input.trim()}>Consultar</button>
      </form>

      <Alert>{cards.error}</Alert>
      {cards.loading && term && <Spinner />}
      {!term && (
        <Empty icon={<IdCard size={32} />} title="Consulte pelo CPF, nome completo ou número da carteirinha">
          O número da carteirinha aparece no cartão virtual do paciente.
        </Empty>
      )}
      {cards.data?.data.length === 0 && (
        <Empty icon={<IdCard size={32} />} title="Nenhuma carteirinha encontrada">
          Confira o documento. A busca por nome precisa do nome completo.
        </Empty>
      )}

      <ul className="choice-list">
        {cards.data?.data.map((card) => (
          <li key={card.id}>
            <Link to={`/carteirinhas/${card.id}`} className="choice">
              <IdCard size={20} className="list-icon" />
              <div className="list-body">
                <strong>{card.name}</strong>
                <span className="muted">CPF {formatCpf(card.document_number)} · Nº {formatCardNumber(card.card_number)}</span>
              </div>
              <span className={card.active ? 'badge badge-finalizado' : 'badge badge-trancado'}>
                {card.active ? 'Ativa' : 'Inativa'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {cards.data && <Pagination meta={cards.data.meta} onChange={setPage} />}
    </div>
  )
}
