# Project instructions

Read README.md and docs/decisions.md before changing behavior. API owns the canonical requirements, backlog and versioned contract. Work within the phase authorized by the user; Phase 5 integrated hardening is complete and Phase 6 containers are next.

Use the existing localization system for all new or changed user-facing text, including labels, validation, notifications and accessibility text. Reuse resource keys or add them to existing en/ar resources. Preserve authorization role identifiers Admin/Management/Auditor and backend-owned messages.

Keep credentials, tokens, runtime databases, logs and original assessment attachments out of commits and logs. Preserve the agreed React/TypeScript/Vite and .NET 10/EF Core 10/SQLite stack. Do not silently change the API contract, authentication design or provider. Inventory quantities must remain >=1, item names globally unique and list pages capped at 10; preserve protected bootstrap-admin rules.

Use focused Conventional Commits and feature branches/PRs. Run relevant checks and report actual results. Default to one primary agent; parallel agents require explicit authorization. Azure is Phase 8 and requires a concrete approved cost proposal before provisioning. Supplier messages require explicit recipient/channel and sending authorization. Public visibility does not imply an open-source license.

## Frontend boundaries and checks

Use src/locales/en/common.json and src/locales/ar/common.json; update both and test RTL. Keep access tokens out of localStorage/sessionStorage. The API owns contracts; update the pinned snapshot from its reviewed release, then regenerate the client. Never edit generated files or invent endpoints.

Run npm ci, npm run contract:check, npm run lint, npm run typecheck, npm run format:check, npm run test:coverage and npm run build. Read the canonical requirements/backlog in the companion API repository. Browser tests against real services begin when those features exist.
