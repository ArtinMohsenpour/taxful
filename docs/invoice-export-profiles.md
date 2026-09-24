# Invoice exports: decisions and verified boundaries

Coverage updated 23 September 2026.

## Product decision

One approved canonical invoice record feeds two adapters:

1. XRechnung 3.0.2 UBL XML, validated by KoSIT.
2. CII EN16931 XML, rendered into a matching PDF, embedded as `factur-x.xml`, and released as a ZUGFeRD PDF only after XML and PDF/A validation.

The two adapters share required-field and decimal validation. Their XML bytes are deliberately different: the existing UBL output cannot be embedded as ZUGFeRD CII. XRechnung itself supports CII as well as UBL, but preserving the established, independently tested UBL adapter avoids an unnecessary migration. Generic EN16931 CII does not automatically satisfy XRechnung's additional rules.

Do not attach XML to an arbitrary uploaded PDF and call it ZUGFeRD. The generated visual invoice comes from the approved CII so its contents agree with the embedded data. The original upload remains separately stored and downloadable. This is a conversion of reviewed source information, not proof that the supplier issued an authentic e-invoice.

## Invoice formats are not tax-return formats

The [BMF e-invoice FAQ](https://www.bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html) explains structured electronic invoices and recognizes XRechnung and qualifying ZUGFeRD profiles. This does not make either a universal format for submitting personal or company tax returns to the Finanzamt.

A Lohnsteuerbescheinigung contains income-tax information, not invoice line items. [ELSTER's prefilled-return information](https://www.portal.elster.de/elsterweb/infoseite/belegabruf_%28privatpersonen%29?locale=de_DE) covers employer-transmitted wage certificates. Future direct submission requires a named tax procedure, period, schema and authorization through the [ELSTER developer/ERiC integration](https://www.elster.de/elsterweb/infoseite/entwickler).

The classifier distinguishes invoices, receipts, wage certificates, tax notices, bank statements and other documents. Only high-confidence invoices proceed to field extraction. Uncertain and non-invoice documents show an explanation and original-file actions, without editable invoice fields. A receipt may have invoice characteristics, but the initial supported workflow conservatively excludes receipts; small-value and special tax cases require explicit support.

## Fields and conditional requirements

The supplied table was a useful starting point, but omitted the supply/service date and overstated some payment and buyer-identity requirements. [Section 14 UStG](https://www.gesetze-im-internet.de/ustg_1980/__14.html) is the primary reference for ordinary German invoice particulars; EN16931 and recipient profiles add semantic requirements. A unique invoice number can belong to one or more numbering series; the UI does not invent one or impose gapless numbering.

| Review group        | Current supported workflow                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Invoice             | Invoice number, issue date, supply/service date, currency                                                                 |
| Supplier            | Full legal name, postal address, VAT ID or Steuernummer; no personal IdNr.                                                |
| Buyer               | Full legal name and postal address; buyer VAT ID shown as conditional/optional                                            |
| Items               | Description, quantity, unit code, net unit price, line net amount, positive VAT rate                                      |
| Totals              | Net, VAT and gross totals; validator checks line sums and per-rate VAT breakdown                                          |
| Payment             | Payment method; terms or due date; IBAN only for SEPA credit transfer                                                     |
| XRechnung additions | Supplier contact name/phone/email, buyer email endpoint and buyer reference                                               |
| Public recipient    | Use the recipient-provided routing reference/Leitweg-ID where required; ordinary B2B buyer references are not Leitweg-IDs |

The [federal e-invoice FAQ](https://e-rechnung-bund.de/faq/) explains routing and recipient-specific requirements. A valid generic ZUGFeRD invoice is not a promise that every government receiving portal accepts it. Confirm the receiving entity's profile and channel.

The supported profile now includes commercial credit notes, corrections, partial/advance/final invoices, line/document discounts and charges, service periods, multiple VAT rates, zero-rating, exemptions and reverse charge. See [invoice workflows](invoice-workflows.md#invoice-coverage) for exact codes and conditions. XRechnung rejects advance-payment type 386 in the installed rules; that choice requires ZUGFeRD. Self-billing, foreign sales tax, unmodeled tax categories and all possible payment/endpoint codes are not covered. Never infer tax treatment to make validation pass.

For final invoices, [§14(5) UStG](https://www.gesetze-im-internet.de/ustg_1980/__14.html) and question 7b of the [BMF FAQ](https://www.bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html) inform the received-payment deduction schedule. Both adapters explicitly reference and embed `payments.csv`; the invoice note and PDF also show net/VAT/gross deductions and the remainder. This is a supported representation, not automated verification of the legal or accounting status of the payments.

## Generator and validator

The latest FeRD release verified for this work is [ZUGFeRD 2.5.2 / Factur-X 1.09.2](https://www.ferd-net.de/en/downloads/publications/details/zugferd-252-english), effective 1 September 2026. This uses CII D22B, backward compatible with D16B. The release includes profile-specific validation resources; its EN16931 change renames a rule without changing that rule's function.

The isolated service pins [Mustangproject 2.26.0](https://github.com/ZUGFeRD/mustangproject/releases/tag/core-2.26.0), the latest stable release verified during this work, and verifies the release JAR SHA-256 at build time. It uses the release's bundled EN16931/CII rules and veraPDF, not an invented home-grown PDF conformance check. Validator identity and full report are stored with each immutable export. Revalidate representative fixtures before upgrading the engine or claiming support for newer profile-specific features.

The build overrides only the bundled German display label for BT-10 to “Käuferreferenz”; the government-oriented default “Leitweg-ID” would mislabel ordinary B2B references. Validation resources and user data are unchanged by this presentation override.

Generation steps:

1. Validate generated CII; stop on rejection.
2. Render the approved CII using the compact Taxful stylesheet and embedded fonts. Document headings, references, adjustments, tax reasons and payment deductions must agree with the XML. Invoice-wide adjustments must never be assigned to an individual line's displayed VAT.
3. Embed that exact CII with EN16931 profile metadata into PDF/A-3.
4. Independently validate the PDF container and require extracted XML to equal the input.
5. Validate the combined file; return bytes only on success, with input/output SHA-256 hashes.
6. The application verifies hashes and result shape, then stores the artifact under the current approved revision and format.

The service receives generated XML only, has no customer database credentials, and binds to loopback in development. It limits input, parallel generation, memory and request duration. PDF/XML reports stay private. XML escaping and rejection of DTD/entity declarations prevent user strings from becoming executable markup. Deployment still needs authenticated private service networking when services run on separate hosts.

Validation establishes profile and arithmetic conformity, not invoice authenticity, registry ownership, correct tax treatment or successful transmission. No file is submitted to ELSTER by this feature.

## Review and company defaults

Owners and admins maintain workspace invoice details under Profile → Company invoice details. Other members can read them. Updates enforce current membership, organization identity and optimistic revisions. Migration `0009_company_invoice_profile.sql` stores these separately from personal profiles and Payload users.

Review displays all saved company details. Automatic prefill requires an unambiguous, exact tax-identifier match; reviewers can explicitly select supplier or buyer. Prefill only fills empty fields, never replaces extracted values, and does not modify approved snapshots. Blank currency/country fields default to EUR/DE with a visible instruction to verify the assumption. Explicit USD/US values remain intact.

Approval highlights missing or invalid fields and links directly to them. Decimal calculations compare line amounts, grouped tax and gross totals before approval. Unit choices use named common codes; server validation checks the 2,162 codes from Mustangproject 2.26.0's bundled `xslt/ZF_250/FACTUR-X_EN16931_codedb.xml`, code list 8 (stored in `src/lib/documents/unit-codes.json`). Refresh this list alongside the validator and rerun fixtures when upgrading.

Payment fields describe the source invoice, not the customer's Taxful subscription. For an amount due above zero, [BR-CO-25](https://docs.peppol.eu/poacc/billing/3.0/rules/ubl-tc434/BR-CO-25/) requires payment terms or a due date. The current positive-invoice profile supports cash and SEPA transfer; SEPA requires a valid IBAN. Foreign sales tax must not be relabeled as German VAT, and currency defaults never perform currency conversion.

Migration `0010_export_issues.sql` preserves actionable export failures across reloads. Native fatal errors retain rule identifiers and field links where available; nonfatal notices are excluded. Official validation remains mandatory even when local checks pass.

## Verification

Synthetic fixtures cover profile-specific required fields, wage-certificate/uncertain-document gating, XML escaping, malformed arithmetic rejection, valid PDF/A with matching embedded CII, cross-company access, approval roles, per-format idempotency, revision invalidation, preview/download and deletion of both exports. Live Gemini checks use synthetic invoice and unrelated recipe text only. UI checks cover both languages and mobile layout.
