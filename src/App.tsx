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
  Chip,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
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
    <Box sx={{ py: { xs: 4, md: 7 } }}>
      <Typography
        component="h1"
        variant="h3"
        sx={{ mb: 1, fontWeight: 750, letterSpacing: '-0.035em' }}
      >
        {t('welcome', { name: user?.fullName })}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        {t('welcomeDescription')}
      </Typography>
      <Box
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}
      >
        {[
          { to: '/warehouses', title: t('warehouses'), description: t('warehousesDescription') },
          { to: '/dashboard', title: t('dashboard'), description: t('dashboardDescription') },
          {
            to: '/supplier-orders',
            title: t('supplierOrders'),
            description: t('supplierOrdersDescription'),
          },
          ...(user?.role === 'Admin'
            ? [
                { to: '/users', title: t('users'), description: t('usersDescription') },
                { to: '/logs', title: t('logs'), description: t('logsDescription') },
              ]
            : []),
        ].map((section) => (
          <Paper
            key={section.to}
            variant="outlined"
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              minHeight: 166,
              borderColor: 'divider',
            }}
          >
            <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
              {section.title}
            </Typography>
            <Typography color="text.secondary" sx={{ flexGrow: 1 }}>
              {section.description}
            </Typography>
            <Button component={Link} to={section.to} sx={{ alignSelf: 'flex-start', px: 0 }}>
              {section.title}
            </Button>
          </Paper>
        ))}
      </Box>
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
  const location = useLocation()
  const sections = user
    ? [
        { to: '/', label: t('overview') },
        { to: '/warehouses', label: t('warehouses') },
        { to: '/dashboard', label: t('dashboard') },
        { to: '/supplier-orders', label: t('supplierOrders') },
        ...(user.role === 'Admin'
          ? [
              { to: '/users', label: t('users') },
              { to: '/logs', label: t('logs') },
            ]
          : []),
      ]
    : []
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, pb: 7 }}>
      <Stack
        component="header"
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
        }}
      >
        <Typography
          component={Link}
          to="/"
          sx={{
            fontWeight: 800,
            textDecoration: 'none',
            color: 'primary.main',
            letterSpacing: '-0.03em',
          }}
          variant="h5"
        >
          {t('appName')}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: { xs: 'space-between', sm: 'flex-end' } }}
        >
          {user && (
            <Chip label={t(`role.${user.role}`)} size="small" color="primary" variant="outlined" />
          )}
          {user && (
            <Button
              onClick={() => {
                void logout().catch(() => setLogoutError(true))
              }}
            >
              {t('signOut')}
            </Button>
          )}
          <FormControl size="small" sx={{ minWidth: { xs: 112, sm: 140 } }}>
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
          sx={{
            mt: 3,
            mb: 2,
            flexWrap: 'wrap',
            gap: 0.5,
            borderBottom: 1,
            borderColor: 'divider',
            pb: 1.5,
          }}
          aria-label={t('mainNavigation')}
        >
          {sections.map((section) => {
            const active =
              section.to === '/'
                ? location.pathname === '/'
                : location.pathname === section.to || location.pathname.startsWith(`${section.to}/`)
            return (
              <Button
                key={section.to}
                component={Link}
                to={section.to}
                aria-current={active ? 'page' : undefined}
                color={active ? 'primary' : 'inherit'}
                sx={{
                  bgcolor: active ? 'action.selected' : 'transparent',
                  fontWeight: active ? 700 : 500,
                }}
              >
                {section.label}
              </Button>
            )
          })}
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
