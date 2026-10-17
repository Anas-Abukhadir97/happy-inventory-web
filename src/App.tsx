import { useState, type FormEvent } from 'react'
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
          <Button component={Link} to="/users" variant="outlined">
            {t('users')}
          </Button>
        )}
      </Stack>
    </Box>
  )
}

function PlannedPage({ title }: { title: string }) {
  const { t } = useTranslation()
  return (
    <Box sx={{ py: 6 }}>
      <Typography component="h1" variant="h4" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Typography color="text.secondary">{t('featurePlanned')}</Typography>
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
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/warehouses" element={<PlannedPage title={t('warehouses')} />} />
            <Route path="/dashboard" element={<PlannedPage title={t('dashboard')} />} />
            {user.role === 'Admin' && (
              <Route path="/users" element={<PlannedPage title={t('users')} />} />
            )}
            <Route path="*" element={<PlannedPage title={t('notFound')} />} />
          </Routes>
        )}
      </Box>
    </Container>
  )
}
