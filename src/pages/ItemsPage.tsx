import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSession } from '../app/SessionContext'
import { business, type Item, type ItemWrite } from '../lib/api/business'
import { LoadError, Loading, PageControls, PageHeading, SearchForm } from './Shared'
import { errorText } from '../lib/api/errors'

type ItemForm = { name: string; sku: string; qty: string; costPrice: string; msrpPrice: string }
const blank: ItemForm = { name: '', sku: '', qty: '1', costPrice: '0.00', msrpPrice: '' }

export function ItemsPage() {
  const { t } = useTranslation()
  const { user } = useSession()
  const { id } = useParams()
  const warehouseId = Number(id)
  const editable = user?.role === 'Admin' || user?.role === 'Management'
  const cache = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Item | null | undefined>(undefined)
  const [form, setForm] = useState<ItemForm>(blank)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const warehouse = useQuery({
    queryKey: ['warehouse', warehouseId],
    queryFn: () => business.warehouse(warehouseId),
    enabled: Number.isInteger(warehouseId),
  })
  const query = useQuery({
    queryKey: ['items', warehouseId, page, search],
    queryFn: () => business.items(warehouseId, page, search),
    enabled: Number.isInteger(warehouseId),
  })

  function open(row: Item | null) {
    setEditing(row)
    setForm(
      row
        ? {
            name: row.name,
            sku: row.sku ?? '',
            qty: String(row.qty),
            costPrice: row.costPrice,
            msrpPrice: row.msrpPrice ?? '',
          }
        : blank,
    )
    setError(null)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const body: ItemWrite = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      qty: Number(form.qty),
      costPrice: form.costPrice,
      msrpPrice: form.msrpPrice || null,
    }
    if (
      !body.name.trim() ||
      body.name.length > 200 ||
      (body.sku?.length ?? 0) > 100 ||
      !Number.isSafeInteger(body.qty) ||
      body.qty < 1 ||
      !/^(0|[1-9]\d{0,8})\.\d{2}$/.test(body.costPrice) ||
      (body.msrpPrice !== null && !/^(0|[1-9]\d{0,8})\.\d{2}$/.test(body.msrpPrice))
    ) {
      setError(t('invalidItem'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (editing) await business.updateItem(warehouseId, editing.id, body, editing.version)
      else await business.createItem(warehouseId, body)
      setEditing(undefined)
      await cache.invalidateQueries({ queryKey: ['items', warehouseId] })
      await cache.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (failure) {
      setError(errorText(failure, t))
    } finally {
      setBusy(false)
    }
  }

  async function remove(row: Item) {
    if (!window.confirm(t('confirmDeleteItem', { name: row.name }))) return
    setError(null)
    try {
      await business.deleteItem(warehouseId, row.id, row.version)
      await cache.invalidateQueries({ queryKey: ['items', warehouseId] })
      await cache.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (failure) {
      setError(errorText(failure, t))
    }
  }

  return (
    <>
      <Button component={Link} to="/warehouses">
        {t('backToWarehouses')}
      </Button>
      <PageHeading title={t('warehouseItems', { name: warehouse.data?.name ?? '' })} />
      {warehouse.isError && (
        <LoadError error={warehouse.error} retry={() => void warehouse.refetch()} />
      )}
      {editable && (
        <Button variant="contained" sx={{ mb: 2 }} onClick={() => open(null)}>
          {t('addItem')}
        </Button>
      )}
      <SearchForm
        submit={(value) => {
          setPage(1)
          setSearch(value)
        }}
      />
      {error && editing === undefined && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <LoadError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          {query.data.items.length === 0 ? (
            <Typography>{t('noItems')}</Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('itemName')}</TableCell>
                  <TableCell>{t('sku')}</TableCell>
                  <TableCell>{t('quantity')}</TableCell>
                  <TableCell>{t('costPrice')}</TableCell>
                  <TableCell>{t('msrpPrice')}</TableCell>
                  <TableCell>{t('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.sku ?? t('notAvailable')}</TableCell>
                    <TableCell>{row.qty}</TableCell>
                    <TableCell>{row.costPrice}</TableCell>
                    <TableCell>{row.msrpPrice ?? t('notAvailable')}</TableCell>
                    <TableCell>
                      {editable && (
                        <Stack direction="row" spacing={1}>
                          <Button onClick={() => open(row)}>{t('edit')}</Button>
                          <Button color="error" onClick={() => void remove(row)}>
                            {t('delete')}
                          </Button>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <PageControls page={page} totalPages={query.data.totalPages} change={setPage} />
        </>
      )}
      <Dialog open={editing !== undefined} onClose={() => !busy && setEditing(undefined)} fullWidth>
        <form noValidate onSubmit={(event) => void save(event)}>
          <DialogTitle>{editing ? t('editItem') : t('addItem')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label={t('itemName')}
                required
                slotProps={{ htmlInput: { maxLength: 200 } }}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
              <TextField
                label={t('sku')}
                slotProps={{ htmlInput: { maxLength: 100 } }}
                value={form.sku}
                onChange={(event) => setForm({ ...form, sku: event.target.value })}
              />
              <TextField
                label={t('quantity')}
                required
                type="number"
                slotProps={{ htmlInput: { min: 1, max: 2147483647, step: 1 } }}
                value={form.qty}
                onChange={(event) => setForm({ ...form, qty: event.target.value })}
              />
              <TextField
                label={t('costPrice')}
                required
                value={form.costPrice}
                helperText={t('priceFormat')}
                onChange={(event) => setForm({ ...form, costPrice: event.target.value })}
              />
              <TextField
                label={t('msrpPrice')}
                value={form.msrpPrice}
                onChange={(event) => setForm({ ...form, msrpPrice: event.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(undefined)} disabled={busy}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant="contained" disabled={busy}>
              {t('save')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  )
}
