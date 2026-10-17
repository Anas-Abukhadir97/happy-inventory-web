import {
  Box,
  Button,
  Chip,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Link, Route, Routes } from 'react-router-dom'

function Overview() {
  const { t } = useTranslation()
  return (
    <>
      <Box sx={{ py: { xs: 6, md: 10 }, maxWidth: 760 }}>
        <Typography color="primary" variant="overline">
          {t('eyebrow')}
        </Typography>
        <Typography
          component="h1"
          variant="h2"
          sx={{ fontWeight: 700, my: 2, fontSize: { xs: '2.7rem', md: '4rem' } }}
        >
          {t('heading')}
        </Typography>
        <Typography color="text.secondary" variant="h6" sx={{ lineHeight: 1.7 }}>
          {t('description')}
        </Typography>
        <Chip label={t('phase')} color="primary" variant="outlined" sx={{ mt: 3 }} />
      </Box>
      <Box
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}
      >
        {(['warehouses', 'dashboard', 'users'] as const).map((feature) => (
          <Paper key={feature} variant="outlined" sx={{ p: 3 }}>
            <Chip size="small" label={t('planned')} sx={{ mb: 3 }} />
            <Typography component="h2" variant="h6" sx={{ mb: 1 }}>
              {t(feature)}
            </Typography>
            <Typography color="text.secondary">{t(`${feature}Description`)}</Typography>
          </Paper>
        ))}
      </Box>
      <Typography color="text.secondary" sx={{ mt: 4 }}>
        {t('note')}
      </Typography>
    </>
  )
}

export default function App() {
  const { t, i18n } = useTranslation()
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
      <Box component="main">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route
            path="*"
            element={
              <Box sx={{ py: 8 }}>
                <Typography component="h1" variant="h4">
                  {t('notFound')}
                </Typography>
                <Button component={Link} to="/">
                  {t('home')}
                </Button>
              </Box>
            }
          />
        </Routes>
      </Box>
    </Container>
  )
}
