# Happy Inventory Web

React + TypeScript + Vite foundations. Personal owner: [Anas-Abukhadir97](https://github.com/Anas-Abukhadir97). Companion: [happy-inventory-api](https://github.com/Anas-Abukhadir97/happy-inventory-api).

## Status and setup

Phase 4 adds localized warehouse/item/user CRUD, dashboards, an Admin-only log viewer and a full-data print report. Auditor sees read-only inventory; Admin and Management can write inventory. The API must run for all pages. Browser access tokens remain in memory with the Phase 3 session flow. The web repository pins the API-owned draft contract by checksum; eCommerce and supplier integrations remain Phase 4A.

Use Node 24.14.1 (see .node-version/.nvmrc):

```sh
npm ci
npm run dev
```

Open https://localhost:5173 and accept the local development certificate in your browser. Vite serves HTTPS so the browser can use Secure refresh cookies, and proxies `/api` to the sibling backend on localhost:5080. Start the backend first. First-run demo login is `admin@happywarehouse.com` / `P@ssw0rd` in Development only. Do not put secrets in `VITE_*` variables; all frontend bundles are public. No environment variables are required now. index.html receives its title from localization on startup.

## Verify

```sh
npm run lint
npm run contract:check
npm run typecheck
npm run format:check
npm run test:coverage
npm run build
```

Tests verify login-first rendering, session restore, roles, Arabic RTL/resource parity, warehouse list and create UI, guarded business transport with ETags, GET refresh/retry and no automatic mutation replay. CI runs these independently. Access tokens are held only in memory; Secure HttpOnly refresh cookies are owned by the API. A non-secret sessionStorage flag prevents silent restoration after an uncertain refresh failure. [Contract notes](docs/contracts/README.md) explain the snapshot and regeneration workflow.

## Localization and roadmap

All user-facing text lives in src/locales/en/common.json and src/locales/ar/common.json. Add/reuse keys in both, including errors and aria labels. Role IDs and backend-owned messages are unchanged. Document language/direction, theme direction and Emotion RTL transformation update together.

Warehouse, item, user, dashboard, log and print screens are implemented. The print report loads every warehouse and item page rather than printing only the visible ten rows. See [decisions](docs/decisions.md), [Phase 4 evidence](docs/phase-4.md), and the API's [canonical requirements](https://github.com/Anas-Abukhadir97/happy-inventory-api/blob/main/docs/requirements.md). Browser print-preview and integrated accessibility checks continue in Phase 5.

## Future features and license

Advanced exports, multi-currency, complete country catalog, warehouse permissions, MFA and procurement UI are future work; see the [canonical backlog](https://github.com/Anas-Abukhadir97/happy-inventory-api/blob/main/docs/backlog.md). Azure remains the final planned phase after cost approval. Container/image pipelines arrive in Phase 6. No open-source license has been selected; source assessment attachments are not published.
