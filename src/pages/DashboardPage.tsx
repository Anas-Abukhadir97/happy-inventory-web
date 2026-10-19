import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Button,
  Paper,
  Stack,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { business, type ItemQuantity } from '../lib/api/business'
import { LoadError, Loading, PageControls, PageHeading, ResponsiveTable } from './Shared'

function QuantityTable({ title, rows }: { title: string; rows: ItemQuantity[] }) {
  const { t } = useTranslation()
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography component="h2" variant="h6" sx={{ mb: 2 }}>
        {title}
      </Typography>
      {rows.length === 0 ? (
        <Typography>{t('noItems')}</Typography>
      ) : (
        <ResponsiveTable>
          <TableHead>
            <TableRow>
              <TableCell>{t('itemName')}</TableCell>
              <TableCell>{t('warehouses')}</TableCell>
              <TableCell>{t('quantity')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.warehouseName}</TableCell>
                <TableCell>{row.qty}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ResponsiveTable>
      )}
    </Box>
  )
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string | number
  detail?: string
}) {
  return (
    <Paper variant="outlined" sx={{ p: 3, minWidth: 0, borderColor: 'divider' }}>
      <Box sx={{ width: 36, height: 4, bgcolor: 'secondary.main', borderRadius: 4, mb: 2 }} />
      <Typography color="text.secondary" sx={{ fontWeight: 650 }}>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ mt: 1, color: 'primary.dark' }} aria-live="polite">
        {value}
      </Typography>
      {detail && (
        <Typography
          color="text.secondary"
          variant="body2"
          sx={{ mt: 0.5, overflowWrap: 'anywhere' }}
        >
          {detail}
        </Typography>
      )}
    </Paper>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const warehouses = useQuery({
    queryKey: ['dashboard', 'warehouses', page],
    queryFn: () => business.warehouseStatuses(page),
  })
  const highest = useQuery({ queryKey: ['dashboard', 'highest'], queryFn: business.highestItems })
  const lowest = useQuery({ queryKey: ['dashboard', 'lowest'], queryFn: business.lowestItems })
  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
        }}
      >
        <PageHeading title={t('dashboard')} description={t('dashboardDescription')} />
        <Button component={Link} to="/report" variant="outlined">
          {t('printReport')}
        </Button>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
          gap: 2,
          mb: 4,
        }}
      >
        <MetricCard label={t('trackedWarehouses')} value={warehouses.data?.totalCount ?? '—'} />
        <MetricCard
          label={t('mostStockedItem')}
          value={highest.data?.[0]?.qty ?? '—'}
          detail={highest.data?.[0]?.name ?? t('noItems')}
        />
        <MetricCard
          label={t('leastStockedItem')}
          value={lowest.data?.[0]?.qty ?? '—'}
          detail={lowest.data?.[0]?.name ?? t('noItems')}
        />
      </Box>
      <Typography component="h2" variant="h6" sx={{ mb: 2 }}>
        {t('warehouseOverview')}
      </Typography>
      {warehouses.isPending ? (
        <Loading />
      ) : warehouses.isError ? (
        <LoadError error={warehouses.error} retry={() => void warehouses.refetch()} />
      ) : (
        <>
          {warehouses.data.items.length === 0 ? (
            <Typography>{t('noWarehouses')}</Typography>
          ) : (
            <ResponsiveTable>
              <TableHead>
                <TableRow>
                  <TableCell>{t('warehouseName')}</TableCell>
                  <TableCell>{t('distinctItems')}</TableCell>
                  <TableCell>{t('totalQuantity')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {warehouses.data.items.map((row) => (
                  <TableRow key={row.warehouseId}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.distinctItemCount}</TableCell>
                    <TableCell>{row.totalQuantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </ResponsiveTable>
          )}
          <PageControls page={page} totalPages={warehouses.data.totalPages} change={setPage} />
        </>
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          gap: 3,
          mt: 4,
        }}
      >
        {highest.isPending ? (
          <Loading />
        ) : highest.isError ? (
          <LoadError error={highest.error} retry={() => void highest.refetch()} />
        ) : (
          <QuantityTable title={t('highestQuantity')} rows={highest.data} />
        )}
        {lowest.isPending ? (
          <Loading />
        ) : lowest.isError ? (
          <LoadError error={lowest.error} retry={() => void lowest.refetch()} />
        ) : (
          <QuantityTable title={t('lowestQuantity')} rows={lowest.data} />
        )}
      </Box>
    </>
  )
}
