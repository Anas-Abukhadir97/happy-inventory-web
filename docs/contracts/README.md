# Pinned API contract

`openapi.v1.json` is a reviewed snapshot of the API repository's `docs/contracts/openapi.v1.json` at draft version 0.2.0-draft. `openapi.v1.sha256` pins its exact bytes. `npm run generate:api` generates `src/lib/api/generated.ts`; do not edit that file by hand. `npm run contract:check` checks the checksum and regenerated output in CI. `src/lib/api/client.ts` supplies a typed fetch client but is not wired into the preview because the API operations are planned for later phases.

For an API contract change, merge its API PR first, copy the released contract into this folder, update the SHA-256 file, run `npm run generate:api`, and review the generated diff in a linked web PR. No token or secret belongs in the snapshot or frontend bundle. Browser auth/CSRF transport is specified in the API contract notes and will be implemented in Phase 3.
