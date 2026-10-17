import { lazy, Suspense, useState, type FormEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link, Route, Routes } from 'react-router-dom'
import { useSession } from './app/SessionContext'
import { AuthError } from './lib/auth/session'

const WarehousesPage = lazy(async () => ({
  default: (await import('./pages/WarehousesPage')).WarehousesPage,
}))
const ItemsPage = lazy(async () => ({ default: (await import('./pages/ItemsPage')).ItemsPage }))
const DashboardPage = lazy(async () => ({
  default: (await import('./pages/DashboardPage')).DashboardPage,
}))
const UsersPage = lazy(async () => ({ default: (await import('./pages/UsersPage')).UsersPage }))
const LogsPage = lazy(async () => ({ default: (await import('./pages/LogsPage')).LogsPage }))
const ReportPage = lazy(async () => ({ default: (await import('./pages/ReportPage')).ReportPage }))
const SupplierOrdersPage = lazy(async () => ({
  default: (await import('./pages/SupplierOrdersPage')).SupplierOrdersPage,
}))

function Login() {
  const { t } = useTranslation()
  const { login } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
    } catch (failure) {
      const code = failure instanceof AuthError ? failure.code : 'auth_failed'
      const messageKey =
        {
          account_disabled: 'loginDisabled',
          invalid_credentials: 'loginError',
          rate_limited: 'loginRateLimited',
          csrf_failed: 'loginCsrfError',
        }[code] ?? 'loginUnavailable'
      setError(t(messageKey))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Paper
      component="form"
      onSubmit={(event) => void submit(event)}
      sx={{ maxWidth: 440, mx: 'auto', mt: 8, p: 4 }}
    >
      <Stack spacing={3}>
        <Typography component="h1" variant="h4">
          {t('signIn')}
        </Typography>
        <Typography color="text.secondary">{t('signInDescription')}</Typography>
        {error && (
          <Alert severity="error" role="alert">
            {error}
          </Alert>
        )}
        <TextField
          label={t('email')}
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label={t('password')}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" variant="contained" disabled={busy}>
          {busy ? t('signingIn') : t('signIn')}
        </Button>
      </Stack>
    </Paper>
  )
}

function Welcome() {
  const { t } = useTranslation()
  const { user } = useSession()
  return (
    <Box sx={{ py: 6 }}>
      <Typography component="h1" variant="h3" sx={{ mb: 2 }}>
        {t('welcome', { name: user?.fullName })}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        {t('welcomeDescription')}
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button component={Link} to="/warehouses" variant="outlined">
          {t('warehouses')}
        </Button>
        <Button component={Link} to="/dashboard" variant="outlined">
          {t('dashboard')}
        </Button>
        {user?.role === 'Admin' && (
          <>
            <Button component={Link} to="/users" variant="outlined">
              {t('users')}
            </Button>
            <Button component={Link} to="/logs" variant="outlined">
              {t('logs')}
            </Button>
          </>
        )}
      </Stack>
    </Box>
  )
}

function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <Box sx={{ py: 6 }}>
      <Typography component="h1" variant="h4" sx={{ mb: 2 }}>
        {t('notFound')}
      </Typography>
      <Button component={Link} to="/" sx={{ mt: 3 }}>
        {t('home')}
      </Button>
    </Box>
  )
}

export default function App() {
  const { t, i18n } = useTranslation()
  const { ready, user, logout } = useSession()
  const [logoutError, setLogoutError] = useState(false)
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack
        component="header"
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 2 }}
      >
        <Typography sx={{ fontWeight: 700 }} variant="h6">
          {t('appName')}
        </Typography>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          {user && (
            <Button
              onClick={() => {
                void logout().catch(() => setLogoutError(true))
              }}
            >
              {t('signOut')}
            </Button>
          )}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="language-label">{t('language')}</InputLabel>
            <Select
              labelId="language-label"
              label={t('language')}
              value={i18n.resolvedLanguage ?? 'en'}
              onChange={(event) => {
                void i18n.changeLanguage(event.target.value)
              }}
            >
              <MenuItem value="en">{t('english')}</MenuItem>
              <MenuItem value="ar">{t('arabic')}</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>
      {user && (
        <Stack
          component="nav"
          direction="row"
          spacing={1}
          sx={{ mt: 2, flexWrap: 'wrap' }}
          aria-label={t('mainNavigation')}
        >
          <Button component={Link} to="/">
            {t('home')}
          </Button>
          <Button component={Link} to="/warehouses">
            {t('warehouses')}
          </Button>
          <Button component={Link} to="/dashboard">
            {t('dashboard')}
          </Button>
          <Button component={Link} to="/supplier-orders">
            {t('supplierOrders')}
          </Button>
          {user.role === 'Admin' && (
            <>
              <Button component={Link} to="/users">
                {t('users')}
              </Button>
              <Button component={Link} to="/logs">
                {t('logs')}
              </Button>
            </>
          )}
        </Stack>
      )}
      <Box component="main">
        {logoutError && (
          <Alert severity="error" role="alert" sx={{ mt: 3 }}>
            {t('signOutError')}
          </Alert>
        )}
        {!ready ? (
          <Box
            sx={{ display: 'flex', justifyContent: 'center', py: 10 }}
            role="status"
            aria-label={t('loadingSession')}
          >
            <CircularProgress />
          </Box>
        ) : !user ? (
          <Login />
        ) : (
          <Suspense
            fallback={
              <Box role="status" aria-label={t('loadingData')} sx={{ display: 'flex', py: 5 }}>
                <CircularProgress />
              </Box>
            }
          >
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route path="/warehouses" element={<WarehousesPage />} />
              <Route path="/warehouses/:id/items" element={<ItemsPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/supplier-orders" element={<SupplierOrdersPage />} />
              {user.role === 'Admin' && (
                <>
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/logs" element={<LogsPage />} />
                </>
              )}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        )}
      </Box>
    </Container>
  )
}
