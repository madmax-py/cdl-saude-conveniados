import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePreference } from '../lib/theme'

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
]

// Botão compacto da barra do topo: cada clique passa para o próximo tema.
export function ThemeCycleButton({ className = 'btn-on-dark' }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const index = OPTIONS.findIndex((o) => o.value === theme)
  const current = OPTIONS[index]
  const next = OPTIONS[(index + 1) % OPTIONS.length]
  const Icon = current.icon

  return (
    <button
      className={`btn btn-icon ${className}`}
      onClick={() => setTheme(next.value)}
      title={`Tema: ${current.label}. Clique para ${next.label.toLowerCase()}.`}
      aria-label={`Tema ${current.label}. Mudar para ${next.label}`}
    >
      <Icon size={18} />
    </button>
  )
}

// Escolha explícita, para a página de perfil.
export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="segmented" role="radiogroup" aria-label="Tema">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          className={theme === value ? 'active' : ''}
          onClick={() => setTheme(value)}
        >
          <Icon size={16} /> {label}
        </button>
      ))}
    </div>
  )
}
