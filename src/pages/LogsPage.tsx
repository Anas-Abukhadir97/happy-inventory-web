import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
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
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { business } from '../lib/api/business'
import { LoadError, Loading, PageControls, PageHeading, SearchForm } from './Shared'

export function LogsPage() {
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')
  const [id, setId] = useState<string | null>(null)
  const query = useQuery({
    queryKey: ['logs', page, search, level],
    queryFn: () => business.logs(page, search, level),
  })
  const detail = useQuery({
    queryKey: ['log', id],
    queryFn: () => business.log(id!),
    enabled: id !== null,
  })
  return (
    <>
      <PageHeading title={t('logs')} description={t('logsDescription')} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <SearchForm
          submit={(value) => {
            setPage(1)
            setSearch(value)
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="log-level">{t('level')}</InputLabel>
          <Select
            labelId="log-level"
            label={t('level')}
            value={level}
            onChange={(event) => {
              setPage(1)
              setLevel(event.target.value)
            }}
          >
            <MenuItem value="">{t('allLevels')}</MenuItem>
            {['Information', 'Warning', 'Error'].map((value) => (
              <MenuItem key={value} value={value}>
                {t(`logLevel.${value}`)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <LoadError error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          {query.data.items.length === 0 ? (
            <Typography>{t('noLogs')}</Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('time')}</TableCell>
                  <TableCell>{t('level')}</TableCell>
                  <TableCell>{t('message')}</TableCell>
                  <TableCell>{t('actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data.items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {new Date(row.timestampUtc).toLocaleString(i18n.language)}
                    </TableCell>
                    <TableCell>{t(`logLevel.${row.level}`, { defaultValue: row.level })}</TableCell>
                    <TableCell>{row.message}</TableCell>
                    <TableCell>
                      <Button onClick={() => setId(row.id)}>{t('viewDetails')}</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <PageControls page={page} totalPages={query.data.totalPages} change={setPage} />
        </>
      )}
      <Dialog open={id !== null} onClose={() => setId(null)} fullWidth>
        <DialogTitle>{t('logDetails')}</DialogTitle>
        <DialogContent>
          {detail.isPending ? (
            <Loading />
          ) : detail.isError ? (
            <LoadError error={detail.error} retry={() => void detail.refetch()} />
          ) : (
            <Stack spacing={1}>
              <Typography>{detail.data.message}</Typography>
              <Typography>
                {t('time')}: {new Date(detail.data.timestampUtc).toLocaleString(i18n.language)}
              </Typography>
              <Typography>
                {t('correlationId')}: {detail.data.correlationId ?? t('notAvailable')}
              </Typography>
              {Object.entries(detail.data.properties).map(([key, value]) => (
                <Typography key={key}>
                  {key}: {String(value)}
                </Typography>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setId(null)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
