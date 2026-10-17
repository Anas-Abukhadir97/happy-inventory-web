# Phase 4 assessment screens

The web app now connects warehouse and item lists/forms, Admin user management/password reset, dashboard counts and quantity extremes, and the Admin-only event-log viewer to the API's reviewed draft contract. The API enforces authorization; the UI also hides write controls from Auditor. Every new label, error, validation hint, confirmation and accessibility name uses the existing English/Arabic resources. Stale ETags surface a localized reload message. Writes are not automatically replayed after a refresh race.

The print report loads all pages of warehouse statuses and all item pages per warehouse before enabling Print. It includes warehouse context, distinct count, total quantity, item quantities and generation time, with a print-specific layout. Browser print-preview and integrated accessibility checks continue in Phase 5.

Local verification on 17 October 2026: contract checksum/regeneration, ESLint, TypeScript, Prettier, 23 Vitest tests and production build passed. Coverage includes every new page: 76.10% statements, 72.05% branches and 78.31% lines. A live HTTPS Vite-proxy smoke test exercised authentication, inventory, dashboard and logs, with temporary records removed. Hosted CI evidence is attached to the Phase 4 PR. eCommerce deductions and supplier-order UI are Phase 4A.
