import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { AppProviders } from '../app/AppProviders'
import { clearSession } from '../lib/auth/session'
import { business, BusinessError, type Item, type User, type Warehouse } from '../lib/api/business'
import i18n from '../lib/i18n'
import en from '../locales/en/common.json'

const now = new Date().toISOString()
const version = 'bb6dca14-b1ce-4aa3-918e-4b43ac96241f'
const warehouse: Warehouse = {
  id: 7,
  name: 'North Depot',
  address: 'Street',
  city: 'Amman',
  countryCode: 'JO',
  version,
  createdAtUtc: now,
  updatedAtUtc: now,
}
const item: Item = {
  id: 5,
  warehouseId: 7,
  name: 'Widget',
  sku: null,
  qty: 4,
  costPrice: '12.50',
  msrpPrice: null,
  version,
  createdAtUtc: now,
  updatedAtUtc: now,
}
const account: User = {
  id: 4,
  email: 'manager@example.com',
  fullName: 'Manager One',
  role: 'Management',
  active: true,
  isSystemAdmin: false,
  version,
}

function page<T>(items: T[], number = 1, totalPages = '1') {
  return { items, page: number, pageSize: 10, totalCount: String(items.length), totalPages }
}

function renderAt(path: string, role = 'Admin') {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : input.toString()
      if (url.endsWith('/csrf'))
        return new Response(null, { status: 204, headers: { 'X-CSRF-Token': 'csrf' } })
      if (url.endsWith('/refresh'))
        return Response.json({
          accessToken: 'access',
          tokenType: 'Bearer',
          expiresAtUtc: now,
          user: { id: 1, email: 'admin@example.com', fullName: 'Anas', role },
        })
      throw new Error(`Unexpected request: ${url}`)
    }),
  )
  render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </AppProviders>,
  )
}

beforeEach(async () => {
  clearSession()
  sessionStorage.clear()
  vi.restoreAllMocks()
  await i18n.changeLanguage('en')
})

describe('Phase 4 screens', () => {
  it('shows warehouse totals and quantity extremes', async () => {
    vi.spyOn(business, 'warehouseStatuses').mockResolvedValue(
      page([{ warehouseId: 7, name: 'North Depot', distinctItemCount: '1', totalQuantity: '4' }]),
    )
    vi.spyOn(business, 'highestItems').mockResolvedValue([
      { id: 5, name: 'Widget', warehouseId: 7, warehouseName: 'North Depot', qty: 4 },
    ])
    vi.spyOn(business, 'lowestItems').mockResolvedValue([])
    renderAt('/dashboard', 'Auditor')
    expect(await screen.findByRole('heading', { name: en.dashboard })).toBeVisible()
    expect((await screen.findAllByText('Widget')).length).toBeGreaterThan(0)
    expect(screen.getByText(en.trackedWarehouses)).toBeVisible()
    expect(screen.getByRole('link', { name: en.printReport })).toBeVisible()
  })

  it('validates and creates an item in its warehouse', async () => {
    vi.spyOn(business, 'warehouse').mockResolvedValue(warehouse)
    vi.spyOn(business, 'items').mockResolvedValue(page([item]))
    const create = vi.spyOn(business, 'createItem').mockResolvedValue(item)
    renderAt('/warehouses/7/items')
    expect(await screen.findByText('Widget')).toBeVisible()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: en.addItem }))
    await user.type(screen.getByRole('textbox', { name: en.itemName }), 'Another widget')
    await user.click(screen.getByRole('button', { name: en.save }))
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          name: 'Another widget',
          qty: 1,
          costPrice: '0.00',
        }),
      ),
    )
  })

  it('rejects an invalid item price before sending a write', async () => {
    vi.spyOn(business, 'warehouse').mockResolvedValue(warehouse)
    vi.spyOn(business, 'items').mockResolvedValue(page([item]))
    const create = vi.spyOn(business, 'createItem').mockResolvedValue(item)
    renderAt('/warehouses/7/items')
    await screen.findByText('Widget')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: en.addItem }))
    await user.type(screen.getByRole('textbox', { name: en.itemName }), 'Invalid widget')
    const cost = screen.getByRole('textbox', { name: en.costPrice })
    await user.clear(cost)
    await user.type(cost, '1.234')
    await user.click(screen.getByRole('button', { name: en.save }))
    expect(await screen.findByText(en.invalidItem)).toBeVisible()
    expect(create).not.toHaveBeenCalled()
  })

  it('lets Admin create a user with a role and active state', async () => {
    vi.spyOn(business, 'users').mockResolvedValue(page([account]))
    vi.spyOn(business, 'roles').mockResolvedValue([
      { id: 1, name: 'Admin' },
      { id: 2, name: 'Management' },
      { id: 3, name: 'Auditor' },
    ])
    const create = vi.spyOn(business, 'createUser').mockResolvedValue(account)
    renderAt('/users')
    expect(await screen.findByText('Manager One')).toBeVisible()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: en.addUser }))
    await user.type(screen.getByRole('textbox', { name: en.email }), 'new@example.com')
    await user.type(screen.getByRole('textbox', { name: en.fullName }), 'New Person')
    await user.type(screen.getByLabelText(/Initial password/), 'test-password-123')
    await user.click(screen.getByRole('button', { name: en.save }))
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          fullName: 'New Person',
          roleId: 3,
          active: true,
        }),
      ),
    )
  })

  it('lets Admin reset a user password with the current version', async () => {
    vi.spyOn(business, 'users').mockResolvedValue(page([account]))
    vi.spyOn(business, 'roles').mockResolvedValue([{ id: 2, name: 'Management' }])
    const reset = vi.spyOn(business, 'resetPassword').mockResolvedValue(undefined)
    renderAt('/users')
    await screen.findByText('Manager One')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: en.resetPassword }))
    await user.type(screen.getByLabelText(/New password/), 'new-password-123')
    await user.click(screen.getByRole('button', { name: en.save }))
    await waitFor(() => expect(reset).toHaveBeenCalledWith(4, 'new-password-123', version))
  })

  it('shows a localized conflict when warehouse deletion is rejected', async () => {
    vi.spyOn(business, 'warehouses').mockResolvedValue(page([warehouse]))
    vi.spyOn(business, 'countries').mockResolvedValue([{ code: 'JO', nameKey: 'country.jo' }])
    vi.spyOn(business, 'deleteWarehouse').mockRejectedValue(new BusinessError('conflict', 409))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderAt('/warehouses')
    await screen.findByRole('link', { name: 'North Depot' })
    await userEvent.setup().click(screen.getByRole('button', { name: en.delete }))
    expect(await screen.findByRole('alert')).toHaveTextContent(en.recordConflict)
  })

  it('shows searchable Admin logs and opens a detail record', async () => {
    const logs = vi
      .spyOn(business, 'logs')
      .mockResolvedValue(
        page([
          { id: '123', timestampUtc: now, level: 'Information', message: 'Request completed' },
        ]),
      )
    vi.spyOn(business, 'log').mockResolvedValue({
      id: '123',
      timestampUtc: now,
      level: 'Information',
      message: 'Request completed',
      properties: { RequestPath: '/api/v1/warehouses' },
    })
    renderAt('/logs')
    expect(await screen.findByText('Request completed')).toBeVisible()
    await userEvent.setup().click(screen.getByRole('button', { name: en.viewDetails }))
    expect(await screen.findByRole('heading', { name: en.logDetails })).toBeVisible()
    await userEvent.setup().click(screen.getByRole('button', { name: en.close }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: en.logDetails })).not.toBeInTheDocument(),
    )
    await userEvent.setup().type(screen.getByRole('textbox', { name: en.search }), 'completed')
    await userEvent.setup().click(screen.getByRole('button', { name: en.search }))
    await waitFor(() => expect(logs).toHaveBeenCalledWith(1, 'completed', ''))
  })

  it('shows an empty report without enabling print before data loads', async () => {
    vi.spyOn(business, 'warehouseStatuses').mockResolvedValue(page([]))
    renderAt('/report', 'Auditor')
    expect(await screen.findByText(en.noWarehouses)).toBeVisible()
    expect(screen.getByRole('button', { name: en.printReport })).toBeEnabled()
  })

  it('loads every warehouse and item page for the print report', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    const statuses = vi
      .spyOn(business, 'warehouseStatuses')
      .mockImplementation(async (number) =>
        number === 1
          ? page(
              [{ warehouseId: 7, name: 'North Depot', distinctItemCount: '2', totalQuantity: '5' }],
              1,
              '2',
            )
          : page(
              [{ warehouseId: 8, name: 'South Depot', distinctItemCount: '0', totalQuantity: '0' }],
              2,
              '2',
            ),
      )
    const items = vi
      .spyOn(business, 'items')
      .mockImplementation(async (id, number) =>
        id === 7 && number === 1
          ? page([item], 1, '2')
          : id === 7
            ? page([{ ...item, id: 6, name: 'Another widget', qty: 1 }], 2, '2')
            : page([]),
      )
    renderAt('/report', 'Auditor')
    expect(await screen.findByText('Another widget')).toBeVisible()
    expect(screen.getByText('South Depot')).toBeVisible()
    expect(statuses).toHaveBeenCalledTimes(2)
    expect(items).toHaveBeenCalledTimes(3)
    expect(screen.getByRole('button', { name: en.printReport })).toBeEnabled()
    await userEvent.setup().click(screen.getByRole('button', { name: en.printReport }))
    expect(print).toHaveBeenCalledOnce()
  })

  it('shows the local supplier notice and creates a request for Management', async () => {
    vi.spyOn(business, 'supplierOrders').mockResolvedValue(page([]))
    vi.spyOn(business, 'warehouses').mockResolvedValue(page([warehouse]))
    vi.spyOn(business, 'items').mockResolvedValue(page([item]))
    const create = vi.spyOn(business, 'createSupplierOrder').mockResolvedValue({
      id: version,
      warehouseId: 7,
      itemId: 5,
      requestedQuantity: 3,
      supplierDestination: 'supplier@example.test',
      status: 'Pending',
      createdAtUtc: now,
    })
    renderAt('/supplier-orders', 'Management')
    expect(await screen.findByText(en.localDeliveryNotice)).toBeVisible()
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: en.warehouses }))
    await user.click(await screen.findByRole('option', { name: 'North Depot' }))
    await user.click(screen.getByRole('combobox', { name: en.itemName }))
    await user.click(await screen.findByRole('option', { name: 'Widget' }))
    await user.clear(screen.getByRole('spinbutton', { name: en.requestedQuantity }))
    await user.type(screen.getByRole('spinbutton', { name: en.requestedQuantity }), '3')
    await user.type(
      screen.getByRole('textbox', { name: en.supplierDestination }),
      'supplier@example.test',
    )
    await user.click(screen.getByRole('button', { name: en.createSupplierOrder }))
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        warehouseId: 7,
        itemId: 5,
        requestedQuantity: 3,
        supplierDestination: 'supplier@example.test',
      }),
    )
  })

  it('shows supplier requests read-only for Auditor', async () => {
    vi.spyOn(business, 'supplierOrders').mockResolvedValue(page([]))
    renderAt('/supplier-orders', 'Auditor')
    expect(await screen.findByText(en.noSupplierOrders)).toBeVisible()
    expect(screen.queryByRole('button', { name: en.createSupplierOrder })).not.toBeInTheDocument()
  })
})
