# Happy Inventory Web

React + TypeScript + Vite foundations. Personal owner: [Anas-Abukhadir97](https://github.com/Anas-Abukhadir97). Companion: [happy-inventory-api](https://github.com/Anas-Abukhadir97/happy-inventory-api).

## Status and setup

Phase 3 adds a localized login screen, in-memory access token, session restore, sign-out, role-aware welcome navigation and a guarded typed API client. The API must run for login and refresh. Inventory, dashboard and user-management screens remain **planned for Phase 4** and are labelled as such. The web repository still pins the API-owned draft contract by checksum.

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

Tests verify login-first rendering, successful/disabled login, session restore, role-aware navigation, sign-out, Arabic RTL, resource parity, GET refresh/retry and no automatic mutation replay. CI runs these independently. Access tokens are held only in memory; Secure HttpOnly refresh cookies are owned by the API. A non-secret sessionStorage flag prevents silent restoration after an uncertain refresh failure. [Contract notes](docs/contracts/README.md) explain the snapshot and regeneration workflow. Inventory operations are not invoked until their endpoints exist.

## Localization and roadmap

All user-facing text lives in src/locales/en/common.json and src/locales/ar/common.json. Add/reuse keys in both, including errors and aria labels. Role IDs and backend-owned messages are unchanged. Document language/direction, theme direction and Emotion RTL transformation update together.

Current planned scope: warehouses/items/users, dashboard, log viewer, full print view and integration screens. See [decisions](docs/decisions.md), [Phase 3 evidence](docs/phase-3.md), and the API's [canonical requirements](https://github.com/Anas-Abukhadir97/happy-inventory-api/blob/main/docs/requirements.md).

## Future features and license

Advanced exports, multi-currency, complete country catalog, warehouse permissions, MFA and procurement UI are future work; see the [canonical backlog](https://github.com/Anas-Abukhadir97/happy-inventory-api/blob/main/docs/backlog.md). Azure remains the final planned phase after cost approval. Container/image pipelines arrive in Phase 6. No open-source license has been selected; source assessment attachments are not published.
