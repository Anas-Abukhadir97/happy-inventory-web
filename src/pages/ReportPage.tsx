import { useQuery } from '@tanstack/react-query'
import { Button, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { business, type Item, type WarehouseStatus } from '../lib/api/business'
import { LoadError, Loading, PageHeading, ResponsiveTable } from './Shared'

type ReportWarehouse = { status: WarehouseStatus; items: Item[] }

async function allPages<T>(
  load: (page: number) => Promise<{ items: T[]; totalPages: string }>,
): Promise<T[]> {
  const first = await load(1)
  const rows = [...first.items]
  for (let page = 2; page <= Number(first.totalPages); page++) {
    rows.push(...(await load(page)).items)
  }
  return rows
}

async function report(): Promise<ReportWarehouse[]> {
  const statuses = await allPages(business.warehouseStatuses)
  const rows: ReportWarehouse[] = []
  for (const status of statuses) {
    rows.push({ status, items: await allPages((page) => business.items(status.warehouseId, page)) })
  }
  return rows
}

export function ReportPage() {
  const { t, i18n } = useTranslation()
  const query = useQuery({ queryKey: ['report'], queryFn: report, staleTime: 0 })
  const generated = new Date().toLocaleString(i18n.language)
  return (
    <>
      <style>
        {
          '@media print { header, nav, .report-actions { display: none !important; } @page { size: auto; margin: 16mm; } }'
        }
      </style>
      <div className="report-actions">
        <Button component={Link} to="/dashboard">
          {t('backToDashboard')}
        </Button>
        <Button onClick={() => window.print()} disabled={!query.data} variant="contained">
          {t('printReport')}
        </Button>
      </div>
      <PageHeading
        title={t('inventoryReport')}
        description={t('generatedAt', { time: generated })}
      />
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <LoadError error={query.error} retry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <Typography>{t('noWarehouses')}</Typography>
      ) : (
        query.data.map(({ status, items }) => (
          <section key={status.warehouseId} style={{ breakInside: 'avoid-page', marginBottom: 32 }}>
            <Typography component="h2" variant="h6">
              {status.name}
            </Typography>
            <Typography>
              {t('distinctItems')}: {status.distinctItemCount} · {t('totalQuantity')}:{' '}
              {status.totalQuantity}
            </Typography>
            {items.length === 0 ? (
              <Typography>{t('noItems')}</Typography>
            ) : (
              <ResponsiveTable size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('itemName')}</TableCell>
                    <TableCell>{t('sku')}</TableCell>
                    <TableCell>{t('quantity')}</TableCell>
                    <TableCell>{t('costPrice')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.sku ?? t('notAvailable')}</TableCell>
                      <TableCell>{item.qty}</TableCell>
                      <TableCell>{item.costPrice}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </ResponsiveTable>
            )}
          </section>
        ))
      )}
    </>
  )
}
