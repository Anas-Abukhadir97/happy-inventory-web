import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Stack, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { business, type ItemQuantity } from '../lib/api/business'
import { LoadError, Loading, PageControls, PageHeading, ResponsiveTable } from './Shared'

function QuantityTable({ title, rows }: { title: string; rows: ItemQuantity[] }) {
  const { t } = useTranslation()
  return (
    <>
      <Typography component="h2" variant="h6" sx={{ mt: 3 }}>
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
    </>
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
      <PageHeading title={t('dashboard')} description={t('dashboardDescription')} />
      <Button component={Link} to="/report" variant="outlined">
        {t('printReport')}
      </Button>
      <Typography component="h2" variant="h6" sx={{ mt: 3 }}>
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
      <Stack spacing={3}>
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
      </Stack>
    </>
  )
}
