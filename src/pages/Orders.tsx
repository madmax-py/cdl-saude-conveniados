import { FilePlus2, FileText, Printer, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { Order, OrderStatus, Page } from '../api/types'
import { Alert, Empty, PageHeader, Pagination, Spinner, StatusBadge } from '../components/ui'
import { formatCpf, formatDateTime, statusLabel } from '../lib/format'
import { printOrder } from '../lib/printOrder'
import { useApi, useDebounced } from '../lib/useApi'

export default function Orders() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [page, setPage] = useState(1)
  const [printError, setPrintError] = useState('')
  const term = useDebounced(search)
  const navigate = useNavigate()

  function print(id: number) {
    setPrintError('')
    printOrder(id).catch((e) => setPrintError(e instanceof ApiError ? e.message : 'Erro inesperado.'))
  }

  const orders = useApi(() => api.get<Page<Order>>('/orders', { search: term, status, page }), [term, status, page])

  return (
    <div className="stack">
      <PageHeader
        title="Guias"
        subtitle="Guias emitidas para atendimento no seu estabelecimento."
        action={
          <Link to="/guias/nova" className="btn btn-primary">
            <FilePlus2 size={18} /> Nova guia
          </Link>
        }
      />

      <div className="filters">
        <label className="search">
          <Search size={18} />
          <input
            className="input"
            placeholder="Número da guia, nome ou CPF"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            aria-label="Buscar guias"
          />
        </label>
        <select
          className="input"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as OrderStatus | '')
            setPage(1)
          }}
          aria-label="Filtrar por situação"
        >
          <option value="">Todas as situações</option>
          {(Object.keys(statusLabel) as OrderStatus[]).map((s) => (
            <option key={s} value={s}>{statusLabel[s]}</option>
          ))}
        </select>
      </div>

      <Alert>{orders.error || printError}</Alert>
      {orders.loading && !orders.data && <Spinner />}

      {orders.data && orders.data.data.length === 0 && (
        <Empty icon={<FileText size={32} />} title={term || status ? 'Nenhuma guia encontrada' : 'Nenhuma guia ainda'}>
          {!term && !status && <Link to="/guias/nova" className="btn btn-primary">Gerar a primeira guia</Link>}
        </Empty>
      )}

      {orders.data && orders.data.data.length > 0 && (
        <div className={orders.loading ? 'card table-card is-loading' : 'card table-card'}>
          <table className="table">
            <thead>
              <tr>
                <th>Guia</th>
                <th>Paciente</th>
                <th className="hide-sm">CPF</th>
                <th className="hide-sm">Emitida em</th>
                <th>Situação</th>
                <th aria-label="Imprimir" />
              </tr>
            </thead>
            <tbody>
              {orders.data.data.map((order) => (
                // A linha toda abre a guia; o link no número mantém o acesso
                // por teclado e o "abrir em nova aba".
                <tr key={order.id} className="row-clickable" onClick={() => navigate(`/guias/${order.id}`)}>
                  <td><Link to={`/guias/${order.id}`} className="row-link">#{order.id}</Link></td>
                  <td>{order.user?.name}</td>
                  <td className="hide-sm">{order.user && formatCpf(order.user.document_number)}</td>
                  <td className="hide-sm">{formatDateTime(order.created_at)}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td className="row-actions">
                    {order.status === 'finalizado' && (
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          print(order.id)
                        }}
                        title="Imprimir guia"
                        aria-label={`Imprimir guia ${order.id}`}
                      >
                        <Printer size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={orders.data.meta} onChange={setPage} />
        </div>
      )}
    </div>
  )
}
