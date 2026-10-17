import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSession } from '../app/SessionContext'
import { business, type Warehouse, type WarehouseWrite } from '../lib/api/business'
import { LoadError, Loading, PageControls, PageHeading, SearchForm } from './Shared'
import { errorText } from '../lib/api/errors'

const blank: WarehouseWrite = { name: '', address: '', city: '', countryCode: 'JO' }

export function WarehousesPage() {
  const { t } = useTranslation()
  const { user } = useSession()
  const editable = user?.role === 'Admin' || user?.role === 'Management'
  const cache = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Warehouse | null | undefined>(undefined)
  const [form, setForm] = useState<WarehouseWrite>(blank)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['warehouses', page, search],
    queryFn: () => business.warehouses(page, search),
  })
  const countries = useQuery({ queryKey: ['countries'], queryFn: business.countries })

  function open(row: Warehouse | null) {
    setEditing(row)
    setForm(
      row
        ? { name: row.name, address: row.address, city: row.city, countryCode: row.countryCode }
        : blank,
    )
    setError(null)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (
      !form.name?.trim() ||
      !form.address?.trim() ||
      !form.city?.trim() ||
      form.name.length > 200 ||
      form.address.length > 1000 ||
      form.city.length > 100 ||
      !form.countryCode ||
      form.countryCode.length !== 2
    ) {
      setError(t('invalidInput'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (editing) await business.updateWarehouse(editing.id, form, editing.version)
      else await business.createWarehouse(form)
      setEditing(undefined)
      await cache.invalidateQueries({ queryKey: ['warehouses'] })
      await cache.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (failure) {
      setError(errorText(failure, t))
    } finally {
      setBusy(false)
    }
  }

  async function remove(row: Warehouse) {
    if (!window.confirm(t('confirmDeleteWarehouse', { name: row.name }))) return
    setError(null)
    try {
      await business.deleteWarehouse(row.id, row.version)
      await cache.invalidateQueries({ queryKey: ['warehouses'] })
      await cache.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (failure) {
      setError(errorText(failure, t))
    }
  }

  return (
    <>
      <PageHeading title={t('warehouses')} description={t('warehousesDescription')} />
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        {editable && (
          <Button variant="contained" onClick={() => open(null)}>
            {t('addWarehouse')}
          </Button>
        )}
      </Stack>
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
            <Typography>{t('noWarehouses')}</Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('warehouseName')}</TableCell>
                  <TableCell>{t('city')}</TableCell>
                  <TableCell>{t('country')}</TableCell>
                  <TableCell>{t('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Button component={Link} to={`/warehouses/${row.id}/items`}>
                        {row.name}
                      </Button>
                    </TableCell>
                    <TableCell>{row.city}</TableCell>
                    <TableCell>{t(`country.${row.countryCode.toLowerCase()}`)}</TableCell>
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
          <DialogTitle>{editing ? t('editWarehouse') : t('addWarehouse')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label={t('warehouseName')}
                required
                slotProps={{ htmlInput: { maxLength: 200 } }}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
              <TextField
                label={t('address')}
                required
                slotProps={{ htmlInput: { maxLength: 1000 } }}
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
              <TextField
                label={t('city')}
                required
                slotProps={{ htmlInput: { maxLength: 100 } }}
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
              />
              <FormControl required>
                <InputLabel id="warehouse-country">{t('country')}</InputLabel>
                <Select
                  labelId="warehouse-country"
                  label={t('country')}
                  value={form.countryCode}
                  onChange={(event) => setForm({ ...form, countryCode: event.target.value })}
                >
                  {(countries.data ?? []).map((country) => (
                    <MenuItem key={country.code} value={country.code}>
                      {t(country.nameKey)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(undefined)} disabled={busy}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant="contained" disabled={busy || countries.isPending}>
              {t('save')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  )
}
