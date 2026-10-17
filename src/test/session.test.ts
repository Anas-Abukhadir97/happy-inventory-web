import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authenticatedFetch, clearSession, getSession, login } from '../lib/auth/session'

const user = { id: 1, email: 'admin@example.com', fullName: 'Anas', role: 'Admin' }
const authResponse = (token: string) =>
  Response.json({
    accessToken: token,
    tokenType: 'Bearer',
    expiresAtUtc: new Date(Date.now() + 600000).toISOString(),
    user,
  })

beforeEach(() => {
  clearSession()
  vi.restoreAllMocks()
})

describe('in-memory session client', () => {
  it('refreshes once for a GET 401 and replays it once with the new token', async () => {
    let refreshes = 0
    const requests: string[] = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const request =
        input instanceof Request
          ? input
          : new Request(new URL(input.toString(), 'https://localhost'))
      if (request.url.endsWith('/csrf'))
        return new Response(null, { status: 204, headers: { 'X-CSRF-Token': 'csrf' } })
      if (request.url.endsWith('/login')) return authResponse('first-token')
      if (request.url.endsWith('/refresh')) {
        refreshes++
        return authResponse('second-token')
      }
      requests.push(request.headers.get('Authorization') ?? '')
      return requests.length === 1
        ? new Response(null, { status: 401 })
        : Response.json({ items: [] })
    })
    vi.stubGlobal('fetch', fetchMock)
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem')
    await login('admin@example.com', 'password')
    const response = await authenticatedFetch('https://localhost/api/v1/warehouses')
    expect(response.status).toBe(200)
    expect(requests).toEqual(['Bearer first-token', 'Bearer second-token'])
    expect(refreshes).toBe(1)
    expect(localStorageSpy).not.toHaveBeenCalled()
    expect(getSession().accessToken).toBe('second-token')
  })

  it('refreshes after a mutation 401 without replaying an uncertain write', async () => {
    let writes = 0
    let refreshes = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const request =
          input instanceof Request
            ? input
            : new Request(new URL(input.toString(), 'https://localhost'))
        if (request.url.endsWith('/csrf'))
          return new Response(null, { status: 204, headers: { 'X-CSRF-Token': 'csrf' } })
        if (request.url.endsWith('/login')) return authResponse('first-token')
        if (request.url.endsWith('/refresh')) {
          refreshes++
          return authResponse('second-token')
        }
        writes++
        return new Response(null, { status: 401 })
      }),
    )
    await login('admin@example.com', 'password')
    const response = await authenticatedFetch('https://localhost/api/v1/warehouses', {
      method: 'POST',
    })
    expect(response.status).toBe(401)
    expect(writes).toBe(1)
    expect(refreshes).toBe(1)
  })

  it('shares one refresh between concurrent expired GET requests', async () => {
    let refreshes = 0
    let reads = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const request =
          input instanceof Request
            ? input
            : new Request(new URL(input.toString(), 'https://localhost'))
        if (request.url.endsWith('/csrf'))
          return new Response(null, { status: 204, headers: { 'X-CSRF-Token': 'csrf' } })
        if (request.url.endsWith('/login')) return authResponse('first-token')
        if (request.url.endsWith('/refresh')) {
          refreshes++
          await new Promise((resolve) => setTimeout(resolve, 10))
          return authResponse('second-token')
        }
        reads++
        return request.headers.get('Authorization') === 'Bearer first-token'
          ? new Response(null, { status: 401 })
          : Response.json({ items: [] })
      }),
    )
    await login('admin@example.com', 'password')
    const results = await Promise.all([
      authenticatedFetch('https://localhost/api/v1/warehouses'),
      authenticatedFetch('https://localhost/api/v1/dashboard/warehouses'),
    ])
    expect(results.map((response) => response.status)).toEqual([200, 200])
    expect(refreshes).toBe(1)
    expect(reads).toBe(4)
  })
})
