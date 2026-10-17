# Happy Inventory Web

React + TypeScript + Vite foundations. Personal owner: [Anas-Abukhadir97](https://github.com/Anas-Abukhadir97). Companion: [happy-inventory-api](https://github.com/Anas-Abukhadir97/happy-inventory-api).

## Status and setup

Phase 1 is a localized foundation preview, with Material UI, Arabic RTL, routing, Query provider and tests. Login, inventory and data integration are **not implemented yet**. Planned features are clearly labelled in the preview. It runs independently of the API.

Use Node 24.14.1 (see .node-version/.nvmrc):

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Vite proxies /api to the sibling backend on localhost:5080. Do not put secrets in VITE_* variables; all frontend bundles are public. No environment variables are required now. index.html receives its title from localization on startup.

## Verify

```sh
npm run lint
npm run typecheck
npm run format:check
npm run test:coverage
npm run build
```

Tests verify translated preview content, language switching/RTL, missing-route recovery and resource parity. CI runs these independently. React Router/TanStack Query/Material UI providers are ready; react-hook-form/Zod dependencies are installed for later forms. No generated client or fabricated API contract is included; Phase 2 provides a pinned contract.

## Localization and roadmap

All user-facing text lives in src/locales/en/common.json and src/locales/ar/common.json. Add/reuse keys in both, including errors and aria labels. Role IDs and backend-owned messages are unchanged. Document language/direction, theme direction and Emotion RTL transformation update together.

Current planned scope: secure login/refresh, warehouses/items/users, dashboard, log viewer, full print view and integration screens. See [decisions](docs/decisions.md), [phase evidence](docs/phase-1.md), and the API's [canonical requirements](https://github.com/Anas-Abukhadir97/happy-inventory-api/blob/main/docs/requirements.md).

## Future features and license

Advanced exports, multi-currency, complete country catalog, warehouse permissions, MFA and procurement UI are future work; see the [canonical backlog](https://github.com/Anas-Abukhadir97/happy-inventory-api/blob/main/docs/backlog.md). Azure remains the final planned phase after cost approval. Container/image pipelines arrive in Phase 6. No open-source license has been selected; source assessment attachments are not published.
