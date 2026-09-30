# Invoice email delivery: local milestone

Approved, issued outgoing invoices can be emailed with an existing validated XRechnung or ZUGFeRD export attached unchanged. This milestone uses **local Mailpit only**. SES production delivery and domain ownership verification are not implemented yet.

## Local use

1. Run `pnpm customer:migrate` and `pnpm customer:mail`, then restart `pnpm dev`.
2. Review and approve an outgoing invoice, then choose **Create invoice and continue**. Validation opens a dedicated **Send or download invoice** page; creating an invoice no longer triggers an automatic download. Download buttons remain explicit choices.
3. If no sender exists, an owner/admin can configure it directly on that page (or in Profile) within five minutes of login/MFA verification. Choose the validated attachment, enter one recipient and an optional note, preview, confirm and queue. Files shows a prominent next action: review, create, or **Send / delivery history**. Issued invoice details also link to the delivery page. Incoming documents never show these sending actions.
4. Inspect the email at `http://localhost:8026`. Pending delivery history refreshes automatically; manual refresh is also available.

Development starts a separate email worker alongside Next.js and document processing, independent of scanner availability and extraction jobs. `pnpm dev` defaults `INVOICE_EMAIL_MODE` to `mailpit`; set `disabled` to disable it. Standalone `pnpm invoices:email-worker` and local production-build testing require explicit `INVOICE_EMAIL_MODE=mailpit`. `BETTER_AUTH_URL` must have a loopback hostname. SMTP is fixed to `127.0.0.1:1026`, separate from authentication SMTP configuration. Keep the supplied Mailpit container without forwarding/relay configuration. Use synthetic documents in development.

All messages stay in Mailpit, even for real-looking recipient domains. Sender settings are explicitly unverified. Selecting `ses` disables delivery: a configuration switch cannot promote local identities into verified production senders.

## Security and behavior

- Current membership on all reads/writes; owner/admin sender management, owner/admin/reviewer sending. The worker rechecks permissions, verified/non-suspended user, sender settings, invoice state, revision and attachment immediately before handoff.
- Same-origin mutations, bounded bodies, strict input schemas. One mailbox, one checked attachment up to 10 MiB. No CC/BCC, arbitrary uploads, HTML or tracking pixels. Nodemailer file/URL fetching is disabled.
- A send snapshots sender, recipient, subject/body, language, invoice revision, export ID and hash. Reply-To is the company address. No inbox connection, reply ingestion or Outlook/Gmail Sent copy.
- Queue intent is durable before SMTP handoff. Repeated request keys return the same delivery; changed payloads conflict. Company serialization protects concurrent requests. A resend must identify the latest previous delivery; queued/sending attempts block another send. UI requires explicit resend confirmation and warns about recipient mismatch.
- Limits: 20 queued messages per rolling hour and 100 per rolling 24 hours per company, including failed attempts. These are safety limits, not new subscription charges.
- States: queued → sending → accepted; failed before handoff; unknown after an uncertain handoff. Leases older than two minutes become unknown. No automatic retry; inspect Mailpit before explicit resend after unknown.
- SMTP acceptance changes issued to sent, preserving paid. The UI explicitly identifies local Mailpit acceptance; it is not real-customer delivery, reading or legal proof of receipt. Manual tracking remains available.
- Sender edits and delivery transitions are audited. History shows the last 50 sends with message/hash evidence; all rows persist. No email contents, addresses, tokens or provider errors in logs. Records follow company/document lifecycle; production retention needs review.

Migration `0022_invoice_email.sql` creates sender settings, deliveries and events in `customer_auth`; `0023_invoice_email_indexes.sql` indexes history and stalled-send lookups. Never edit an applied migration. No Payload changes or new dependencies.

## Verification

Start local PostgreSQL, Mailpit and both existing invoice validators, then:

```sh
DOCUMENT_INTEGRATION=true pnpm exec tsx --test tests/documents/invoice-email.test.ts
TAXFUL_BUILD_DIR=.next-email pnpm build
INVOICE_EMAIL_MODE=mailpit BETTER_AUTH_URL=http://localhost:3100 TAXFUL_BUILD_DIR=.next-email pnpm exec next start -p 3100
pnpm exec tsx tests/documents/invoice-email.smoke.ts
pnpm lint
```

If the bundled Playwright Chromium is unavailable, use installed Chrome with `PLAYWRIGHT_CHANNEL=chrome pnpm exec tsx tests/documents/invoice-email.smoke.ts`. Tests use a fresh browser profile.

Tests use disposable synthetic companies and company-scoped workers. They verify security boundaries, concurrent idempotency, revoked permissions, attachment tampering, unknown outcomes, stale leases, preservation of paid state, and exact attachment hashes through Mailpit for both officially validated formats. Browser smoke checks Profile setup, CSRF denial, preview, confirmation, sending, history, resends, both languages and mobile layout. Cleanup removes only fixture-owned messages, records and files.

## Future SES production milestone

Implement the SES API adapter in Frankfurt; tenant-bound domain onboarding with DKIM/DMARC and dedicated custom MAIL FROM; exact sender authorization; recent MFA for sender management; verification rechecks/suspension; workload IAM; signed delivery callbacks with replay protection; bounce/complaint suppression; and uncertain-outcome reconciliation. Existing mailbox MX records must remain intact. Local settings must be replaced by verified production identities. Document actual provider data flows, retention and processing agreements before sending customer data.

Reminders, connected Google/Microsoft mailboxes, inbound replies, custom templates, dual approval and delivery pricing remain later product work.

References: [SMTP security options](https://nodemailer.com/smtp), [message configuration](https://nodemailer.com/message).
