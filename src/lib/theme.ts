import { useSyncExternalStore } from 'react'

// Tema da interface. "system" (padrão) segue o claro/escuro do navegador ou
// dispositivo; "light" e "dark" fixam a escolha. Fica em data-theme no <html>,
// que o index.css usa para trocar os tokens de cor.
export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'cdl-saude-conveniados:theme'

function readTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

// Estado único compartilhado: o botão do topo e o seletor do perfil ficam
// sempre em sincronia.
let current: ThemePreference = readTheme()
const listeners = new Set<() => void>()

export function initTheme() {
  document.documentElement.dataset.theme = current
}

export function setTheme(next: ThemePreference) {
  current = next
  document.documentElement.dataset.theme = next
  try {
    if (next === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // sem armazenamento a escolha vale só até recarregar
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current)
  return { theme, setTheme }
}
