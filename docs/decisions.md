# Accepted foundation decisions

- Two public repositories under Anas-Abukhadir97; backend and frontend are independent sibling checkouts.
- .NET 10 LTS / EF Core 10 / SQLite, React / TypeScript / Vite, N-tier backend. React and .NET 10 supersede the older assessment stack.
- English/Arabic resources, Arabic RTL, stable role identifiers.
- JWT plus rotating refresh sessions are planned for Phase 3, not implemented here. Phase 2 pins the API-owned draft contract, including reload CSRF bootstrap and token-only external login.
- Global item-name uniqueness, quantity >=1, decimal prices represented as minor units internally and decimal strings externally; ETag concurrency planned.
- Phase 2 adds a checksummed API contract snapshot, generated TypeScript types and a typed fetch client. The client is not connected to UI flows yet. Docker/image publishing begins Phase 6; Azure is final Phase 8 after cost approval.
- TypeScript is pinned to 5.9.3 because the current openapi-typescript 7 generator declares TypeScript 5.x support; revisit that pin when the generator supports TypeScript 6.
- No software license selected yet. Original assessment documents and private planning material remain outside both repositories.
