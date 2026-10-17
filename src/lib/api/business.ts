import type { components } from './generated'
import { authenticatedFetch } from '../auth/session'

type Schemas = components['schemas']
export type Warehouse = Schemas['Warehouse']
export type WarehouseWrite = Schemas['WarehouseWrite']
export type Item = Schemas['Item']
export type ItemWrite = Schemas['ItemWrite']
export type User = Schemas['User']
export type UserCreate = Schemas['UserCreate']
export type UserUpdate = Schemas['UserUpdate']
export type Country = Schemas['Country']
export type RoleLookup = Schemas['RoleLookup']
export type WarehouseStatus = Schemas['WarehouseStatus']
export type ItemQuantity = Schemas['ItemQuantity']
export type LogSummary = Schemas['LogSummary']
export type LogDetail = Schemas['LogDetail']
export type SupplierOrder = Schemas['SupplierOrder']
export type SupplierOrderCreate = Schemas['SupplierOrderCreate']
export type Paged<T> = {
  items: T[]
  page: number
  pageSize: number
  totalCount: string
  totalPages: string
}

export class BusinessError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, status: number) {
    super(code)
    this.code = code
    this.status = status
  }
}

async function request<T>(
  path: string,
  method = 'GET',
  body?: unknown,
  version?: string,
): Promise<T> {
  const response = await authenticatedFetch(new URL(path, window.location.origin), {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(version ? { 'If-Match': `"${version}"` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as { code?: string }
    throw new BusinessError(problem.code ?? 'unavailable', response.status)
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T)
}

function pageQuery(page: number, search = '') {
  const query = new URLSearchParams({ page: String(page), pageSize: '10' })
  if (search.trim()) query.set('search', search.trim())
  return query.toString()
}

export const business = {
  countries: () => request<Country[]>('/api/v1/countries'),
  roles: () => request<RoleLookup[]>('/api/v1/roles'),
  warehouses: (page: number, search = '') =>
    request<Paged<Warehouse>>(`/api/v1/warehouses?${pageQuery(page, search)}`),
  warehouse: (id: number) => request<Warehouse>(`/api/v1/warehouses/${id}`),
  createWarehouse: (body: WarehouseWrite) => request<Warehouse>('/api/v1/warehouses', 'POST', body),
  updateWarehouse: (id: number, body: WarehouseWrite, version: string) =>
    request<Warehouse>(`/api/v1/warehouses/${id}`, 'PUT', body, version),
  deleteWarehouse: (id: number, version: string) =>
    request<void>(`/api/v1/warehouses/${id}`, 'DELETE', undefined, version),
  items: (id: number, page: number, search = '') =>
    request<Paged<Item>>(`/api/v1/warehouses/${id}/items?${pageQuery(page, search)}`),
  createItem: (id: number, body: ItemWrite) =>
    request<Item>(`/api/v1/warehouses/${id}/items`, 'POST', body),
  updateItem: (id: number, itemId: number, body: ItemWrite, version: string) =>
    request<Item>(`/api/v1/warehouses/${id}/items/${itemId}`, 'PUT', body, version),
  deleteItem: (id: number, itemId: number, version: string) =>
    request<void>(`/api/v1/warehouses/${id}/items/${itemId}`, 'DELETE', undefined, version),
  warehouseStatuses: (page: number) =>
    request<Paged<WarehouseStatus>>(`/api/v1/dashboard/warehouses?${pageQuery(page)}`),
  highestItems: () => request<ItemQuantity[]>('/api/v1/dashboard/items/highest'),
  lowestItems: () => request<ItemQuantity[]>('/api/v1/dashboard/items/lowest'),
  users: (page: number, search = '') =>
    request<Paged<User>>(`/api/v1/users?${pageQuery(page, search)}`),
  createUser: (body: UserCreate) => request<User>('/api/v1/users', 'POST', body),
  updateUser: (id: number, body: UserUpdate, version: string) =>
    request<User>(`/api/v1/users/${id}`, 'PUT', body, version),
  deleteUser: (id: number, version: string) =>
    request<void>(`/api/v1/users/${id}`, 'DELETE', undefined, version),
  resetPassword: (id: number, newPassword: string, version: string) =>
    request<void>(`/api/v1/users/${id}/password`, 'PUT', { newPassword }, version),
  logs: (page: number, search = '', level = '') => {
    const query = new URLSearchParams({ page: String(page), pageSize: '10' })
    if (search.trim()) query.set('search', search.trim())
    if (level) query.set('level', level)
    return request<Paged<LogSummary>>(`/api/v1/logs?${query}`)
  },
  log: (id: string) => request<LogDetail>(`/api/v1/logs/${encodeURIComponent(id)}`),
  supplierOrders: (page: number) =>
    request<Paged<SupplierOrder>>(`/api/v1/supplier-orders?${pageQuery(page)}`),
  createSupplierOrder: (body: SupplierOrderCreate) =>
    request<SupplierOrder>('/api/v1/supplier-orders', 'POST', body),
}
