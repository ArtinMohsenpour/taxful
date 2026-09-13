# Document converter

## First supported workflow

Taxful accepts PDF, DOCX, JPEG, PNG, WebP, TIFF, GIF and AVIF. Inputs go through private storage, malware scanning, bounded parsing, Gemini extraction, human review, approval and independently validated export.

The first official output is **XRechnung 3.0.2, UBL Invoice**. It currently handles standard positive invoices with positive VAT rates, cash or SEPA credit-transfer payment, and no discounts, prepayments, exemptions, reverse charge or credit notes. Required invoice details must be supplied and reviewed; the application does not invent them. The original document remains the source of truth. Other document types can be extracted and reviewed, but cannot be exported as invoices.

## Export research and future direction

There is no universal pair of “Finanzamt file formats.” XRechnung and ZUGFeRD are invoice formats. ZUGFeRD combines structured invoice data with a PDF/A-3 representation; implementing it requires validating both the XML and PDF container. It is the next recommended invoice export, but is not implemented here. See the [federal e-invoice FAQ](https://www.e-rechnung-bund.de/faq/xrechnung/).

Tax-return transmission is a separate integration. [ELSTER's developer documentation](https://www.elster.de/elsterweb/infoseite/entwickler) describes ERiC as a C library for plausibility checks and encrypted transmission, with developer registration and a manufacturer ID. The first integration must select an exact procedure and period (for example a VAT advance return); a generic document-to-XML transformation is insufficient. For [supporting-document submission](https://www.elster.de/elsterweb/helpGlobal?themaGlobal=help_belegnachreichung), ELSTER accepts document attachments through its specified workflow. Invoice exports are never labelled tax returns or submissions.

The architecture separates extraction data, approved revisions, format-specific mapping, official validation and future submission. A future submission adapter should reference an immutable approved revision, its validated artifact, the procedure/version, credentials, consent and eventual receipt. Payment/subscription code should update document entitlements, not rewrite extraction or validation.

## Local operation

From the project directory:

```sh
pnpm customer:migrate
pnpm documents:services
pnpm documents:worker
```

Run the website in another terminal with `pnpm dev`. Restart both the worker and website when changing environment settings.

Set `GEMINI_API_KEY` in ignored `.env.local`. Do not use a `NEXT_PUBLIC` variable. The model is configurable with `GEMINI_MODEL`, currently `gemini-3.8-flash` from the [stable Gemini model catalog](https://ai.google.dev/gemini-api/docs/models). `DOCUMENT_AI_ENABLED=true` enables requests only when a key is present. A live synthetic invoice extraction passed on 2026-09-13. This verifies connectivity and structured extraction, not accuracy across customer documents.

Local services:

- ClamAV on loopback port 3310. Its initial signature update can take time; a failed or unavailable scan prevents parsing/AI extraction.
- KoSIT on loopback port 8086. The container runs as an unprivileged user with a read-only filesystem. Health: `http://127.0.0.1:8086/server/health`.
- Private originals, normalized image previews and validated XML in `.private/documents`, outside `public` and ignored by Git. Files use random identifiers and restrictive permissions. Production requires a persistent private storage volume or an object-storage adapter shared by the application and worker.

The scanner and validator images are pinned; KoSIT artifacts are downloaded with SHA-256 verification. The validator is [KoSIT 1.6.3](https://github.com/itplr-kosit/validator/releases/tag/v1.6.3), with the [2026-08-31 XRechnung configuration](https://github.com/itplr-kosit/validator-configuration-xrechnung/releases/tag/v2026-08-31). Acceptance requires the expected XML report, its successful assessment, and its hash matching the generated invoice. Rejection or unavailable validation releases no export.

## Data and authorization

Migration 0004 adds documents, batches, review revisions, exports, audit events, per-company daily usage and entitlements in the customer schema. Migration 0005 adds persistent processing stages, extraction method and export generation state. Payload Admin remains separate.

Every request requires a verified customer session and current company membership. Mutation transactions recheck and lock membership. All queries use the server-selected company. Members can upload and save drafts. Owners, administrators and reviewers can approve and export. All members can access their company's scanned originals and current approved exports.

Saving any revision clears earlier approval. Approval requires all four review confirmations plus structural and arithmetic checks. Review revisions are immutable records. Exports are immutable, hashed and unique per document/revision/format; changing a review makes earlier exports unavailable from the download endpoint. Tax-ID and VAT-ID format checks do not verify registry existence or ownership.

Upload requests use an idempotency key and a payload fingerprint. Quota updates serialize per company in a transaction. Defaults are one file per upload and ten files per Europe/Berlin calendar day; the daily limit is an initial configurable development allowance, not an agreed commercial plan. `document_entitlements` can override the daily and batch limits server-side. Maximum batch size is five, maximum total request size is 20 MiB, and default per-file size is 10 MiB. Accepted files consume quota once; failed requests do not. Retrying extraction does not charge another upload. Concurrent requests cannot exceed the company quota.

The worker claims jobs using PostgreSQL row locks, processes one at a time, and runs each in a separate subprocess with a memory limit and 240-second timeout, allowing a bounded visual fallback. Stale leases fail after five minutes rather than automatically repeating a possibly billed AI request. The user can retry failed extraction up to three total attempts. Request bodies, PDF pages, image pixels, text length, ZIP entry count, expanded ZIP bytes, AI response size and validator responses are bounded.

## Extraction routing and file library

The implementation plan is local parsing → content-quality routing → structured extraction → deterministic checks → human review → official export validation. Existing PDF.js, Mammoth and Sharp adapters are retained. Duplicate parsers are not installed merely to claim faster processing.

- PDFs preserve text line breaks, column gaps and page markers. A conservative text path requires readable text on every page, no detected raster images and no wide column gaps. Other PDFs use native Gemini vision. Text-only output with missing required fields, inconsistent totals/line sums, low-confidence evidence or an unrecognized type gets at most one visual fallback. Network errors are not automatically retried by this routing layer.
- DOCX uses local Mammoth text extraction plus normalized embedded images when present. Raster inputs use normalized image content. All supported unstructured input routes still use Gemini to interpret fields; direct import of existing structured invoice XML remains a separate future adapter.
- Gemini receives a compact schema describing the required structure. The full strict Zod schema, including bounds and unknown-field rejection, validates the returned data locally. Nested provider grammar bounds caused a live HTTP 400; the compact schema passed the live test. A schema-valid answer is still subject to review and official export checks.
- No speed or accuracy improvement is claimed without a representative benchmark. Conservative routing can send even a text-rich PDF to vision when it includes a logo or complex columns.

The file library uses server-side filename search, status/type/date filtering and stable pagination (20 documents per page). Groups and date filters use Europe/Berlin calendar dates, with an inclusive end date. Queries and counts share a database snapshot and always restrict the company. There is no 100-file history cutoff in the UI. Originals and current approved exports have separate download actions. Original downloads become available after a successful scan, even if extraction later fails.

The six visible milestones are saved, safety check, extraction, review, approval and export. Worker stages survive navigation/refresh; the UI polls rather than inventing completion percentages. Export generation is claimed separately so other views can see it; concurrent generation and review are guarded, and abandoned generation becomes retryable after 60 seconds. Export files remain immutable and require successful KoSIT validation. Date grouping is the initial organization method; editable folders are not introduced in this change.

## Preview and deletion

File cards and review pages offer an authenticated preview dialog. PDFs render page-by-page on a bounded canvas using the bundled PDF.js worker; images use normalized previews. DOCX previews show extracted text and clearly identify their formatting limitation. The current approved XML is displayed as escaped text in a separate tab. Preview access uses the same company/session and clean-scan checks as downloads; uploaded HTML or Office markup is never injected into the application.

An uploader may delete their own document; company owners/admins may delete any document in their company. Mutation permissions are rechecked against current membership in the transaction. Confirmation explicitly covers the original, preview, extracted data, review history and **all** export revisions. Active extraction/export blocks deletion until finished; queued documents can be deleted. Worker preview writes recheck the lease while holding the document row lock, preventing an expired job from recreating deleted artifacts.

Migration 0006 adds a durable deletion-cleanup queue. The document and a manifest of every private artifact are removed/recorded in one database transaction; storage cleanup runs immediately and retries through the worker if necessary. Failed cleanup remains tracked, never reported as completed byte removal. Upload usage and batch idempotency records remain, so deletion does not reset quota or replay an earlier upload. The queue contains only storage IDs/types, with no source contents or names. Production backup retention is governed separately by the backup policy.

## Input and extraction limits

- PDF: up to 30 pages by default (maximum configurable 50), no encrypted/invalid documents, attached files or document-level scripts. Text is available for review; Gemini receives locally extracted text or the original PDF according to the routing above. Embedded e-invoices such as an existing ZUGFeRD PDF are currently rejected by the attachment restriction; dedicated extraction of their embedded XML is future work.
- Raster images: one frame/page and up to 40 million pixels; normalized to a PNG preview with a maximum 2400-pixel dimension. Animated GIFs and multipage TIFFs are rejected. SVG, BMP, HEIC and other unsupported formats are not advertised or silently converted.
- DOCX: bounded ZIP inspection, raw text extraction and up to eight supported raster images. Macros, embedded objects and oversized archives are rejected. Page numbers are unavailable; Word layout fidelity and legacy `.doc` support require a separately sandboxed office-rendering service.
- AI: structured JSON output, no tools or document-triggered URL fetching, explicit missing values, per-field source quotes/page references and confidence estimates. Evidence and confidence remain untrusted model output, not proof of correctness. Additional facts are retained for review; unmapped extra fields are not silently represented as official invoice fields.

## AI data handling

Documents are sent to Google only after a successful scan and when extraction is enabled. The interface explains this before upload. Requests use inline content, with no Files API uploads, explicitly created caches or agent tools; no provider credential reaches the browser. Provider-side implicit caching remains subject to Google's service behavior and terms. Review data stays in PostgreSQL. Application logs do not include document contents or provider responses.

Use synthetic or anonymized material during development. Before processing real customer tax documents, confirm the Google account's applicable terms, data-processing agreement, processing/retention requirements and customer-facing privacy disclosures. Google's [Gemini terms](https://ai.google.dev/gemini-api/terms) describe different treatment by service/account/region and do not guarantee EU-only processing for this API. A real-data production deployment needs that assessment; setting a key does not certify it.

## Validation and maintenance

```sh
pnpm test:documents
DOCUMENT_INTEGRATION=true pnpm test:documents
DOCUMENT_LIVE_GEMINI=true pnpm exec tsx --test tests/documents/gemini.live.test.ts
pnpm exec tsc --noEmit --incremental false
TAXFUL_BUILD_DIR=.next-check pnpm build
```

Integration tests use generated synthetic identities, companies and documents and remove only their own records/files. They exercise the real local scanner and KoSIT validator without calling Google. The Gemini adapter test intercepts its HTTP request and checks schema handling.

Before production: supervise worker processes, isolate parser workloads at the container/OS level, configure private persistent/object storage and encrypted backups, set retention/deletion policies with orphan-file reconciliation, protect/rate-limit incoming requests at the reverse proxy, assess AI privacy terms and run representative extraction accuracy tests with the configured model. The current worker process boundary limits time/memory but is not a complete OS sandbox. Validation proves schema/business-rule conformity, not the correctness of the source invoice or tax treatment.
