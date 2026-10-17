import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useSession } from '../app/SessionContext'
import { business, type Item, type Warehouse } from '../lib/api/business'
import { errorText } from '../lib/api/errors'
import { LoadError, Loading, PageControls, PageHeading } from './Shared'

async function everyPage<T>(load: (page: number) => Promise<{ items: T[]; totalPages: string }>) {
  const first = await load(1)
  const rows = [...first.items]
  for (let page = 2; page <= Number(first.totalPages); page++)
    rows.push(...(await load(page)).items)
  return rows
}

export function SupplierOrdersPage() {
  const { t, i18n } = useTranslation()
  const { user } = useSession()
  const editable = user?.role === 'Admin' || user?.role === 'Management'
  const cache = useQueryClient()
  const [page, setPage] = useState(1)
  const [warehouseId, setWarehouseId] = useState(0)
  const [itemId, setItemId] = useState(0)
  const [requestedQuantity, setRequestedQuantity] = useState('1')
  const [supplierDestination, setSupplierDestination] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const orders = useQuery({
    queryKey: ['supplier-orders', page],
    queryFn: () => business.supplierOrders(page),
    refetchInterval: 5000,
  })
  const warehouses = useQuery({
    queryKey: ['supplier-warehouses'],
    queryFn: () => everyPage<Warehouse>(business.warehouses),
    enabled: editable,
  })
  const items = useQuery({
    queryKey: ['supplier-items', warehouseId],
    queryFn: () => everyPage<Item>((next) => business.items(warehouseId, next)),
    enabled: editable && warehouseId > 0,
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    const quantity = Number(requestedQuantity)
    if (
      !warehouseId ||
      !itemId ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 2147483647 ||
      !supplierDestination.trim() ||
      supplierDestination.length > 254
    ) {
      setError(t('invalidInput'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await business.createSupplierOrder({
        warehouseId,
        itemId,
        requestedQuantity: quantity,
        supplierDestination: supplierDestination.trim(),
      })
      setSupplierDestination('')
      setRequestedQuantity('1')
      setPage(1)
      await cache.invalidateQueries({ queryKey: ['supplier-orders'] })
    } catch (failure) {
      setError(errorText(failure, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeading title={t('supplierOrders')} description={t('supplierOrdersDescription')} />
      <Alert severity="info" sx={{ mb: 2 }}>
        {t('localDeliveryNotice')}
      </Alert>
      {editable && (
        <Stack component="form" onSubmit={(event) => void submit(event)} spacing={2} sx={{ mb: 4 }}>
          <Typography component="h2" variant="h6">
            {t('createSupplierOrder')}
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          {warehouses.isError && (
            <LoadError error={warehouses.error} retry={() => void warehouses.refetch()} />
          )}
          <TextField
            select
            label={t('warehouses')}
            value={warehouseId || ''}
            required
            onChange={(event) => {
              setWarehouseId(Number(event.target.value))
              setItemId(0)
            }}
          >
            {(warehouses.data ?? []).map((warehouse) => (
              <MenuItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </MenuItem>
            ))}
          </TextField>
          {items.isError && <LoadError error={items.error} retry={() => void items.refetch()} />}
          <TextField
            select
            label={t('itemName')}
            value={itemId || ''}
            required
            disabled={!warehouseId}
            onChange={(event) => setItemId(Number(event.target.value))}
          >
            {(items.data ?? []).map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('requestedQuantity')}
            type="number"
            slotProps={{ htmlInput: { min: 1, step: 1 } }}
            required
            value={requestedQuantity}
            onChange={(event) => setRequestedQuantity(event.target.value)}
          />
          <TextField
            label={t('supplierDestination')}
            type="text"
            required
            value={supplierDestination}
            slotProps={{ htmlInput: { maxLength: 254 } }}
            onChange={(event) => setSupplierDestination(event.target.value)}
          />
          <Button type="submit" variant="contained" disabled={busy || !warehouseId || !itemId}>
            {t('createSupplierOrder')}
          </Button>
        </Stack>
      )}
      {orders.isPending ? (
        <Loading />
      ) : orders.isError ? (
        <LoadError error={orders.error} retry={() => void orders.refetch()} />
      ) : orders.data.items.length === 0 ? (
        <Typography>{t('noSupplierOrders')}</Typography>
      ) : (
        <>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('time')}</TableCell>
                <TableCell>{t('warehouses')}</TableCell>
                <TableCell>{t('itemName')}</TableCell>
                <TableCell>{t('requestedQuantity')}</TableCell>
                <TableCell>{t('supplierDestination')}</TableCell>
                <TableCell>{t('deliveryStatus')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.data.items.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    {new Date(order.createdAtUtc).toLocaleString(i18n.language)}
                  </TableCell>
                  <TableCell>{order.warehouseId}</TableCell>
                  <TableCell>{order.itemId}</TableCell>
                  <TableCell>{order.requestedQuantity}</TableCell>
                  <TableCell>{order.supplierDestination}</TableCell>
                  <TableCell>{t(`supplierStatus.${order.status}`)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PageControls page={page} totalPages={orders.data.totalPages} change={setPage} />
        </>
      )}
    </>
  )
}
