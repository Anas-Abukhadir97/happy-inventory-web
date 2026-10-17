import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { errorText } from '../lib/api/errors'

export function PageHeading({ title, description }: { title: string; description?: string }) {
  return (
    <Box sx={{ py: 3 }}>
      <Typography component="h1" variant="h4">
        {title}
      </Typography>
      {description && <Typography color="text.secondary">{description}</Typography>}
    </Box>
  )
}

export function Loading() {
  const { t } = useTranslation()
  return (
    <Box role="status" aria-label={t('loadingData')} sx={{ display: 'flex', py: 5 }}>
      <CircularProgress />
    </Box>
  )
}

export function LoadError({ error, retry }: { error: unknown; retry: () => void }) {
  const { t } = useTranslation()
  return (
    <Alert severity="error" action={<Button onClick={retry}>{t('retry')}</Button>}>
      {errorText(error, t)}
    </Alert>
  )
}

export function PageControls({
  page,
  totalPages,
  change,
}: {
  page: number
  totalPages: string
  change: (value: number) => void
}) {
  const { t } = useTranslation()
  const last = Number(totalPages)
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'end', py: 2 }}>
      <Button disabled={page <= 1} onClick={() => change(page - 1)}>
        {t('previousPage')}
      </Button>
      <Typography aria-live="polite">{t('pageOf', { page, total: Math.max(last, 1) })}</Typography>
      <Button disabled={page >= last} onClick={() => change(page + 1)}>
        {t('nextPage')}
      </Button>
    </Stack>
  )
}

export function SearchForm({ submit }: { submit: (value: string) => void }) {
  const { t } = useTranslation()
  return (
    <Box
      component="form"
      onSubmit={(event) => {
        event.preventDefault()
        submit(String(new FormData(event.currentTarget).get('search') ?? ''))
      }}
      sx={{ display: 'flex', gap: 1, mb: 2 }}
    >
      <label htmlFor="record-search" style={{ alignSelf: 'center' }}>
        {t('search')}
      </label>
      <input id="record-search" name="search" maxLength={200} />
      <Button type="submit" variant="outlined">
        {t('search')}
      </Button>
    </Box>
  )
}
