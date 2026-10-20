import { useEffect, useMemo, type PropsWithChildren } from 'react'
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import rtlPlugin from '@mui/stylis-plugin-rtl'
import { prefixer } from 'stylis'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import '../lib/i18n'
import { BusinessError } from '../lib/api/business'
import { SessionProvider } from './SessionProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        !(error instanceof BusinessError && error.status === 429) && failureCount < 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function AppProviders({ children }: PropsWithChildren) {
  const { i18n, t } = useTranslation()
  const direction = i18n.dir()
  const cache = useMemo(
    () =>
      createCache({
        key: direction,
        stylisPlugins: direction === 'rtl' ? [prefixer, rtlPlugin] : [prefixer],
      }),
    [direction],
  )
  const theme = useMemo(
    () =>
      createTheme({
        direction,
        palette: {
          primary: { main: '#146657', dark: '#0c463d', light: '#dcefe8', contrastText: '#ffffff' },
          secondary: { main: '#b96743' },
          background: { default: '#f6f5f0', paper: '#ffffff' },
          text: { primary: '#192d29', secondary: '#5d706b' },
          divider: '#e1e8e2',
        },
        typography: {
          fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif',
          h3: { fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.14 },
          h4: { fontWeight: 760, letterSpacing: '-0.025em' },
          h6: { fontWeight: 720 },
          button: { fontWeight: 700, textTransform: 'none', letterSpacing: 0 },
        },
        shape: { borderRadius: 14 },
        components: {
          MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: { root: { borderRadius: 10, minHeight: 38, paddingInline: 16 } },
          },
          MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
          MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10 } } },
          MuiTableCell: {
            styleOverrides: {
              head: { backgroundColor: '#f3f7f3', color: '#3c5750', fontWeight: 750 },
              body: { borderBottomColor: '#e9eeea' },
            },
          },
          MuiTableRow: { styleOverrides: { root: { '&:hover': { backgroundColor: '#fafcf9' } } } },
        },
      }),
    [direction],
  )

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? 'en'
    document.documentElement.dir = direction
    document.title = t('appName')
  }, [direction, i18n.resolvedLanguage, t])

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <SessionProvider>{children}</SessionProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </CacheProvider>
  )
}
