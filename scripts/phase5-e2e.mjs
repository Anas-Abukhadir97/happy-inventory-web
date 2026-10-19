import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'
import AxeBuilder from '@axe-core/playwright'

const webRoot = resolve(import.meta.dirname, '..')
const apiRoot = resolve(webRoot, '..', 'backend')
const apiProject = resolve(apiRoot, 'src', 'HappyInventory.Api')
const apiDll = resolve(apiProject, 'bin', 'Release', 'net10.0', 'HappyInventory.Api.dll')
const output = resolve(webRoot, 'artifacts', 'phase5')
const baseUrl = 'https://127.0.0.1:5173'
const apiUrl = 'http://127.0.0.1:5080'
const bootstrapPassword = 'phase5-local-test-password-123'
const children = []
let browser
let temporary

function start(command, args, cwd, env) {
  const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, stdio: 'pipe' })
  let lastOutput = ''
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', (chunk) => {
      lastOutput = (lastOutput + chunk.toString()).slice(-2000)
    })
  child.on('error', (error) => {
    lastOutput = String(error)
  })
  children.push(child)
  return { child, output: () => lastOutput }
}

async function waitFor(url, server, secure = false) {
  const deadline = Date.now() + 45000
  while (Date.now() < deadline) {
    if (server.child.exitCode !== null) throw new Error(`Server exited: ${server.output()}`)
    try {
      if (secure) {
        const https = await import('node:https')
        const status = await new Promise((done, reject) => {
          https
            .get(url, { rejectUnauthorized: false }, (response) => {
              response.resume()
              done(response.statusCode)
            })
            .on('error', reject)
        })
        if (status === 200) return
      } else {
        const response = await fetch(url)
        if (response.status === 204) return
      }
    } catch {
      /* Service is starting. */
    }
    await delay(250)
  }
  throw new Error(`Server did not become ready: ${server.output()}`)
}

async function api(method, path, token, body, extraHeaders = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...extraHeaders,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const raw = await response.text()
  return { status: response.status, headers: response.headers, body: raw ? JSON.parse(raw) : null }
}

function expectStatus(result, status, label) {
  assert.equal(result.status, status, `${label}: ${JSON.stringify(result.body)}`)
  return result
}

async function login(email, password) {
  const result = expectStatus(
    await api('POST', '/api/v1/auth/login', null, { email, password, sessionMode: 'external' }),
    200,
    'external login',
  )
  assert.equal(result.headers.get('set-cookie'), null)
  return result.body.accessToken
}

async function audit(page, label) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  const serious = result.violations.filter((entry) =>
    ['serious', 'critical'].includes(entry.impact),
  )
  assert.deepEqual(
    serious.flatMap((entry) =>
      entry.nodes.map((node) => `${entry.id} ${node.target.join(' ')}: ${node.failureSummary}`),
    ),
    [],
    `${label} accessibility violations`,
  )
}

async function main() {
  await readFile(apiDll)
  temporary = await mkdtemp(resolve(tmpdir(), 'happy-inventory-phase5-'))
  await mkdir(output, { recursive: true })
  const apiServer = start('dotnet', [apiDll], apiProject, {
    ASPNETCORE_ENVIRONMENT: 'Development',
    ASPNETCORE_URLS: 'http://127.0.0.1:5080;http://127.0.0.1:5081',
    ConnectionStrings__Inventory: `Data Source=${resolve(temporary, 'inventory.db')};Pooling=False`,
    BootstrapAdmin__Password: bootstrapPassword,
    Auth__BrowserOrigin: baseUrl,
    Auth__SigningKey: 'phase5-local-only-signing-key-with-thirty-two-characters',
    EventLogs__Path: resolve(temporary, 'logs'),
  })
  await waitFor(`${apiUrl}/api/v1/auth/csrf`, apiServer)
  const webServer = start(
    process.execPath,
    ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--strictPort'],
    webRoot,
  )
  await waitFor(baseUrl, webServer, true)

  const admin = await login('admin@happywarehouse.com', bootstrapPassword)
  const warehouse = expectStatus(
    await api('POST', '/api/v1/warehouses', admin, {
      name: 'Phase 5 North',
      address: 'Test street',
      city: 'Amman',
      countryCode: 'JO',
    }),
    201,
    'warehouse',
  ).body
  const other = expectStatus(
    await api('POST', '/api/v1/warehouses', admin, {
      name: 'Phase 5 South',
      address: 'Test street',
      city: 'Amman',
      countryCode: 'JO',
    }),
    201,
    'second warehouse',
  ).body
  const items = []
  for (let number = 1; number <= 12; number++) {
    const item = expectStatus(
      await api('POST', `/api/v1/warehouses/${warehouse.id}/items`, admin, {
        name: `Phase 5 widget ${number}`,
        qty: number === 1 ? 5 : 2,
        costPrice: '1.00',
      }),
      201,
      'item',
    ).body
    items.push(item)
  }
  const managerEmail = 'manager@phase5.example.test'
  const auditorEmail = 'auditor@phase5.example.test'
  const disabledEmail = 'disabled@phase5.example.test'
  for (const [email, roleId, active] of [
    [managerEmail, 2, true],
    [auditorEmail, 3, true],
    [disabledEmail, 3, false],
  ]) {
    expectStatus(
      await api('POST', '/api/v1/users', admin, {
        email,
        fullName: `Phase 5 ${roleId}`,
        roleId,
        active,
        initialPassword: bootstrapPassword,
      }),
      201,
      'create role account',
    )
  }
  const management = await login(managerEmail, bootstrapPassword)
  const auditor = await login(auditorEmail, bootstrapPassword)
  const auditorId = expectStatus(
    await api('GET', `/api/v1/users?search=${encodeURIComponent(auditorEmail)}`, admin),
    200,
    'auditor lookup',
  ).body.items[0].id
  expectStatus(
    await api('POST', '/api/v1/auth/login', null, {
      email: disabledEmail,
      password: bootstrapPassword,
      sessionMode: 'external',
    }),
    403,
    'disabled account',
  )

  const deductionPath = '/api/v1/integrations/inventory-deductions'
  const deduction = {
    externalReference: 'phase5-order-line',
    warehouseId: warehouse.id,
    itemId: items[0].id,
    quantity: 2,
  }
  const first = expectStatus(
    await api('POST', deductionPath, management, deduction, {
      'Idempotency-Key': 'phase5-stable-key',
    }),
    200,
    'deduction',
  )
  assert.equal(first.body.resultQuantity, 3)
  const replay = expectStatus(
    await api('POST', deductionPath, management, deduction, {
      'Idempotency-Key': 'phase5-stable-key',
    }),
    200,
    'replay',
  )
  assert.equal(replay.body.replayed, true)
  assert.equal(replay.body.deductionId, first.body.deductionId)
  expectStatus(
    await api(
      'POST',
      deductionPath,
      management,
      { ...deduction, quantity: 1 },
      { 'Idempotency-Key': 'phase5-stable-key' },
    ),
    409,
    'changed replay',
  )
  expectStatus(
    await api(
      'POST',
      deductionPath,
      management,
      { ...deduction, quantity: 3 },
      { 'Idempotency-Key': 'phase5-too-many' },
    ),
    409,
    'minimum stock',
  )
  expectStatus(
    await api(
      'POST',
      deductionPath,
      management,
      { ...deduction, warehouseId: other.id, quantity: 1 },
      { 'Idempotency-Key': 'phase5-wrong-warehouse' },
    ),
    404,
    'wrong warehouse',
  )
  expectStatus(
    await api('POST', deductionPath, null, deduction, {
      'Idempotency-Key': 'phase5-unauthenticated',
    }),
    401,
    'unauthenticated deduction',
  )
  expectStatus(
    await api('POST', deductionPath, auditor, deduction, { 'Idempotency-Key': 'phase5-auditor' }),
    403,
    'auditor deduction',
  )
  const concurrent = await Promise.all(
    ['a', 'b'].map((part) =>
      api(
        'POST',
        deductionPath,
        management,
        { ...deduction, externalReference: `phase5-concurrent-${part}`, quantity: 2 },
        { 'Idempotency-Key': `phase5-concurrent-${part}` },
      ),
    ),
  )
  assert.deepEqual(concurrent.map((result) => result.status).sort(), [200, 409])
  assert.equal(
    expectStatus(
      await api('GET', `/api/v1/warehouses/${warehouse.id}/items/${items[0].id}`, management),
      200,
      'remaining stock',
    ).body.qty,
    1,
  )

  const current = expectStatus(
    await api('GET', `/api/v1/warehouses/${other.id}`, management),
    200,
    'warehouse ETag',
  )
  expectStatus(
    await api('PUT', `/api/v1/warehouses/${other.id}`, management, {
      name: 'Phase 5 South Updated',
      address: 'Test street',
      city: 'Amman',
      countryCode: 'JO',
    }),
    428,
    'missing If-Match',
  )
  expectStatus(
    await api(
      'PUT',
      `/api/v1/warehouses/${other.id}`,
      management,
      { name: 'Phase 5 South Updated', address: 'Test street', city: 'Amman', countryCode: 'JO' },
      { 'If-Match': current.headers.get('etag') },
    ),
    200,
    'current If-Match',
  )
  expectStatus(
    await api(
      'PUT',
      `/api/v1/warehouses/${other.id}`,
      management,
      { name: 'Phase 5 South Again', address: 'Test street', city: 'Amman', countryCode: 'JO' },
      { 'If-Match': current.headers.get('etag') },
    ),
    412,
    'stale If-Match',
  )

  const order = expectStatus(
    await api('POST', '/api/v1/supplier-orders', management, {
      warehouseId: warehouse.id,
      itemId: items[0].id,
      requestedQuantity: 6,
      supplierDestination: 'local-only@phase5.example.test',
    }),
    201,
    'supplier order',
  )
  assert.equal(order.body.status, 'Pending')
  expectStatus(
    await api('POST', '/api/v1/supplier-orders', auditor, {
      warehouseId: warehouse.id,
      itemId: items[0].id,
      requestedQuantity: 6,
      supplierDestination: 'local-only@phase5.example.test',
    }),
    403,
    'auditor supplier write',
  )
  let sent = false
  for (let attempt = 0; attempt < 30; attempt++) {
    const list = expectStatus(
      await api('GET', '/api/v1/supplier-orders', auditor),
      200,
      'auditor supplier read',
    )
    if (list.body.items[0]?.status === 'Sent') {
      sent = true
      break
    }
    await delay(500)
  }
  assert.equal(sent, true, 'local outbox delivery did not complete')
  expectStatus(await api('GET', '/api/v1/logs', auditor), 403, 'auditor logs')
  expectStatus(await api('GET', '/api/v1/users', management), 403, 'manager users')

  browser = await chromium.launch({
    ...(process.env.CI ? {} : { channel: 'chrome' }),
    headless: true,
  })
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()
  await page.goto(baseUrl)
  await page.getByRole('textbox', { name: 'Email address' }).waitFor()
  await audit(page, 'English sign-in')
  await page.screenshot({ path: resolve(output, 'login-en.png'), fullPage: true })
  await page.getByRole('textbox', { name: 'Email address' }).fill('admin@happywarehouse.com')
  await page.getByLabel('Password').fill(bootstrapPassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('heading', { name: /Welcome/ }).waitFor()
  assert.equal(
    await page.getByRole('link', { name: 'Overview' }).getAttribute('aria-current'),
    'page',
  )
  await audit(page, 'English overview')
  await page.screenshot({ path: resolve(output, 'overview-en.png'), fullPage: true })
  await page.goto(`${baseUrl}/dashboard`)
  await page.getByText('Warehouses tracked').waitFor()
  await audit(page, 'English dashboard')
  await page.screenshot({ path: resolve(output, 'dashboard-en.png'), fullPage: true })
  await page.goto(`${baseUrl}/users`)
  await page.getByRole('heading', { name: 'What each role can do' }).waitFor()
  await audit(page, 'English roles')
  await page.goto(`${baseUrl}/notifications`)
  await page.getByRole('heading', { name: 'Send a notification' }).waitFor()
  await page.getByRole('combobox', { name: 'Recipient' }).fill(auditorEmail)
  await page.getByRole('option', { name: /auditor@phase5.example.test/ }).click()
  await page.getByRole('textbox', { name: 'Title' }).fill('Initial stock review')
  await page.getByRole('textbox', { name: 'Message' }).fill('Please review the stock report.')
  await page.getByRole('button', { name: 'Send notification' }).click()
  await page.getByText('Notification saved for the recipient.').waitFor()
  await audit(page, 'English notification composer')
  await page.screenshot({ path: resolve(output, 'notifications-en.png'), fullPage: true })
  await page.goto(`${baseUrl}/warehouses`)
  await page.getByRole('link', { name: 'Phase 5 North' }).waitFor()
  assert.equal(
    await page.getByRole('link', { name: 'Warehouses' }).getAttribute('aria-current'),
    'page',
  )
  await page.getByRole('textbox', { name: 'Search' }).fill('Phase 5 South')
  await page.getByRole('button', { name: 'Search' }).click()
  await page.getByRole('link', { name: 'Phase 5 South Updated' }).waitFor()
  assert.equal(await page.getByRole('link', { name: 'Phase 5 North' }).count(), 0)
  await page.goto(`${baseUrl}/report`)
  await page.getByText('Phase 5 widget 12').waitFor()
  await page.waitForFunction(() => !document.querySelector('.report-actions button[disabled]'))
  await page.waitForTimeout(300)
  assert.equal(await page.locator('tbody tr').count(), 12)
  await audit(page, 'English report')
  await page.emulateMedia({ media: 'print' })
  assert.equal(await page.locator('nav').isVisible(), false)
  await page.screenshot({ path: resolve(output, 'report-en.png'), fullPage: true })
  const englishPdf = await page.pdf({ format: 'A4', printBackground: true })
  assert.ok(englishPdf.length > 3000)
  await writeFile(resolve(output, 'report-en.pdf'), englishPdf)
  await page.emulateMedia({ media: 'screen' })
  await page.getByRole('combobox', { name: 'Language' }).click()
  await page.getByRole('option', { name: 'العربية' }).click()
  await page.waitForFunction(
    () => document.documentElement.lang === 'ar' && document.documentElement.dir === 'rtl',
  )
  await page.getByRole('heading', { name: 'تقرير المخزون' }).waitFor()
  await audit(page, 'Arabic report')
  await page.emulateMedia({ media: 'print' })
  assert.equal(await page.locator('nav').isVisible(), false)
  await page.screenshot({ path: resolve(output, 'report-ar.png'), fullPage: true })
  const arabicPdf = await page.pdf({ format: 'A4', printBackground: true })
  assert.ok(arabicPdf.length > 3000)
  await writeFile(resolve(output, 'report-ar.pdf'), arabicPdf)
  await page.emulateMedia({ media: 'screen' })
  await page.goto(baseUrl)
  await page.getByRole('heading', { name: /مرحبًا/ }).waitFor()
  await audit(page, 'Arabic overview')
  await page.screenshot({ path: resolve(output, 'overview-ar.png'), fullPage: true })
  await page.goto(`${baseUrl}/notifications`)
  await page.getByRole('heading', { name: 'إرسال إشعار' }).waitFor()
  await audit(page, 'Arabic notification composer')
  await page.screenshot({ path: resolve(output, 'notifications-ar.png'), fullPage: true })
  await page.goto(`${baseUrl}/supplier-orders`)
  await page.getByText('سُجّل محليًا').waitFor()
  await audit(page, 'Arabic supplier orders')
  const secondTab = await context.newPage()
  await Promise.all([page.reload(), secondTab.goto(`${baseUrl}/supplier-orders`)])
  await Promise.all([
    page.getByText('سُجّل محليًا').waitFor(),
    secondTab.getByText('سُجّل محليًا').waitFor(),
  ])
  assert.equal(await secondTab.locator('html').getAttribute('dir'), 'rtl')
  await context.close()

  const auditorContext = await browser.newContext({ ignoreHTTPSErrors: true })
  const auditorPage = await auditorContext.newPage()
  await auditorPage.goto(baseUrl)
  await auditorPage.getByRole('textbox', { name: 'Email address' }).fill(auditorEmail)
  await auditorPage.getByLabel('Password').fill(bootstrapPassword)
  await auditorPage.getByRole('button', { name: 'Sign in' }).click()
  await auditorPage.getByRole('heading', { name: /Welcome/ }).waitFor()
  assert.equal(await auditorPage.getByRole('link', { name: 'Users and access' }).count(), 0)
  await auditorPage.goto(`${baseUrl}/notifications`)
  await auditorPage.getByRole('heading', { name: 'Initial stock review' }).waitFor()
  assert.equal(await auditorPage.getByRole('heading', { name: 'Send a notification' }).count(), 0)
  await auditorPage.getByText('Live updates connected').waitFor()
  expectStatus(
    await api('POST', '/api/v1/notifications', admin, {
      recipientUserId: auditorId,
      title: 'Count aisle A',
      body: 'Please verify aisle A now.',
      sendEmail: false,
      sendSms: false,
    }),
    201,
    'live notification',
  )
  await auditorPage.getByRole('heading', { name: 'Count aisle A' }).waitFor()
  await auditorPage.getByRole('button', { name: 'Mark as read' }).first().click()
  await auditorPage.getByText('Read', { exact: true }).first().waitFor()
  await audit(auditorPage, 'Auditor notifications')
  await auditorPage.screenshot({
    path: resolve(output, 'notifications-auditor-en.png'),
    fullPage: true,
  })
  await auditorPage.goto(`${baseUrl}/report`)
  await auditorPage.getByText('Phase 5 widget 12').waitFor()
  await auditorPage.goto(`${baseUrl}/supplier-orders`)
  await auditorPage.getByText('Recorded locally').waitFor()
  assert.equal(
    await auditorPage.getByRole('button', { name: 'Prepare supplier request' }).count(),
    0,
  )
  await audit(auditorPage, 'Auditor supplier orders')
  await auditorContext.close()

  const mobileContext = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  const mobilePage = await mobileContext.newPage()
  await mobilePage.goto(baseUrl)
  await mobilePage.getByRole('textbox', { name: 'Email address' }).waitFor()
  await audit(mobilePage, 'mobile sign-in')
  await mobilePage.screenshot({ path: resolve(output, 'login-mobile-en.png'), fullPage: true })
  const signInBounds = await mobilePage.getByRole('button', { name: 'Sign in' }).boundingBox()
  assert.ok(
    signInBounds && signInBounds.y + signInBounds.height <= 844,
    'Mobile sign-in button should be visible without scrolling',
  )
  await mobilePage.getByRole('combobox', { name: 'Language' }).click()
  await mobilePage.getByRole('option', { name: 'العربية' }).click()
  await mobilePage.waitForFunction(() => document.documentElement.dir === 'rtl')
  await audit(mobilePage, 'mobile Arabic sign-in')
  await mobilePage.screenshot({ path: resolve(output, 'login-mobile-ar.png'), fullPage: true })
  const arabicSignInBounds = await mobilePage
    .getByRole('button', { name: 'تسجيل الدخول' })
    .boundingBox()
  assert.ok(
    arabicSignInBounds && arabicSignInBounds.y + arabicSignInBounds.height <= 844,
    'Arabic mobile sign-in button should be visible without scrolling',
  )
  await mobilePage.getByRole('combobox', { name: 'اللغة' }).click()
  await mobilePage.getByRole('option', { name: 'English' }).click()
  await mobilePage.waitForFunction(() => document.documentElement.lang === 'en')
  await mobilePage.getByRole('textbox', { name: 'Email address' }).fill(auditorEmail)
  await mobilePage.getByLabel('Password').fill(bootstrapPassword)
  await mobilePage.getByRole('button', { name: 'Sign in' }).click()
  await mobilePage.getByRole('heading', { name: /Welcome/ }).waitFor()
  const overviewWidth = await mobilePage.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }))
  assert.ok(
    overviewWidth.page <= overviewWidth.viewport + 1,
    `Overview page overflows mobile viewport: ${JSON.stringify(overviewWidth)}`,
  )
  await mobilePage.goto(`${baseUrl}/dashboard`)
  await mobilePage.getByText('Warehouses tracked').waitFor()
  const dashboardWidth = await mobilePage.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }))
  assert.ok(
    dashboardWidth.page <= dashboardWidth.viewport + 1,
    `Dashboard page overflows mobile viewport: ${JSON.stringify(dashboardWidth)}`,
  )
  await audit(mobilePage, 'mobile dashboard')
  await mobilePage.screenshot({ path: resolve(output, 'dashboard-mobile-en.png'), fullPage: true })
  await mobilePage.goto(`${baseUrl}/notifications`)
  await mobilePage.getByRole('heading', { name: 'Initial stock review' }).waitFor()
  const notificationWidth = await mobilePage.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }))
  assert.ok(
    notificationWidth.page <= notificationWidth.viewport + 1,
    `Notification page overflows mobile viewport: ${JSON.stringify(notificationWidth)}`,
  )
  await audit(mobilePage, 'mobile notifications')
  await mobilePage.screenshot({
    path: resolve(output, 'notifications-mobile-en.png'),
    fullPage: true,
  })
  await mobilePage.goto(`${baseUrl}/supplier-orders`)
  await mobilePage.getByText('Recorded locally').waitFor()
  const mobileWidth = await mobilePage.evaluate(() => ({
    page: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }))
  assert.ok(
    mobileWidth.page <= mobileWidth.viewport + 1,
    `Supplier order page overflows mobile viewport: ${JSON.stringify(mobileWidth)}`,
  )
  await audit(mobilePage, 'mobile supplier orders')
  await mobileContext.close()

  const managerUser = expectStatus(
    await api('GET', '/api/v1/users?search=manager%40phase5.example.test', admin),
    200,
    'manager lookup',
  ).body.items[0]
  const managerRecord = expectStatus(
    await api('GET', `/api/v1/users/${managerUser.id}`, admin),
    200,
    'manager ETag',
  )
  expectStatus(
    await api(
      'PUT',
      `/api/v1/users/${managerUser.id}`,
      admin,
      {
        email: managerEmail,
        fullName: managerUser.fullName,
        roleId: 2,
        active: false,
      },
      { 'If-Match': managerRecord.headers.get('etag') },
    ),
    200,
    'disable manager',
  )
  expectStatus(
    await api(
      'POST',
      deductionPath,
      management,
      { ...deduction, externalReference: 'disabled-token-attempt', quantity: 1 },
      { 'Idempotency-Key': 'phase5-disabled-token' },
    ),
    401,
    'disabled account token',
  )
  console.log(
    'Phase 5 passed: independent HTTP integration, roles, ETags, outbox, en/ar browser, print PDFs, accessibility.',
  )
  console.log(`Local print artifacts: ${output}`)
}

try {
  await main()
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  for (const child of children.reverse()) {
    if (child.exitCode === null) {
      const closed = new Promise((resolveClosed) => child.once('close', resolveClosed))
      child.kill()
      await Promise.race([closed, delay(5000)])
    }
  }
  if (temporary) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await rm(temporary, { recursive: true, force: true })
        break
      } catch (error) {
        if (attempt === 4) throw error
        await delay(500)
      }
    }
  }
}
