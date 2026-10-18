import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { business, type User, type UserCreate, type UserUpdate } from '../lib/api/business'
import {
  LoadError,
  Loading,
  PageControls,
  PageHeading,
  SearchForm,
  ResponsiveTable,
} from './Shared'
import { errorText } from '../lib/api/errors'

type UserForm = {
  email: string
  fullName: string
  roleId: number
  active: boolean
  initialPassword: string
}
const blank: UserForm = { email: '', fullName: '', roleId: 3, active: true, initialPassword: '' }

export function UsersPage() {
  const { t } = useTranslation()
  const cache = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<User | null | undefined>(undefined)
  const [resetUser, setResetUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [form, setForm] = useState<UserForm>(blank)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => business.users(page, search),
  })
  const roles = useQuery({ queryKey: ['roles'], queryFn: business.roles })

  function open(row: User | null) {
    setEditing(row)
    setForm(
      row
        ? {
            email: row.email,
            fullName: row.fullName,
            roleId: roles.data?.find((role) => role.name === row.role)?.id ?? 3,
            active: row.active,
            initialPassword: '',
          }
        : blank,
    )
    setError(null)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ||
      form.email.length > 254 ||
      !form.fullName.trim() ||
      form.fullName.length > 200 ||
      form.roleId < 1 ||
      (!editing && (form.initialPassword.length < 8 || form.initialPassword.length > 128))
    ) {
      setError(t('invalidInput'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const body: UserUpdate = {
        email: form.email,
        fullName: form.fullName,
        roleId: form.roleId,
        active: form.active,
      }
      if (editing) await business.updateUser(editing.id, body, editing.version)
      else
        await business.createUser({
          ...body,
          initialPassword: form.initialPassword,
        } satisfies UserCreate)
      setEditing(undefined)
      await cache.invalidateQueries({ queryKey: ['users'] })
    } catch (failure) {
      setError(errorText(failure, t))
    } finally {
      setBusy(false)
    }
  }

  async function remove(row: User) {
    if (!window.confirm(t('confirmDeleteUser', { name: row.fullName }))) return
    setError(null)
    try {
      await business.deleteUser(row.id, row.version)
      await cache.invalidateQueries({ queryKey: ['users'] })
    } catch (failure) {
      setError(errorText(failure, t))
    }
  }

  async function reset(event: FormEvent) {
    event.preventDefault()
    if (!resetUser) return
    if (newPassword.length < 8 || newPassword.length > 128) {
      setError(t('invalidInput'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await business.resetPassword(resetUser.id, newPassword, resetUser.version)
      setResetUser(null)
      setNewPassword('')
      await cache.invalidateQueries({ queryKey: ['users'] })
    } catch (failure) {
      setError(errorText(failure, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeading title={t('users')} description={t('usersDescription')} />
      <Button variant="contained" sx={{ mb: 2 }} onClick={() => open(null)}>
        {t('addUser')}
      </Button>
      <SearchForm
        submit={(value) => {
          setPage(1)
          setSearch(value)
        }}
      />
      {error && editing === undefined && resetUser === null && (
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
            <Typography>{t('noUsers')}</Typography>
          ) : (
            <ResponsiveTable>
              <TableHead>
                <TableRow>
                  <TableCell>{t('fullName')}</TableCell>
                  <TableCell>{t('email')}</TableCell>
                  <TableCell>{t('role')}</TableCell>
                  <TableCell>{t('active')}</TableCell>
                  <TableCell>{t('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.fullName}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{t(`role.${row.role}`)}</TableCell>
                    <TableCell>{row.active ? t('yes') : t('no')}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button onClick={() => open(row)}>{t('edit')}</Button>
                        <Button
                          onClick={() => {
                            setError(null)
                            setResetUser(row)
                          }}
                        >
                          {t('resetPassword')}
                        </Button>
                        {!row.isSystemAdmin && (
                          <Button color="error" onClick={() => void remove(row)}>
                            {t('delete')}
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </ResponsiveTable>
          )}
          <PageControls page={page} totalPages={query.data.totalPages} change={setPage} />
        </>
      )}
      <Dialog open={editing !== undefined} onClose={() => !busy && setEditing(undefined)} fullWidth>
        <form noValidate onSubmit={(event) => void save(event)}>
          <DialogTitle>{editing ? t('editUser') : t('addUser')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label={t('email')}
                type="email"
                required
                slotProps={{ htmlInput: { maxLength: 254 } }}
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
              <TextField
                label={t('fullName')}
                required
                slotProps={{ htmlInput: { maxLength: 200 } }}
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              />
              <FormControl required>
                <InputLabel id="user-role">{t('role')}</InputLabel>
                <Select
                  labelId="user-role"
                  label={t('role')}
                  value={form.roleId}
                  disabled={Boolean(editing?.isSystemAdmin)}
                  onChange={(event) => setForm({ ...form, roleId: Number(event.target.value) })}
                >
                  {(roles.data ?? []).map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {t(`role.${role.name}`)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                label={t('active')}
                control={
                  <Checkbox
                    checked={form.active}
                    disabled={Boolean(editing?.isSystemAdmin)}
                    onChange={(event) => setForm({ ...form, active: event.target.checked })}
                  />
                }
              />
              {!editing && (
                <TextField
                  label={t('initialPassword')}
                  type="password"
                  required
                  slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }}
                  value={form.initialPassword}
                  onChange={(event) => setForm({ ...form, initialPassword: event.target.value })}
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(undefined)} disabled={busy}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant="contained" disabled={busy || roles.isPending}>
              {t('save')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog open={resetUser !== null} onClose={() => !busy && setResetUser(null)} fullWidth>
        <form noValidate onSubmit={(event) => void reset(event)}>
          <DialogTitle>{t('resetPassword')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {error && <Alert severity="error">{error}</Alert>}
              <Typography>{resetUser?.fullName}</Typography>
              <TextField
                label={t('newPassword')}
                type="password"
                required
                slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResetUser(null)} disabled={busy}>
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
