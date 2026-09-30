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
- Same-origin mutations, bounded bodies, strict input schemas. One mailbox, one checked invoice attachment up to 10 MiB. No CC/BCC or tracking pixels. Nodemailer file/URL fetching is disabled. HTML and an embedded logo are supported with the restrictions below.
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

Reminders, connected Google/Microsoft mailboxes, inbound replies, dual approval and delivery pricing remain later product work.

## Full composer and bilingual company templates

Migration `0024_invoice_email_composer.sql` adds one reusable template per company/language, private logo metadata, immutable message snapshots and richer event evidence. Existing deliveries retain their original evidence; hashes are not retroactively fabricated. Restart `pnpm dev` after applying the migration so the email worker loads the new message format.

The delivery page exposes the full subject, message and signature, with optional HTML editing under Advanced options and a server-cleaned preview. Owners/admins save and apply German and English templates separately. Reviewers may edit individual outgoing messages. `{{invoiceNumber}}` and `{{companyName}}` expand on preview; HTML values are escaped. Applying/resetting a template explicitly replaces the draft. Visual mode generates matching plain-text and HTML alternatives; advanced HTML mode permits independent editing. Both alternatives are available in the final preview.

`sanitize-html` 2.17.7 (MIT, Node >=22.12, maintained in Apostrophe's monorepo) is a direct dependency because parsing untrusted HTML/CSS requires a maintained sanitizer. The server allows email layout tags, HTTPS/mailto links and a small inline-CSS allowlist. It removes scripts, forms, stylesheets, SVG, event handlers, remote images and all CSS URLs. Preview uses a sandboxed iframe with restrictive CSP and no scripts or origin privileges. Only the approved embedded logo can appear as an image; email clients may render CSS differently.

Owners/admins upload PNG/JPEG logos up to 512,000 bytes/four million pixels. Signature checks and ClamAV precede Sharp normalization to a metadata-free PNG of at most 600×300 pixels. Files are private, tenant-owned, hash-checked and embedded via CID, never fetched remotely. Maximum 20 immutable logo versions per company; they remain available for historical sends and are scheduled for durable cleanup when company metadata is deleted. No large image binaries are stored in PostgreSQL.

Queueing requires a hash matching the normalized preview. The worker checks message and logo integrity as well as the existing immutable invoice attachment. Stored evidence includes exact text/HTML, sender/recipient, creator, message ID, message/attachment hashes and explicit resend/recipient-change acknowledgements. Resends require the latest previous delivery ID and a server-validated acknowledgement. An address differing from the invoice or prior send requires typing that address again. Double requests remain idempotent and uncertain outcomes are never retried automatically.

The timeline always shows queue, sending and handoff/failure events. Local owner/admin test controls can append clearly labeled delivered/bounced/complained simulations (idempotent event keys, at most ten per delivery). Simulations never claim real delivery, change invoice status or overwrite Mailpit acceptance. SES-signed production callbacks and suppression are still part of the production milestone; no unauthenticated provider callback endpoint is exposed.

## Visual message and signature editor

Migration `0025_invoice_email_visual.sql` adds optional structured layout metadata to company templates. The default editor has a message field, expandable signature fields (name, role, pronouns, company, address, phone, mobile and custom text), a scanned logo upload, logo size, divider toggle, placement presets and keyboard-accessible up/down controls for section order. Blank fields are omitted. Text and HTML alternatives are rendered together with escaped text; the server regenerates visual layouts from the strictly validated fields and still sanitizes the result.

Company templates automatically load into untouched drafts for their language. Edits remain separate across DE/EN switches. Saving explicitly updates the shared company template with optimistic revision checks. A debounced server-sanitized preview uses resolved invoice/company values and the existing sandbox. Only the final reviewed render is queued; editable layout metadata does not alter issued invoices or past messages. The HTML editor is under Advanced options. Existing HTML templates stay editable without automatic conversion; rebuilding them visually is explicit and replaces their layout. The final confirmation still checks sender, recipient, attachment, resend and changed-address acknowledgements.

References: [SMTP security options](https://nodemailer.com/smtp), [message configuration](https://nodemailer.com/message).
