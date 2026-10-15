import { CheckCircle2, Eye, EyeOff, Stethoscope } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { TokenResponse } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { ThemeCycleButton } from '../components/ThemeToggle'
import { Alert, Field } from '../components/ui'

// A redefinição de senha (código por e-mail) continua no painel web.
const WEB_URL = import.meta.env.VITE_WEB_URL ?? ''

// O conveniado entra com o e-mail cadastrado e a senha (a inicial é o CPF ou
// CNPJ do conveniado).
export default function Login() {
  const { me, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (me) return <Navigate to={from} replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { token } = await api.post<TokenResponse>('/auth/login', { email: email.trim(), password })
      await login(token)
      navigate(from, { replace: true })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado.')
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-theme"><ThemeCycleButton /></div>
      <div className="auth-brand">
        <img src="/logo-branca.png" alt="CDL Saúde" />
        <span className="auth-badge"><Stethoscope /> Portal do conveniado</span>
        <p>Confira carteirinhas, emita guias e mantenha sua tabela de procedimentos.</p>
        <ul className="auth-points">
          <li><CheckCircle2 size={18} /> Validação de carteirinhas</li>
          <li><CheckCircle2 size={18} /> Emissão de guias</li>
          <li><CheckCircle2 size={18} /> Tabela de procedimentos</li>
        </ul>
      </div>

      <div className="auth-card card">
        <form onSubmit={submit} className="stack">
          <div>
            <h1>Entrar</h1>
            <p className="muted">Use o e-mail cadastrado do conveniado e sua senha.</p>
          </div>
          <Alert>{error}</Alert>
          <Field label="E-mail">
            <input className="input" type="email" autoComplete="username" placeholder="contato@clinica.com.br"
                   value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Senha">
            <div className="input-group">
              <input className="input" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                     value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          <button className="btn btn-primary btn-block" disabled={busy || !email || !password}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
          <a className="btn btn-link" href={`${WEB_URL}/partner_panel/senha/esqueci`}>Esqueci minha senha</a>
        </form>
      </div>
    </div>
  )
}
