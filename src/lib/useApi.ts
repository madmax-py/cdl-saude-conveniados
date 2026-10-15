import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'

// Carrega um recurso da API e refaz a busca quando as dependências mudam.
// Respostas que chegam fora de ordem (busca digitada rápido) são descartadas.
export function useApi<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(loader, deps)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    load()
      .then((result) => active && setData(result))
      .catch((e: unknown) => active && setError(e instanceof ApiError ? e.message : 'Erro inesperado.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [load, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { data, error, loading, reload, setData }
}

// Atrasa o valor (ex.: texto de busca) para não chamar a API a cada tecla.
export function useDebounced<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}
