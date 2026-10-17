import type { components } from '../api/generated'

export type CurrentUser = components['schemas']['CurrentUser']
type LoginResponse = components['schemas']['LoginResponse']
type Listener = () => void

export class AuthError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, status: number) {
    super(code)
    this.code = code
    this.status = status
  }
}

let accessToken: string | null = null
let currentUser: CurrentUser | null = null
let pendingRefresh: Promise<CurrentUser | null> | null = null
let sessionEpoch = 0
const blockedKey = 'happy-inventory-refresh-blocked'
const listeners = new Set<Listener>()
const channel =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('happy-inventory-auth')

channel?.addEventListener('message', (event: MessageEvent) => {
  if (event.data === 'logout') clearSession()
})

function notify() {
  for (const listener of listeners) listener()
}

function setSession(result: LoginResponse) {
  accessToken = result.accessToken
  currentUser = result.user
  notify()
}

export function clearSession() {
  sessionEpoch++
  accessToken = null
  currentUser = null
  notify()
}

export function getSession() {
  return { accessToken, currentUser }
}

export function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

async function csrfToken(): Promise<string> {
  const response = await fetch('/api/v1/auth/csrf', {
    credentials: 'same-origin',
    cache: 'no-store',
  })
  const token = response.headers.get('X-CSRF-Token')
  if (!response.ok || !token) throw new AuthError('csrf_failed', response.status)
  return token
}

async function post(path: string, body?: unknown): Promise<Response> {
  const token = await csrfToken()
  return fetch(`/api/v1/auth/${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      'X-CSRF-Token': token,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

async function errorFrom(response: Response): Promise<AuthError> {
  const problem = (await response.json().catch(() => ({}))) as { code?: string }
  return new AuthError(problem.code ?? 'auth_failed', response.status)
}

export async function login(email: string, password: string): Promise<void> {
  const response = await post('login', { email, password, sessionMode: 'browser' })
  if (!response.ok) throw await errorFrom(response)
  sessionStorage.removeItem(blockedKey)
  sessionEpoch++
  setSession((await response.json()) as LoginResponse)
}

async function performRefresh(): Promise<CurrentUser | null> {
  if (sessionStorage.getItem(blockedKey) === '1') return null
  const epoch = sessionEpoch
  const hadAccess = accessToken !== null
  const execute = async () => {
    const response = await post('refresh')
    if (!response.ok) throw await errorFrom(response)
    const result = (await response.json()) as LoginResponse
    if (sessionEpoch !== epoch) return null
    setSession(result)
    return result.user
  }
  try {
    // Browser tabs share the refresh cookie. Serializing redemption prevents an old-token replay.
    if (navigator.locks?.request)
      return await navigator.locks.request('happy-inventory-refresh', execute)
    return await execute()
  } catch {
    if (hadAccess) {
      sessionStorage.setItem(blockedKey, '1')
      channel?.postMessage('logout')
    }
    clearSession()
    return null
  }
}

export function refreshSession(): Promise<CurrentUser | null> {
  pendingRefresh ??= performRefresh().finally(() => {
    pendingRefresh = null
  })
  return pendingRefresh
}

export async function logout(): Promise<void> {
  const response = await post('logout')
  if (!response.ok) throw await errorFrom(response)
  sessionStorage.removeItem(blockedKey)
  clearSession()
  channel?.postMessage('logout')
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const firstToken = accessToken
  const request = new Request(input, init)
  if (firstToken) request.headers.set('Authorization', `Bearer ${firstToken}`)
  const response = await fetch(request)
  if (response.status !== 401 || !firstToken) return response

  const user = await refreshSession()
  if (!user || request.method !== 'GET') return response
  const retry = new Request(input, init)
  retry.headers.set('Authorization', `Bearer ${accessToken}`)
  return fetch(retry)
}
