# Phase 2 delivery

The web repository pins the API-owned 0.2.0-draft contract by SHA-256, generates TypeScript types with `openapi-typescript`, and exposes a typed `openapi-fetch` client for later phases. The preview UI remains localized in English and Arabic and does not yet invoke API business routes. Authentication and actual inventory screens belong to Phases 3 and 4.

Local verification on 17 October 2026: clean `npm ci` (zero reported vulnerabilities), contract checksum/regeneration, ESLint, TypeScript, Prettier, four Vitest tests, and production build passed. Vite reported a bundle-size advisory for the existing preview chunk. CI runs the same gates on each PR.
