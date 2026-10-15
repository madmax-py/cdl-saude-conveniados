import QRCode from 'qrcode'
import { ArrowLeft, CheckCircle2, FilePlus2, XCircle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Card } from '../api/types'
import { Alert, PageHeader, Spinner } from '../components/ui'
import { formatCardNumber, formatCpf } from '../lib/format'
import { useApi } from '../lib/useApi'

// Carteirinha do paciente como ele vê no app (frente) e o QR de validação,
// o mesmo do cartão virtual.
export default function CardDetail() {
  const { id } = useParams()
  const card = useApi(() => api.get<Card>(`/cards/${id}`), [id])
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvas.current && card.data?.qr_token) {
      QRCode.toCanvas(canvas.current, card.data.qr_token, { width: 180, margin: 1 }).catch(() => {})
    }
  }, [card.data?.qr_token])

  if (card.loading) return <Spinner />
  if (!card.data) return <Alert>{card.error}</Alert>
  const c = card.data

  return (
    <div className="stack">
      <Link to="/carteirinhas" className="btn btn-ghost btn-sm back"><ArrowLeft size={16} /> Carteirinhas</Link>
      <PageHeader
        title={c.name}
        subtitle={`CPF ${formatCpf(c.document_number)} · ${c.holder ? 'Titular' : 'Dependente'}`}
        action={c.active ? (
          <Link to="/guias/nova" state={{ patient: c }} className="btn btn-primary"><FilePlus2 size={18} /> Gerar guia</Link>
        ) : undefined}
      />

      <div className={c.active ? 'alert alert-success status-line' : 'alert alert-danger status-line'}>
        {c.active ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
        {c.active ? 'Carteirinha ativa: o paciente pode ser atendido pelo CDL Saúde.' : 'Carteirinha inativa: não é possível gerar guia.'}
      </div>

      <div className="card-detail">
        <div className="vcard-face vcard-front vcard-static">
          <img src="/logo-branca.png" alt="" className="vcard-logo" />
          <div>
            <p className="vcard-number">{formatCardNumber(c.card_number)}</p>
            <span className="vcard-label">{c.holder ? 'Titular' : 'Dependente'}</span>
            <span className="vcard-value">{c.name.split(/\s+/).slice(0, 4).join(' ')}</span>
          </div>
        </div>
        <section className="card qr-panel">
          <h2>QR de validação</h2>
          <canvas ref={canvas} />
          <p className="muted">O mesmo QR do verso do cartão virtual do paciente.</p>
        </section>
      </div>
    </div>
  )
}
