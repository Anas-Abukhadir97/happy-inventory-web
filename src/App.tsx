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
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.15fr) minmax(360px, 0.85fr)' },
        gap: { xs: 2, md: 3 },
        alignItems: 'stretch',
        mt: { xs: 2, md: 8 },
      }}
    >
      <Paper
        sx={{
          position: 'relative',
          overflow: 'hidden',
          minHeight: { md: 480 },
          p: { xs: 3, md: 6 },
          color: 'common.white',
          background:
            'radial-gradient(circle at 95% 0%, rgba(154,218,190,.32), transparent 34%), linear-gradient(145deg, #0d473f 0%, #176d5d 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          '&::after': {
            content: '""',
            position: 'absolute',
            width: 310,
            height: 310,
            border: '1px solid rgba(255,255,255,.18)',
            borderRadius: '50%',
            insetInlineEnd: -110,
            bottom: -170,
            pointerEvents: 'none',
          },
        }}
      >
        <Box>
          <Typography
            variant="overline"
            sx={{ color: '#bde8d8', fontWeight: 750, letterSpacing: '.16em' }}
          >
            {t('eyebrow')}
          </Typography>
          <Typography
            component="h1"
            variant="h3"
            sx={{ mt: { xs: 1.5, md: 4 }, maxWidth: 510, fontSize: { xs: '1.75rem', md: '3rem' } }}
          >
            {t('heading')}
          </Typography>
          <Typography
            sx={{
              mt: { xs: 1, md: 2 },
              maxWidth: 470,
              color: '#e2f0e9',
              fontSize: { xs: '.94rem', md: '1.08rem' },
              lineHeight: 1.6,
            }}
          >
            {t('description')}
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={1}
          sx={{ display: { xs: 'none', md: 'flex' }, flexWrap: 'wrap', gap: 1, mt: 5 }}
        >
          {[t('warehouses'), t('dashboard'), t('inventoryReport')].map((label) => (
            <Chip
              key={label}
              label={label}
              sx={{
                color: 'common.white',
                bgcolor: 'rgba(255,255,255,.13)',
                border: '1px solid rgba(255,255,255,.2)',
              }}
            />
          ))}
        </Stack>
      </Paper>
      <Paper
        component="form"
        onSubmit={(event) => void submit(event)}
        sx={{
          p: { xs: 3, md: 5 },
          display: 'flex',
          alignItems: 'center',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Stack spacing={3} sx={{ width: '100%' }}>
          <Box>
            <Typography component="h2" variant="h4">
              {t('signIn')}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {t('signInDescription')}
            </Typography>
          </Box>
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
            fullWidth
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            label={t('password')}
            type="password"
            autoComplete="current-password"
            required
            fullWidth
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" variant="contained" size="large" fullWidth disabled={busy}>
            {busy ? t('signingIn') : t('signIn')}
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}

function Welcome() {
  const { t } = useTranslation()
  const { user } = useSession()
  const operations = [
    { to: '/warehouses', title: t('warehouses'), description: t('warehousesDescription') },
    { to: '/dashboard', title: t('dashboard'), description: t('dashboardDescription') },
    {
      to: '/supplier-orders',
      title: t('supplierOrders'),
      description: t('supplierOrdersDescription'),
    },
  ]
  const administration = [
    { to: '/users', title: t('users'), description: t('usersDescription') },
    { to: '/logs', title: t('logs'), description: t('logsDescription') },
  ]
  const cards = (sections: typeof operations) => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(3, minmax(0, 1fr))',
        },
        gap: 2,
      }}
    >
      {sections.map((section) => (
        <Paper
          key={section.to}
          variant="outlined"
          sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            minHeight: 210,
            borderColor: 'divider',
            transition: 'transform .2s ease, box-shadow .2s ease',
            '&:hover': {
              transform: 'translateY(-3px)',
              boxShadow: '0 12px 30px rgba(24,58,48,.08)',
            },
          }}
        >
          <Box sx={{ width: 42, height: 5, bgcolor: 'secondary.main', borderRadius: 5, mb: 1 }} />
          <Typography component="h3" variant="h6">
            {section.title}
          </Typography>
          <Typography color="text.secondary" sx={{ flexGrow: 1, lineHeight: 1.6 }}>
            {section.description}
          </Typography>
          <Button component={Link} to={section.to} sx={{ alignSelf: 'flex-start', px: 0 }}>
            {t('openSection', { section: section.title })}
          </Button>
        </Paper>
      ))}
    </Box>
  )
  return (
    <Box sx={{ pb: 7 }}>
      <Paper
        variant="outlined"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          p: { xs: 3, md: 5 },
          mt: 3,
          mb: 5,
          borderColor: '#dce9de',
          background: 'linear-gradient(120deg, #e9f4ec 0%, #f7faf4 68%, #ffffff 100%)',
          '&::after': {
            content: '""',
            position: 'absolute',
            width: 260,
            height: 260,
            borderRadius: '50%',
            backgroundColor: 'rgba(20,102,87,.05)',
            insetInlineEnd: -85,
            top: -140,
            pointerEvents: 'none',
          },
        }}
      >
        <Typography
          variant="overline"
          sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: '.13em' }}
        >
          {t('overview')}
        </Typography>
        <Typography
          component="h1"
          variant="h3"
          sx={{ mt: 1, maxWidth: 760, fontSize: { xs: '2rem', md: '2.7rem' } }}
        >
          {t('welcomeGreeting')}{' '}
          <Box component="bdi" dir="auto">
            {user?.fullName}
          </Box>
        </Typography>
        <Typography
          color="text.secondary"
          sx={{ mt: 2, mb: 3, maxWidth: 600, fontSize: '1.07rem' }}
        >
          {t('welcomeDescription')}
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { xs: 'stretch', sm: 'flex-start' } }}
        >
          <Button component={Link} to="/dashboard" variant="contained">
            {t('dashboard')}
          </Button>
          <Button component={Link} to="/warehouses" variant="outlined">
            {t('warehouses')}
          </Button>
        </Stack>
      </Paper>
      <Typography component="h2" variant="h5" sx={{ fontWeight: 750, mb: 2 }}>
        {t('operations')}
      </Typography>
      {cards(operations)}
      {user?.role === 'Admin' && (
        <Box sx={{ mt: 5 }}>
          <Typography component="h2" variant="h5" sx={{ fontWeight: 750, mb: 2 }}>
            {t('administration')}
          </Typography>
          {cards(administration)}
        </Box>
      )}
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
          p: { xs: 2, sm: 2.5 },
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          boxShadow: '0 8px 28px rgba(24,58,48,.04)',
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            aria-hidden="true"
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              bgcolor: 'primary.main',
              borderRadius: 2,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 0.5,
              p: 1.1,
              '& > span': { bgcolor: 'common.white', borderRadius: '2px' },
              '& > span:last-child': { opacity: 0.55 },
            }}
          >
            <Box component="span" />
            <Box component="span" />
          </Box>
          <Typography
            component={Link}
            to="/"
            sx={{
              fontWeight: 800,
              textDecoration: 'none',
              color: 'primary.dark',
              letterSpacing: '-0.03em',
            }}
            variant="h5"
          >
            {t('appName')}
          </Typography>
        </Stack>
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
          sx={{
            mt: 2,
            mb: 3,
            p: 1,
            gap: 0.5,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            scrollbarWidth: 'thin',
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
                  flexShrink: 0,
                  bgcolor: active ? 'primary.light' : 'transparent',
                  fontWeight: active ? 700 : 500,
                  '&:hover': { bgcolor: active ? 'primary.light' : 'action.hover' },
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
            <CircularProgress aria-label={t('loadingSession')} />
          </Box>
        ) : !user ? (
          <Login />
        ) : (
          <Suspense
            fallback={
              <Box role="status" aria-label={t('loadingData')} sx={{ display: 'flex', py: 5 }}>
                <CircularProgress aria-label={t('loadingData')} />
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
