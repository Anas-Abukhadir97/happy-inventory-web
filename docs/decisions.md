# Accepted foundation decisions

- Two public repositories under Anas-Abukhadir97; backend and frontend are independent sibling checkouts.
- .NET 10 LTS / EF Core 10 / SQLite, React / TypeScript / Vite, N-tier backend. React and .NET 10 supersede the older assessment stack.
- English/Arabic resources, Arabic RTL, stable role identifiers.
- Phase 3 implements browser login and refresh against the API-owned draft contract. Access tokens stay in memory; Secure refresh cookies remain HttpOnly. CSRF is bootstrapped before each cookie-authenticated POST. Web Locks serialize refresh across tabs when supported; a failed rotation ends the in-memory session. GET requests may refresh and retry once, while uncertain writes are never replayed automatically.
- Local Vite development uses HTTPS for Secure cookies. The API proxy remains on loopback HTTP and the backend validates the exact configured browser Origin. No credential is stored in localStorage or sessionStorage; sessionStorage contains only a non-secret flag after an uncertain refresh failure to prevent silent session restoration.
- Global item-name uniqueness, quantity >=1, decimal prices represented as minor units internally and decimal strings externally; Phase 4 writes use current version ETags.
- Phase 2 adds a checksummed API contract snapshot and generated TypeScript types. Phase 4 business transport uses those types, one authenticated fetch wrapper and `If-Match` ETags. The print report loads all server pages before printing. Docker/image publishing begins Phase 6; Azure is final Phase 8 after cost approval.
- TypeScript is pinned to 5.9.3 because the current openapi-typescript 7 generator declares TypeScript 5.x support; revisit that pin when the generator supports TypeScript 6.
- No software license selected yet. Original assessment documents and private planning material remain outside both repositories.
