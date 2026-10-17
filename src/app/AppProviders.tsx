import { useEffect, useMemo, type PropsWithChildren } from 'react'
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import rtlPlugin from '@mui/stylis-plugin-rtl'
import { prefixer } from 'stylis'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import '../lib/i18n'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
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
        palette: { primary: { main: '#136b50' }, background: { default: '#f5f7f4' } },
        typography: { fontFamily: 'Arial, Tahoma, sans-serif' },
        shape: { borderRadius: 16 },
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
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ThemeProvider>
    </CacheProvider>
  )
}
