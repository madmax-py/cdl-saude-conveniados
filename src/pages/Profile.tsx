import { Camera, KeyRound } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { api, ApiError } from '../api/client'
import type { Me } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { ThemeSelector } from '../components/ThemeToggle'
import { Alert, Field, PageHeader } from '../components/ui'
import { formatDocument, formatPhone } from '../lib/format'

type Message = { tone: 'danger' | 'success'; text: string } | null

// Os dados cadastrais do conveniado são mantidos pela CDL: aqui só aparecem.
// O que a própria conta muda é a foto, a senha e o tema.
export default function Profile() {
  const { me, setMe } = useAuth()
  const fileInput = useRef<HTMLInputElement>(null)
  const [avatarMessage, setAvatarMessage] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  if (!me) return null
  const a = me.partner
  const displayName = a.trade_name

  async function uploadAvatar(file: File | undefined) {
    if (!file) return
    const data = new FormData()
    data.append('avatar', file)
    setAvatarMessage(null)
    setBusy(true)
    try {
      setMe(await api.patch<Me>('/me', data))
      setAvatarMessage({ tone: 'success', text: 'Foto atualizada.' })
    } catch (e) {
      setAvatarMessage({ tone: 'danger', text: e instanceof ApiError ? e.message : 'Erro inesperado.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <PageHeader title="Meu perfil" />

      <section className="card profile-head">
        <button type="button" className="avatar-edit" onClick={() => fileInput.current?.click()} disabled={busy}
                aria-label="Trocar foto de perfil">
          {me.account.avatar_url ? (
            <img src={me.account.avatar_url} alt="" className="avatar avatar-lg" />
          ) : (
            <span className="avatar avatar-lg avatar-initials">{displayName.charAt(0)}</span>
          )}
          <span className="avatar-badge"><Camera size={16} /></span>
        </button>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => uploadAvatar(e.target.files?.[0])} />
        <div>
          <h2>{displayName}</h2>
          <p className="muted">
            Conta do conveniado · {me.account.email}
          </p>
        </div>
      </section>
      {avatarMessage && <Alert tone={avatarMessage.tone}>{avatarMessage.text}</Alert>}

      <section className="card stack">
        <div>
          <h2>Dados do conveniado</h2>
          <p className="muted">Para corrigir algum dado, fale com a CDL.</p>
        </div>
        <dl className="info-grid">
          <div><dt>Nome fantasia</dt><dd>{a.trade_name}</dd></div>
          <div><dt>Razão social</dt><dd>{a.legal_name}</dd></div>
          <div><dt>{a.document_number.length > 11 ? 'CNPJ' : 'CPF'}</dt><dd>{formatDocument(a.document_number)}</dd></div>
          <div><dt>Site</dt><dd>{a.website || '—'}</dd></div>
          <div><dt>E-mail</dt><dd>{a.email}</dd></div>
          <div><dt>Telefone</dt><dd>{formatPhone(a.phone)}</dd></div>
          <div className="info-wide">
            <dt>Endereço</dt>
            <dd>
              {a.address.street}, {a.address.number}{a.address.complement && ` - ${a.address.complement}`} · {a.address.district}
              {a.address.city && ` · ${a.address.city}/${a.address.state}`}
            </dd>
          </div>
          <div>
            <dt>Situação</dt>
            <dd><span className={a.active ? 'badge badge-finalizado' : 'badge badge-trancado'}>{a.active ? 'Ativo' : 'Desativado'}</span></dd>
          </div>
        </dl>
      </section>

      <PasswordForm />

      <section className="card stack">
        <div>
          <h2>Aparência</h2>
          <p className="muted">"Sistema" acompanha o tema claro ou escuro do seu navegador ou dispositivo.</p>
        </div>
        <ThemeSelector />
      </section>
    </div>
  )
}

function PasswordForm() {
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [message, setMessage] = useState<Message>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    setErrors({})
    if (password !== confirmation) {
      setErrors({ password_confirmation: ['não confere com a nova senha'] })
      return
    }
    setBusy(true)
    try {
      await api.patch('/me/password', { current_password: current, password, password_confirmation: confirmation })
      setCurrent('')
      setPassword('')
      setConfirmation('')
      setMessage({ tone: 'success', text: 'Senha alterada. Use a nova senha no próximo acesso.' })
    } catch (e) {
      if (e instanceof ApiError) {
        setMessage({ tone: 'danger', text: e.message })
        setErrors(e.fields)
      } else {
        setMessage({ tone: 'danger', text: 'Erro inesperado.' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <div>
        <h2><KeyRound size={18} className="inline-icon" /> Alterar senha</h2>
        <p className="muted">Se você ainda usa a senha inicial (o CPF ou CNPJ), troque por uma sua.</p>
      </div>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <div className="form-grid">
        <Field label="Senha atual" error={errors.password_current}>
          <input className="input" type="password" autoComplete="current-password" value={current}
                 onChange={(e) => setCurrent(e.target.value)} required />
        </Field>
        <span className="form-spacer" />
        <Field label="Nova senha" error={errors.password} hint="Pelo menos 6 caracteres.">
          <input className="input" type="password" autoComplete="new-password" minLength={6} value={password}
                 onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <Field label="Confirme a nova senha" error={errors.password_confirmation}>
          <input className="input" type="password" autoComplete="new-password" value={confirmation}
                 onChange={(e) => setConfirmation(e.target.value)} required />
        </Field>
      </div>
      <div className="actions">
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Alterar senha'}</button>
      </div>
    </form>
  )
}
