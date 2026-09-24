# Invoice workflows

The portal separates invoices issued by the workspace from documents received from suppliers. Payload Admin identities and collections are unchanged.

Files has separate Outgoing, Incoming and Unassigned upload views, selected through a bookmarkable `workflow` query parameter. Filters and pagination stay inside the selected direction; changing direction remounts the list to avoid showing results from the previous view during loading.

## Outgoing

1. Save company details under Profile. Owners/admins maintain Customers and Products & services.
2. Choose Create invoice. Select an optional saved customer and services, or enter their details in the review form. No upload, scanner, worker or Gemini call is required for manual creation.
3. A draft copies company/customer/product values into its own canonical record. Later directory changes never modify existing invoices. Draft creation consumes one document from the daily allowance.
4. An atomic company/year sequence reserves `TF-YYYY-000001`. Numbers survive draft deletion and are never reused. Reservation does not mean issued. Imported outgoing drafts retain their source number, checked for company-level uniqueness on approval.
5. Save partial drafts; complete required fields and confirmations to approve. Review edits invalidate approval until the first validated export.
6. Generate ZUGFeRD PDF/A with CII or XRechnung UBL through the existing independent validators. The first successful export locks the invoice as issued. Further formats use the same approved snapshot and must meet that format's additional requirements. Issued invoices cannot be edited or deleted through the portal.
7. Record sent or paid manually. These actions do not send messages, initiate payments or submit anything to a tax office.

Import an existing draft uses the existing security/extraction pipeline. Users must be authorized to issue the imported invoice.

## Incoming

Upload XRechnung XML, ZUGFeRD PDF, ordinary PDFs, images or DOCX to Incoming invoices. Signature checks and quarantine scanning run first. Structured invoices are parsed locally without Gemini; ordinary documents retain AI extraction. Users inspect/download the unchanged original and review the extracted summary. Incoming documents cannot enter outgoing approval/export.

XRechnung XML is checked by KoSIT; ZUGFeRD imports use Mustang PDF/XML validation. The report is bound to the original file and extracted XML hashes. Invalid structured invoices retain their validation report and cannot be marked reviewed. Passing technical validation does not certify authenticity or agreement between the visual PDF and XML.

Existing uploads remain `unclassified`. A current owner/admin/reviewer explicitly chooses the workflow. Previously generated artifacts remain available as historical downloads; their existence does not prove the supplier issued them.

Structured imports support types 380, 381, 384, 326 and 386 where permitted by the source profile, UTF-8 XML up to 1 MB, XRechnung UBL/CII and supported ZUGFeRD/Factur-X CII profiles. PDFs may contain exactly one recognized invoice XML attachment. Unsupported, malformed or ambiguous structured files never fall back to AI. The displayed canonical summary is bounded to 200 lines and does not reproduce every optional XML field; the complete original remains available. Recurring invoices, email delivery, payment collection and ELSTER submission remain future work.

The outgoing review form can select a saved customer. Owners/admins can explicitly opt to save entered customer details when approving. Approval and customer saving share one transaction; an identical active customer is reused, and existing directory entries are never overwritten. Selecting or editing a customer does not automatically save it.

## Invoice coverage

Choose Invoice, Credit note, Corrected invoice, Partial invoice, Advance-payment invoice or Final invoice at creation or during draft review. An issued invoice offers Create credit note / Create correction; issued partial and advance-payment invoices also offer Create final invoice. These reserve a new number, copy a snapshot and reference the source. They never modify or cancel the original automatically. Review the copied scope and amounts: a final invoice needs the full contract amount, not just the earlier instalment.

- Commercial credit notes use positive amounts and code 381. Buyer-issued self-billing (VAT “Gutschrift”) is not supported.
- Corrections use code 384 with the original invoice number/date and a reason. They are separately issued documents, not edits to an issued record.
- Partial invoices use 326; advance-payment invoices use 386 and require ZUGFeRD because the installed XRechnung rules reject 386. Final invoices use 380 with an explicit final-invoice note.
- Lines support VAT categories S (positive rate), Z (zero-rated), E (exempt) and AE (reverse charge). E requires the exemption basis; AE requires the reverse-charge statement and buyer VAT identifier. Tax treatment is a reviewed choice, never inferred merely to pass validation. Other categories and foreign sales tax are outside this export profile.
- Line and document discounts/allowances and charges have a net amount and reason. Optional percentage/base values must reproduce the amount. Document adjustments are split by VAT category/rate. Unit-price base quantity is supported. Decimal arithmetic computes each category's taxable base and VAT separately.
- The service date defaults to the invoice date when extraction finds no different date or period; manual drafts start with today's Berlin date for both. A different service date or complete service period remains available in a collapsed section and is never overwritten when present in the source.
- Credit notes, corrections and final invoices require earlier invoice references. A reason is requested only for credit notes and corrections; the other invoice types receive their correct structured type and visible heading without asking the user for a redundant reason.
- “Already paid” means actual received gross payments. It reduces the amount due, not the full invoice VAT. It appears only for final invoices (or existing payment data) and is calculated from the payment rows instead of being typed twice. Final invoices with received advances require payment date, prior invoice reference, net, VAT and gross per payment. Those values must reconcile with the calculated paid total. The generated PDF and invoice note disclose the deductions and balance; an explicitly referenced `payments.csv` schedule is embedded in the XML. Payments are entered and confirmed by the reviewer, never inferred from an issued or manually paid status.

Incoming structured documents map the supported types, adjustments, price bases, VAT categories, references and paid totals without AI. Type 380 alone cannot distinguish a final invoice; imports retain that type as Invoice and preserve its notes and original attachment. Technical validation is not tax advice or proof of authenticity.

## Storage and permissions

Migration `0011_invoice_workflows.sql` adds `invoice_customers`, `invoice_products`, `invoice_sequences`, `invoice_numbers` and `invoice_draft_requests` in `customer_auth`. Documents store workflow, source kind and issue/sent/paid state. Manual documents have no fabricated original file or scan result. Approved records/exports use the existing revision tables.

Migration `0012_structured_imports.sql` adds source validation reports, structured extraction methods and the saved customer reference.

The extended coverage fields live in the existing canonical JSONB records and immutable approval snapshots. They are optional for older records, so coverage adds no SQL migration or duplicate accounting tables.

Mutations verify same-origin requests, active company and current membership. Owners/admins manage directories; members prepare drafts; owners/admins/reviewers approve, export and update tracking. Directory updates use optimistic revisions. Draft creation is idempotent, quota checked and transactionally serialized per company. Directory entries are archived rather than deleted.

Run `pnpm customer:migrate` before deploying. Do not mix these migrations with Payload migrations.

## Verification

- `DOCUMENT_INTEGRATION=true pnpm exec tsx --test tests/documents/invoice-workflows.test.ts tests/documents/review-validation.test.ts`
- `DOCUMENT_INTEGRATION=true CHECK_IMPORT_ROUNDTRIP=true CHECK_PDF_TEXT=true pnpm exec tsx --test tests/documents/invoice-coverage.test.ts` (local validators and Poppler `pdftotext` required). Covers all six document kinds, exemptions, reverse charge, mixed rates and discounts, payment deductions, periods and price bases.
- `pnpm exec tsx tests/documents/invoice-workflows.smoke.ts` against an isolated build on port 3100 with `BETTER_AUTH_URL=http://localhost:3100`.
- `pnpm lint` and `TAXFUL_BUILD_DIR=.next-check pnpm build`.

Tests use disposable synthetic companies and do not send files to Gemini.
