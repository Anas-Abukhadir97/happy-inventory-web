import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { AppProviders } from '../app/AppProviders'
import i18n from '../lib/i18n'
import en from '../locales/en/common.json'
import ar from '../locales/ar/common.json'

beforeEach(async () => {
  await i18n.changeLanguage('en')
})

function renderApp(path = '/') {
  render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </AppProviders>,
  )
}

describe('foundation', () => {
  it('labels future functionality honestly', () => {
    renderApp()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(en.heading)
    expect(screen.getAllByText(en.planned)).toHaveLength(3)
    expect(screen.getByText(en.note)).toBeVisible()
  })

  it('switches to Arabic resources and right-to-left layout', async () => {
    renderApp()
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: en.language }))
    await user.click(screen.getByRole('option', { name: en.arabic }))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('dir', 'rtl'))
    expect(document.documentElement).toHaveAttribute('lang', 'ar')
    expect(document.title).toBe(ar.appName)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(ar.heading)
  })

  it('lets a visitor recover from an unknown route', async () => {
    renderApp('/missing')
    await userEvent.setup().click(screen.getByRole('link', { name: en.home }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(en.heading)
  })

  it('has complete nonempty translations', () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort())
    for (const value of [...Object.values(en), ...Object.values(ar)])
      expect(value.trim()).not.toBe('')
  })
})
