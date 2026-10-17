import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { AppProviders } from '../app/AppProviders'
import { clearSession } from '../lib/auth/session'
import i18n from '../lib/i18n'
import en from '../locales/en/common.json'
import ar from '../locales/ar/common.json'

const admin = { id: 1, email: 'admin@example.com', fullName: 'Anas', role: 'Admin' }
const auditor = { ...admin, role: 'Auditor' }

function mockAuth({ restored = false, disabled = false, role = 'Admin' } = {}) {
  const user = role === 'Auditor' ? auditor : admin
  let refreshCount = 0
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : input.toString()
    if (url.endsWith('/csrf'))
      return new Response(null, { status: 204, headers: { 'X-CSRF-Token': 'test-csrf' } })
    if (url.endsWith('/refresh')) {
      refreshCount++
      return restored && refreshCount === 1
        ? Response.json({
            accessToken: 'restored-token',
            tokenType: 'Bearer',
            expiresAtUtc: new Date().toISOString(),
            user,
          })
        : Response.json({ code: 'invalid_session' }, { status: 401 })
    }
    if (url.endsWith('/login'))
      return disabled
        ? Response.json({ code: 'account_disabled' }, { status: 403 })
        : Response.json({
            accessToken: 'login-token',
            tokenType: 'Bearer',
            expiresAtUtc: new Date().toISOString(),
            user,
          })
    if (url.endsWith('/logout')) return new Response(null, { status: 204 })
    if (url.endsWith('/api/v1/warehouses') && input instanceof Request && input.method === 'POST')
      return Response.json(
        {
          id: 8,
          name: 'South Depot',
          address: 'Street',
          city: 'Amman',
          countryCode: 'JO',
          version: 'bb6dca14-b1ce-4aa3-918e-4b43ac96241f',
          createdAtUtc: new Date().toISOString(),
          updatedAtUtc: new Date().toISOString(),
        },
        { status: 201 },
      )
    if (url.includes('/api/v1/warehouses?'))
      return Response.json({
        items: [
          {
            id: 7,
            name: 'North Depot',
            address: 'Street',
            city: 'Amman',
            countryCode: 'JO',
            version: 'bb6dca14-b1ce-4aa3-918e-4b43ac96241f',
            createdAtUtc: new Date().toISOString(),
            updatedAtUtc: new Date().toISOString(),
          },
        ],
        page: 1,
        pageSize: 10,
        totalCount: '1',
        totalPages: '1',
      })
    if (url.endsWith('/api/v1/countries'))
      return Response.json([{ code: 'JO', nameKey: 'country.jo' }])
    throw new Error(`Unexpected request: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(async () => {
  clearSession()
  await i18n.changeLanguage('en')
})

function renderApp(path = '/') {
  render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </AppProviders>,
  )
}

describe('Phase 3 session UI', () => {
  it('shows login first and enters the welcome page after sign-in', async () => {
    const fetchMock = mockAuth()
    renderApp()
    expect(await screen.findByRole('heading', { name: en.signIn })).toBeVisible()
    const user = userEvent.setup()
    await user.type(screen.getByRole('textbox', { name: en.email }), 'admin@example.com')
    await user.type(screen.getByLabelText(/Password/), 'correct-password')
    await user.click(screen.getByRole('button', { name: en.signIn }))
    expect(await screen.findByRole('heading', { name: 'Welcome, Anas' })).toBeVisible()
    expect(screen.getAllByRole('link', { name: en.users })[0]).toBeVisible()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/login',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('restores a session on reload and hides Admin navigation from Auditor', async () => {
    mockAuth({ restored: true, role: 'Auditor' })
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Welcome, Anas' })).toBeVisible()
    expect(screen.queryByRole('link', { name: en.users })).not.toBeInTheDocument()
  })

  it('shows the live warehouse list to Auditor without write controls', async () => {
    mockAuth({ restored: true, role: 'Auditor' })
    renderApp('/warehouses')
    expect(await screen.findByRole('link', { name: 'North Depot' })).toBeVisible()
    expect(screen.queryByRole('button', { name: en.addWarehouse })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: en.delete })).not.toBeInTheDocument()
  })

  it('lets Admin submit a warehouse using localized form labels', async () => {
    const fetchMock = mockAuth({ restored: true })
    renderApp('/warehouses')
    await screen.findByRole('link', { name: 'North Depot' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: en.addWarehouse }))
    await user.type(screen.getByRole('textbox', { name: en.warehouseName }), 'South Depot')
    await user.type(screen.getByRole('textbox', { name: en.address }), 'Street')
    await user.type(screen.getByRole('textbox', { name: en.city }), 'Amman')
    await user.click(screen.getByRole('button', { name: en.save }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.any(Request)))
    const posted = fetchMock.mock.calls.some(
      ([input]) =>
        input instanceof Request &&
        input.url.endsWith('/api/v1/warehouses') &&
        input.method === 'POST',
    )
    expect(posted).toBe(true)
  })

  it('shows the localized disabled-account message', async () => {
    mockAuth({ disabled: true })
    renderApp()
    const user = userEvent.setup()
    await user.type(await screen.findByRole('textbox', { name: en.email }), 'disabled@example.com')
    await user.type(screen.getByLabelText(/Password/), 'correct-password')
    await user.click(screen.getByRole('button', { name: en.signIn }))
    expect(await screen.findByRole('alert')).toHaveTextContent(en.loginDisabled)
  })

  it('switches login to Arabic and right-to-left layout', async () => {
    mockAuth()
    renderApp()
    await screen.findByRole('heading', { name: en.signIn })
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: en.language }))
    await user.click(screen.getByRole('option', { name: en.arabic }))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('dir', 'rtl'))
    expect(document.documentElement).toHaveAttribute('lang', 'ar')
    expect(screen.getByRole('heading', { name: ar.signIn })).toBeVisible()
  })

  it('signs out and returns to login', async () => {
    mockAuth({ restored: true })
    renderApp()
    await screen.findByRole('heading', { name: 'Welcome, Anas' })
    await userEvent.setup().click(screen.getByRole('button', { name: en.signOut }))
    expect(await screen.findByRole('heading', { name: en.signIn })).toBeVisible()
  })

  it('has complete nonempty translations', () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort())
    for (const value of [...Object.values(en), ...Object.values(ar)])
      expect(value.trim()).not.toBe('')
  })
})
