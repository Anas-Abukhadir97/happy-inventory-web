import { beforeEach, describe, expect, it, vi } from 'vitest'
import { business, BusinessError } from '../lib/api/business'
import { errorText } from '../lib/api/errors'
import en from '../locales/en/common.json'
import { clearSession, login } from '../lib/auth/session'

const user = { id: 1, email: 'admin@example.com', fullName: 'Anas', role: 'Admin' }

beforeEach(() => {
  clearSession()
  vi.restoreAllMocks()
})

describe('business API transport', () => {
  it('maps stale and unavailable failures to user-facing resources', () => {
    const translate = (key: string) => en[key as keyof typeof en]
    expect(errorText(new BusinessError('stale_version', 412), translate)).toBe(en.staleRecord)
    expect(errorText(new BusinessError('authentication_required', 401), translate)).toBe(
      en.requestUnauthorized,
    )
    expect(errorText(new BusinessError('rate_limited', 429), translate)).toBe(en.requestRateLimited)
    expect(errorText(new BusinessError('unknown', 500), translate)).toBe(en.serviceUnavailable)
    expect(errorText(new Error('offline'), translate)).toBe(en.serviceUnavailable)
  })
  it('sends bearer credentials, capped list size, and the current ETag on edits', async () => {
    const requests: Request[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const request =
          input instanceof Request
            ? input
            : new Request(new URL(input.toString(), 'https://localhost'), init)
        if (request.url.endsWith('/csrf'))
          return new Response(null, { status: 204, headers: { 'X-CSRF-Token': 'csrf' } })
        if (request.url.endsWith('/login'))
          return Response.json({
            accessToken: 'test-access',
            tokenType: 'Bearer',
            expiresAtUtc: new Date().toISOString(),
            user,
          })
        requests.push(request)
        if (request.method === 'GET')
          return Response.json({
            items: [],
            page: 2,
            pageSize: 10,
            totalCount: '0',
            totalPages: '0',
          })
        if (request.method === 'DELETE') return new Response(null, { status: 204 })
        return Response.json({ id: 4, name: 'Updated' })
      }),
    )
    await login('admin@example.com', 'password')
    await business.warehouses(2, 'north')
    await business.updateWarehouse(
      4,
      { name: 'Updated', address: 'A', city: 'Amman', countryCode: 'JO' },
      'bb6dca14-b1ce-4aa3-918e-4b43ac96241f',
    )
    await business.deleteWarehouse(4, 'bb6dca14-b1ce-4aa3-918e-4b43ac96241f')
    expect(requests[0].url).toContain('page=2&pageSize=10&search=north')
    expect(requests[0].headers.get('Authorization')).toBe('Bearer test-access')
    expect(requests[1].headers.get('If-Match')).toBe('"bb6dca14-b1ce-4aa3-918e-4b43ac96241f"')
  })

  it('preserves conflict errors so the page can show localized feedback', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input.toString()
        if (url.endsWith('/csrf'))
          return new Response(null, { status: 204, headers: { 'X-CSRF-Token': 'csrf' } })
        if (url.endsWith('/login'))
          return Response.json({
            accessToken: 'test-access',
            tokenType: 'Bearer',
            expiresAtUtc: new Date().toISOString(),
            user,
          })
        return Response.json({ code: 'stale_version' }, { status: 412 })
      }),
    )
    await login('admin@example.com', 'password')
    await expect(
      business.deleteWarehouse(4, 'bb6dca14-b1ce-4aa3-918e-4b43ac96241f'),
    ).rejects.toEqual(new BusinessError('stale_version', 412))
  })
})
