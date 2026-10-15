import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, getToken, setToken, setUnauthorizedHandler } from '../api/client'
import type { Me } from '../api/types'

interface AuthValue {
  me: Me | null
  loading: boolean
  login: (token: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
  setMe: (me: Me) => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(() => Boolean(getToken()))

  const logout = useCallback(() => {
    setToken(null)
    setMe(null)
  }, [])

  const refresh = useCallback(async () => {
    setMe(await api.get<Me>('/me'))
  }, [])

  const login = useCallback(
    async (token: string) => {
      setToken(token)
      await refresh()
    },
    [refresh],
  )

  useEffect(() => {
    setUnauthorizedHandler(logout)
    if (!getToken()) return

    refresh()
      .catch(() => logout())
      .finally(() => setLoading(false))
  }, [logout, refresh])

  const value = useMemo<AuthValue>(
    () => ({ me, loading, login, logout, refresh, setMe }),
    [me, loading, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return value
}
