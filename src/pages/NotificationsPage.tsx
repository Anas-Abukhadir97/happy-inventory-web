import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useSession } from '../app/SessionContext'
import { business, type User } from '../lib/api/business'
import { errorText } from '../lib/api/errors'
import { LoadError, Loading, PageControls, PageHeading } from './Shared'

export function NotificationsPage({ live }: { live: boolean }) {
  const { t, i18n } = useTranslation()
  const { user } = useSession()
  const cache = useQueryClient()
  const isAdmin = user?.role === 'Admin'
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [recipient, setRecipient] = useState<User | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sendEmail, setSendEmail] = useState(false)
  const [sendSms, setSendSms] = useState(false)
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState(false)

  const query = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => business.notifications(page),
  })
  const users = useQuery({
    queryKey: ['notificationRecipients', search],
    queryFn: () => business.users(1, search),
    enabled: isAdmin,
  })

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreated(false)
    if (
      !recipient ||
      !title.trim() ||
      title.trim().length > 120 ||
      !body.trim() ||
      body.trim().length > 1000 ||
      (sendSms && !/^\+[1-9][0-9]{6,14}$/.test(phone.trim()))
    ) {
      setError(t('notificationInvalid'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await business.createNotification({
        recipientUserId: recipient.id,
        title: title.trim(),
        body: body.trim(),
        sendEmail,
        sendSms,
        smsPhoneNumber: sendSms ? phone.trim() : null,
      })
      setTitle('')
      setBody('')
      setPhone('')
      setSendEmail(false)
      setSendSms(false)
      setCreated(true)
      await cache.invalidateQueries({ queryKey: ['notifications'] })
    } catch (failure) {
      setError(errorText(failure, t))
    } finally {
      setBusy(false)
    }
  }

  async function markRead(id: string) {
    setError(null)
    try {
      await business.markNotificationRead(id)
      await cache.invalidateQueries({ queryKey: ['notifications'] })
    } catch (failure) {
      setError(errorText(failure, t))
    }
  }

  return (
    <Box sx={{ pb: 5 }}>
      <PageHeading title={t('notifications')} description={t('notificationsDescription')} />
      <Chip
        size="small"
        color={live ? 'success' : 'default'}
        label={live ? t('notificationLive') : t('notificationConnecting')}
        role="status"
        sx={{ mb: 3 }}
      />
      {isAdmin && (
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, mb: 4 }}>
          <Typography component="h2" variant="h6" sx={{ fontWeight: 750, mb: 2 }}>
            {t('notificationNew')}
          </Typography>
          <Box component="form" noValidate onSubmit={(event) => void send(event)}>
            <Stack spacing={2}>
              <Autocomplete
                options={(users.data?.items ?? []).filter((candidate) => candidate.active)}
                value={recipient}
                onChange={(_, selected) => setRecipient(selected)}
                inputValue={search}
                onInputChange={(_, value) => setSearch(value)}
                filterOptions={(options) => options}
                getOptionLabel={(candidate) => `${candidate.fullName} (${candidate.email})`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('notificationRecipient')}
                    placeholder={t('notificationSelectRecipient')}
                    required
                  />
                )}
              />
              <TextField
                label={t('notificationTitle')}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                slotProps={{ htmlInput: { maxLength: 120 } }}
                required
              />
              <TextField
                label={t('notificationBody')}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                multiline
                minRows={3}
                slotProps={{ htmlInput: { maxLength: 1000 } }}
                required
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0, sm: 2 }}>
                <FormControlLabel
                  label={t('notificationEmail')}
                  control={
                    <Checkbox
                      checked={sendEmail}
                      onChange={(event) => setSendEmail(event.target.checked)}
                    />
                  }
                />
                <FormControlLabel
                  label={t('notificationSms')}
                  control={
                    <Checkbox
                      checked={sendSms}
                      onChange={(event) => setSendSms(event.target.checked)}
                    />
                  }
                />
              </Stack>
              {sendSms && (
                <TextField
                  label={t('notificationSmsPhone')}
                  helperText={t('notificationPhoneHint')}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  slotProps={{ htmlInput: { maxLength: 16, dir: 'ltr' } }}
                  required
                />
              )}
              {(sendEmail || sendSms) && (
                <Alert severity="info">{t('notificationChannelNote')}</Alert>
              )}
              {error && <Alert severity="error">{error}</Alert>}
              {created && <Alert severity="success">{t('notificationCreated')}</Alert>}
              <Button
                type="submit"
                variant="contained"
                disabled={busy}
                sx={{ alignSelf: 'flex-start' }}
              >
                {t('notificationSend')}
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}
      <Typography component="h2" variant="h6" sx={{ fontWeight: 750, mb: 2 }}>
        {t('notificationRecent')}
      </Typography>
      {!isAdmin && error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <LoadError error={query.error} retry={() => void query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, borderRadius: 3 }}>
          <Typography color="text.secondary">{t('notificationEmpty')}</Typography>
        </Paper>
      ) : (
        <>
          <Stack spacing={1.5}>
            {query.data.items.map((item) => (
              <Paper
                key={item.id}
                variant="outlined"
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 3,
                  borderInlineStart: item.readAtUtc ? undefined : '4px solid',
                  borderInlineStartColor: 'primary.main',
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  sx={{ justifyContent: 'space-between', gap: 1 }}
                >
                  <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 750 }}>
                    <bdi>{item.title}</bdi>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Intl.DateTimeFormat(i18n.resolvedLanguage ?? 'en', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(item.createdAtUtc))}
                  </Typography>
                </Stack>
                <Typography sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                  <bdi>{item.body}</bdi>
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexWrap: 'wrap', alignItems: 'center', mt: 2, gap: 0.5 }}
                >
                  <Chip
                    size="small"
                    label={item.readAtUtc ? t('notificationRead') : t('notificationUnread')}
                    color={item.readAtUtc ? 'default' : 'primary'}
                  />
                  {item.emailStatus !== 'NotRequested' && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${t('notificationEmailStatus')}: ${t(`notificationStatus.${item.emailStatus}`)}`}
                    />
                  )}
                  {item.smsStatus !== 'NotRequested' && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${t('notificationSmsStatus')}: ${t(`notificationStatus.${item.smsStatus}`)}`}
                    />
                  )}
                  {!item.readAtUtc && (
                    <Button size="small" onClick={() => void markRead(item.id)}>
                      {t('notificationMarkRead')}
                    </Button>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
          <PageControls page={page} totalPages={query.data.totalPages} change={setPage} />
        </>
      )}
    </Box>
  )
}
