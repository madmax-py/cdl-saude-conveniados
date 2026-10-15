import { ClipboardList, FilePlus2, FileText, Home, IdCard, LogOut } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { firstNames } from '../lib/format'
import { ThemeCycleButton } from './ThemeToggle'

const LINKS = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/guias', label: 'Guias', icon: FileText },
  { to: '/carteirinhas', label: 'Carteirinhas', icon: IdCard },
  { to: '/procedimentos', label: 'Procedimentos', icon: ClipboardList },
]

// No computador a navegação fica numa barra lateral fixa; no celular, numa
// barra embaixo, ao alcance do polegar. O topo guarda só perfil, tema e sair.
export default function Layout() {
  const { me, logout } = useAuth()
  const displayName = me?.partner.trade_name ?? ''

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link to="/" className="sidebar-brand" aria-label="Início">
          <img src="/logo-branca.png" alt="CDL Saúde" />
        </Link>

        <Link to="/guias/nova" className="btn btn-light btn-block sidebar-cta">
          <FilePlus2 size={18} /> Gerar guia
        </Link>

        <nav className="sidebar-nav" aria-label="Principal">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="sidebar-link">
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <p className="sidebar-footer">
          {me?.partner.trade_name}
          <span>Painel do conveniado</span>
        </p>
      </aside>

      <div className="main">
        <header className="topbar">
          {/* O logo só aparece aqui no celular; no computador ele está na barra lateral. */}
          <Link to="/" className="topbar-home" aria-label="Início">
            <img src="/logo-branca.png" alt="CDL Saúde" className="topbar-logo" />
          </Link>
          <div className="topbar-user">
            {/* A foto com o nome é o acesso ao perfil (no celular, só a foto). */}
            <NavLink to="/perfil" className="topbar-profile" title="Meu perfil" aria-label="Meu perfil">
              {me?.account.avatar_url ? (
                <img src={me.account.avatar_url} alt="" className="avatar avatar-sm" />
              ) : (
                <span className="avatar avatar-sm avatar-initials">{displayName.charAt(0)}</span>
              )}
              <span className="topbar-name">{firstNames(displayName, 3)}</span>
            </NavLink>
            <ThemeCycleButton className="topbar-btn" />
            <button className="btn btn-icon topbar-btn" onClick={logout} title="Sair" aria-label="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <nav className="bottomnav" aria-label="Principal">
        {LINKS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="bottomnav-link">
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
