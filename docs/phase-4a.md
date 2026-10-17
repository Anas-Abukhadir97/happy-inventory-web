# Phase 4A web acceptance

The supplier-order page lets Admin and Management select a warehouse and item from all paginated inventory records, set a positive requested quantity and destination, and create a manual order request. All authenticated roles can see 10-row order pages and local delivery status. The notice explicitly states that no supplier is contacted. English and Arabic text comes from existing locale resources, and the layout inherits the RTL theme.

The print report loads all warehouse pages and every selected warehouse's item pages before enabling Print. The report contains warehouse context, item quantities, totals and a generation time. Automated tests cover the later pages and print invocation. Browser print-preview and accessibility review are Phase 5 acceptance items.

The eCommerce deduction endpoint is an API integration for independent authorized clients; the browser does not offer an order-line deduction form. The API's `docs/phase-4a.md` describes its idempotency contract.
