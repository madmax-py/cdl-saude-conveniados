// Cliente HTTP da API do painel do conveniado. Guarda o token, põe o header
// Authorization e transforma as respostas de erro em ApiError.

const BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1/partner_panel`
const TOKEN_KEY = 'cdl-saude-conveniados:token'

export class ApiError extends Error {
  status: number
  fields: Record<string, string[]>

  constructor(status: number, messages: string[], fields: Record<string, string[]> = {}) {
    super(messages.join(' ') || 'Não foi possível concluir a operação.')
    this.status = status
    this.fields = fields
  }
}

// localStorage pode não existir (aba anônima com bloqueio, por exemplo): sem
// ele o login só dura até recarregar a página.
let memoryToken: string | null = null

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? memoryToken
  } catch {
    return memoryToken
  }
}

export function setToken(token: string | null) {
  memoryToken = token
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // segue só com o token em memória
  }
}

// Avisado quando a API recusa o token (expirou ou a conta foi desativada).
let onUnauthorized: () => void = () => {}
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

type Query = Record<string, string | number | boolean | null | undefined>

function buildUrl(path: string, query?: Query) {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  })
  return url.toString()
}

async function request<T>(
  method: string,
  path: string,
  options: { query?: Query; body?: unknown; as?: 'json' | 'blob' } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (options.body instanceof FormData) {
    body = options.body
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), { method, headers, body })
  } catch {
    throw new ApiError(0, ['Sem conexão com o servidor. Verifique sua internet e tente de novo.'])
  }

  if (response.status === 204) return undefined as T
  // Arquivos (PDF da guia): no sucesso o corpo é binário; o erro continua JSON.
  if (options.as === 'blob' && response.ok) return (await response.blob()) as T

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    // O 401 dos endpoints de login é "código inválido", não sessão expirada.
    if (response.status === 401 && token && !path.startsWith('/auth/')) onUnauthorized()
    // Sem corpo JSON e com 5xx: o Rails caiu ou o proxy não o alcançou (502).
    if (!data?.errors?.length && response.status >= 500) {
      throw new ApiError(response.status, ['O servidor não respondeu. Tente novamente em instantes.'])
    }
    throw new ApiError(response.status, data?.errors ?? [], data?.fields ?? {})
  }
  return data as T
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
  blob: (path: string) => request<Blob>('GET', path, { as: 'blob' }),
}
