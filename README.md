# Happy Inventory Web

React + TypeScript + Vite foundations. Personal owner: [Anas-Abukhadir97](https://github.com/Anas-Abukhadir97). Companion: [happy-inventory-api](https://github.com/Anas-Abukhadir97/happy-inventory-api).

## Status and setup

Phase 6 packages and publishes a non-root web image; the API repository records the [tested API/web digest pair](https://github.com/Anas-Abukhadir97/happy-inventory-api/blob/main/releases/phase-6-tested.json). Phase 5 added repeatable integrated browser/API verification and keeps the selected English/Arabic language across reloads. The localized supplier-order page supports manual preparation and local delivery status, alongside warehouse/item/user CRUD, dashboards, an Admin-only log viewer and a full-data print report. Auditor sees read-only inventory and supplier requests; Admin and Management can write. The API must run for normal use. Browser access tokens remain in memory with the Phase 3 session flow. The web repository pins the API-owned contract by checksum. eCommerce deductions are exposed to authenticated external clients through the API.

Use Node 24.14.1 (see .node-version/.nvmrc):

```sh
npm ci
npm run dev
```

Open https://localhost:5173 and accept the local development certificate in your browser. Vite serves HTTPS so the browser can use Secure refresh cookies, and proxies `/api` to the sibling backend on localhost:5080. Start the backend first. First-run demo login is `admin@happywarehouse.com` / `P@ssw0rd` in Development only. Do not put secrets in `VITE_*` variables; all frontend bundles are public. No environment variables are required now. index.html receives its title from localization on startup.

## Container image

The production web Dockerfile builds pinned Node dependencies and serves the static app with Caddy as user 10001. Caddy terminates local HTTPS at port 8443 and proxies `/api/*` to the sibling API on a private Compose network, preserving same-origin secure refresh cookies. Its local certificate authority lives in a persistent Caddy volume. Trust that CA on a development machine before browser use; this is not a public deployment certificate. The API repository owns the local Compose file and database volume. Build the web image independently with `docker build -t happy-inventory-web:local .`.

Web CI builds the container independently. After the checks pass on `main`, the workflow publishes a commit-tagged image to GHCR and uploads its immutable digest. The API repository records tested API/web digest pairs. Azure hosting remains Phase 8.

## Verify

```sh
npm run lint
npm run contract:check
npm run typecheck
npm run format:check
npm run test:coverage
npm run build
npm run test:e2e
```

For `test:e2e`, first build the sibling API in Release (`dotnet build HappyInventory.sln -c Release` from `backend/`) and leave ports 5080 and 5173 free. The script starts both services against a fresh temporary SQLite database, uses local Chrome in headless mode, and writes ignored English/Arabic print artifacts under `artifacts/phase5/`. It stops the services and removes its temporary database afterward. Hosted CI installs Chromium and runs the same test.

Tests verify login-first rendering, session restore, roles, Arabic RTL/resource parity, warehouse list and create UI, supplier-order preparation, complete report pagination and print invocation, guarded business transport with ETags, GET refresh/retry and no automatic mutation replay. CI runs these independently. Access tokens are held only in memory; Secure HttpOnly refresh cookies are owned by the API. A non-secret sessionStorage flag prevents silent restoration after an uncertain refresh failure. [Contract notes](docs/contracts/README.md) explain the snapshot and regeneration workflow.

## Localization and roadmap

All user-facing text lives in src/locales/en/common.json and src/locales/ar/common.json. Add/reuse keys in both, including errors and aria labels. Role IDs and backend-owned messages are unchanged. Document language/direction, theme direction and Emotion RTL transformation update together.

Warehouse, item, user, dashboard, log, supplier-order and print screens are implemented. The print report loads every warehouse and item page rather than printing only the visible ten rows. See [decisions](docs/decisions.md), [Phase 5 evidence](docs/phase-5.md), and the API's [canonical requirements](https://github.com/Anas-Abukhadir97/happy-inventory-api/blob/main/docs/requirements.md). Browser print output and automated accessibility checks passed in Phase 5; manual assistive-technology review remains a broader release activity.

## Future features and license

Advanced exports, multi-currency, complete country catalog, warehouse permissions, MFA and procurement UI are future work; see the [canonical backlog](https://github.com/Anas-Abukhadir97/happy-inventory-api/blob/main/docs/backlog.md). Azure remains the final planned phase after cost approval. No open-source license has been selected; source assessment attachments are not published.
