# Subscription and billing operations

## Surfaces and permissions

- `/admin/billing`: Payload super-admin only; **Customers & billing** in the CMS sidebar.
- `/de/pricing`, `/en/pricing`: fresh public plan comparison.
- `/[locale]/portal/billing`: company owner subscription and plan selection.
- `/[locale]/portal/billing/usage`: owner usage dashboard.
- `/[locale]/portal/billing/history`: owner subscription invoices and billing activity.

Payload staff and Better Auth customers remain separate. The CMS view operates on existing customer tables through an authorized service, avoiding duplicate identities. Current staff role is re-read on each administration request. Owner membership is re-read and locked before billing mutations. Proxy performs an optimistic cookie routing check; the database session and roles remain authoritative in pages and APIs. Every browser mutation checks Origin and validates bounded input.

The CMS manages customer names, company invoice profiles, suspension/restoration, session revocation, password resets, plan prices/allowances, one-invoice percentage promotion codes, temporary plan grants, and scheduled cancellation/resumption. Paid subscriptions also link to Stripe's test dashboard. Password management sends Better Auth reset emails and revokes sessions; hashes, tokens and reset links are never returned to the CMS. Suspension revokes sessions and blocks new sessions. Restoration does not restore old sessions. There is no impersonation, unverified email reassignment, arbitrary SQL editing or destructive history deletion.

## Development defaults

| Plan         | Documents/month | Uploads/day | Files/batch | Seats | Storage |
| ------------ | --------------: | ----------: | ----------: | ----: | ------: |
| Free         |              10 |           5 |           1 |     1 | 250 MiB |
| Starter      |             100 |          25 |           1 |     2 |   2 GiB |
| Professional |             500 |         100 |           5 |    10 |  10 GiB |
| Business     |           2,000 |         500 |           5 |    30 |  50 GiB |

Edit limits and prices in the CMS. Paid plans initially have no published price. Publishing requires a positive monthly EUR price and working Stripe test credentials. Price changes create new Stripe Prices; existing subscribers keep their agreed price. Historical price IDs map to their plans. Allowance edits apply immediately. Time-limited complimentary grants override entitlements without changing provider charges; use these for manually assigned trials.

Allowances use calendar months in Europe/Berlin, not Stripe billing anniversaries. Uploads and manual drafts count as documents. The daily allowance applies only to uploads. Export allowance equals the monthly document allowance and counts each successfully exported invoice once, regardless of formats, retries or downloads. New format generation also checks storage. Deletion does not refund document/export usage. Existing files remain accessible after cancellation or exceeding limits. Downgrades do not remove existing members; new invitations are blocked when over capacity. Pending invitations reserve seats.

Per-company PostgreSQL advisory locks serialize quota decisions. Usage is appended in the document/export transaction. Idempotent upload/manual requests return their original result. Database seat triggers protect concurrent invitations and membership creation, including auth routes. Upload safety ceilings remain 5 files/request, 20 MiB/request and the configured per-file cap.

Storage counts retained originals and exports. Database records, transient processing files, filesystem overhead and pending physical cleanup are not billable storage. Migration 0013 backfills existing documents; 0014 preserves legacy deleted-document usage and existing exported-invoice counts. The legacy daily counter mixed manual drafts with uploads, so the historical deleted-upload split cannot be reconstructed. Reconcile old export byte sizes before enabling new uploads after deployment.

## Stripe test setup

1. Set `STRIPE_SECRET_KEY=sk_test_...` and `STRIPE_PUBLISHABLE_KEY=pk_test_...` in ignored `.env`, then restart. Live keys are rejected. Only the publishable key reaches the browser; card details go directly from Stripe Elements to Stripe.
2. Install Stripe CLI. `pnpm dev` automatically gets the local signing secret and runs the test webhook listener alongside Next and the document worker. Secrets are passed through environment variables and never logged. A listener failure stops development so payment sync cannot silently disappear. For an already-running website, `pnpm billing:listen` writes the local secret to ignored `.env.local` and forwards events to port 3000 (`PORT` overrides it); restart Next if it has not reloaded the environment. Do not run both listeners. Set `STRIPE_LOCAL_WEBHOOKS=false` only when forwarding separately. Deployed event destinations need their own signing secret; do not use the CLI secret in production.
3. In `/admin/billing`, enter monthly EUR prices and publish the plans. Products/prices are created in Stripe. Prices are tax-exclusive; production tax collection, registrations and price presentation require launch configuration. This version is test-only.
4. As a company owner, choose a plan. Taxful's custom `billing/checkout?plan=…` page embeds Stripe Payment and Billing Address Elements, collects the billing email explicitly, accepts CMS promotion codes and optionally EU VAT details. It uses Checkout Sessions with `ui_mode=elements`. Saved-card setup uses a SetupIntent. This release supports cards, including supported card wallets; other payment methods need separate lifecycle testing.
5. Subscription management stays within Taxful: monthly base price, saved cards/default selection, billing details, scheduled changes, cancellation/resumption, outstanding invoices and billing history. `billing/change?plan=…` previews the amount before confirmation. Upgrades use `pending_if_incomplete` with a fixed proration timestamp; failed payments retain previous access. Downgrades use a Stripe schedule and take effect at renewal. Users can remove the schedule. Pending-payment recovery supports a new card, retry, bank verification and a hosted invoice fallback. The Stripe portal remains a fallback for bespoke/unsupported provider configurations. Quantity is fixed to one company subscription, and existing customers retain historical prices.

The super-admin company view loads Stripe billing contact/address data and masked saved-card details on demand. Full card numbers and bank credentials never enter Taxful. Customers may remove a non-default card directly. Removing the default card automatically promotes the sole replacement first; when no unambiguous replacement exists, the customer must add or select one before an active subscription's default can be removed. 6. Subscribe to these webhook events: `customer.subscription.created`, `.updated`, `.deleted`, `.paused`, `.resumed`; `invoice.paid`, `.payment_failed`, `.payment_action_required`, `.voided`, `.marked_uncollectible`, `.finalized`; `checkout.session.completed`, `.async_payment_succeeded`, `.async_payment_failed`.

The SDK verifies the raw, bounded body before processing. Live events are rejected. Event deduplication and state updates commit together. The provider customer ID must already map to a company; client metadata never selects the tenant. Under a company lock, handlers retrieve current Stripe state instead of trusting delayed snapshots. Unknown prices/multiple live subscriptions fail closed with a retryable response. Checkout redirects grant nothing.

Migration 0015 records grant issue times, backfilled from staff audit history. Confirmed active paid subscriptions end older complimentary grants, with an idempotent audit event. Unpaid checkout keeps the grant, and an explicitly issued later grant remains until expiry/removal. Both CMS and customer billing distinguish the subscribed plan from effective access. Mounted billing screens refresh every 15 seconds and on focus; customer billing also performs an authenticated provider reconciliation on entry. Admin polling refreshes billing labels without replacing unsaved company forms.

Gifts default to 30 days from issuance. Super-admins can alternatively choose the current paid period end (reconciled with Stripe first) or an exact future date/time within one year. Gift expiry never charges the paid Pro price or restarts the underlying Starter billing cycle. Migration 0017 makes effective access the higher of valid paid access and an active gift, so a lower gift cannot reduce a purchased Business plan.

Migration 0016 stores immutable owner/organization-scoped operation intent and ten-minute plan-change quotes. Confirmation rechecks the provider state and current published price; provider idempotency keys survive a lost HTTP response/local commit. Requests older than 23 hours are rejected before Stripe's idempotency retention can expire. Quote amounts use a fixed Stripe proration date. Owner checks, Origin validation, bounded strict schemas and per-company locks apply to every custom action. Migration 0017 adds a 40-request/minute/company limit. Only masked card details are returned; complete card numbers are never stored by Taxful. Operation inputs can contain customer-supplied billing contact information, but never card data or client secrets.

Unpaid upgrades retain previously confirmed entitlements. Past-due subscriptions keep their prior plan for seven days anchored to the invoice due/creation date; repeated events do not extend the grace period. Canceled, unpaid, paused, expired and incomplete subscriptions fall back to Free. Active access expires at the known provider period end unless renewed state is confirmed. Files remain intact. Owners can refresh provider state.

## Maintenance and testing

```sh
pnpm customer:migrate
pnpm exec tsx scripts/billing-maintenance.ts
pnpm billing:reconcile
DOCUMENT_INTEGRATION=true pnpm exec tsx --test tests/documents/billing.test.ts
pnpm exec tsx --test tests/documents/billing-management.test.ts
STRIPE_INTEGRATION=true pnpm exec tsx tests/documents/billing-stripe.integration.ts
# With an isolated server at localhost:3100 and BETTER_AUTH_URL=http://localhost:3100:
STRIPE_INTEGRATION=true BETTER_AUTH_URL=http://localhost:3100 pnpm exec tsx tests/documents/billing-checkout.smoke.ts
```

The first maintenance invocation fills old export sizes; `billing:reconcile` also refreshes Stripe customers. Schedule reconciliation in deployment infrastructure (e.g. hourly) and alert on a nonzero exit or webhook 5xx responses. No scheduler is installed by this change. Stripe retries complement reconciliation. Staff/owner audits retain action metadata and reasons, not secrets or payment details. Local billing history displays the most recent 100 provider invoices; Stripe retains full history. CMS customer/company lists paginate.

Synthetic tests cover tenant/role isolation, quota races, idempotency, seat limits, signature tampering/expiry, duplicate events, unpaid access, grace expiry, gift expiry and cancellation. Opt-in Stripe tests create synthetic test customers and clean them up; they exercise checkout reuse, card setup, paid upgrade/replay, scheduled downgrade, cancellation/resumption and declined-payment recovery. Browser checks cover custom checkout and management, protected routes, forged company IDs, CSRF, staff roles, suspension, English/German and mobile. Production tax configuration and all bank-specific payment challenges still need launch acceptance testing.

Stripe's current React package exposes a TaxIdElement that the loaded Checkout Elements SDK did not support in browser verification. The custom page instead uses regular optional business-name/EU-VAT inputs and Checkout's `updateTaxIdInfo` action. Do not restore the unsupported widget based solely on TypeScript declarations.

MFA remains deferred. This is not a security certification. Production readiness additionally requires TLS, managed secrets, least-privilege DB access, encrypted private storage/backups, monitoring, recovery tests and independent security review.

References: [Stripe webhooks](https://docs.stripe.com/webhooks), [subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks), [customer portal](https://docs.stripe.com/customer-management).
