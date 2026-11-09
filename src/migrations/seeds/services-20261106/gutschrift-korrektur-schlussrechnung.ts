import { sources } from './sources'
import type { ServiceSeed } from './types'

export const gutschriftKorrekturSchlussrechnung: ServiceSeed = {
  slug: 'gutschrift-korrektur-schlussrechnung',
  sortOrder: 50,
  icon: 'files',
  de: {
    title: 'Gutschrift, Rechnungskorrektur und Schlussrechnung als E-Rechnung',
    summary:
      'Erstellen Sie kaufmännische Gutschriften, Rechnungskorrekturen, Teil-, Anzahlungs- und Schlussrechnungen als E-Rechnung – mit Bezug auf die ursprüngliche Rechnung, ohne das Original zu verändern.',
    keyPoints: [
      'Gutschrift (381) und Rechnungskorrektur (384)',
      'Teil-, Anzahlungs- und Schlussrechnungen',
      'Abzug erhaltener Zahlungen mit Steuerausweis',
      'Originalrechnung bleibt unverändert',
    ],
    seo: {
      title: 'E-Rechnung Gutschrift & Korrekturrechnung | Taxful',
      description:
        'Gutschrift, Korrekturrechnung, Teil- und Schlussrechnung als XRechnung oder ZUGFeRD erstellen – mit Bezug zur Originalrechnung und geprüftem Export.',
    },
    sections: [
      {
        title: 'Auch Korrekturen gehören ins E-Rechnungsformat',
        columns: [
          [
            `Im Rechnungsalltag bleibt es selten bei einer einzigen Rechnung. Ware wird zurückgegeben, ein Preis nachträglich gemindert, eine Angabe war falsch, oder ein Projekt wird in Teilen abgerechnet. Wer E-Rechnungen ausstellt, braucht für diese Fälle passende Dokumente im selben strukturierten Format – sonst endet die automatische Verarbeitung beim Empfänger an der ersten Korrektur.

Für E-Rechnungen gilt: Eine ausgestellte Rechnung wird nicht überschrieben. Stattdessen entsteht ein neues Dokument mit eigener Nummer, das auf die ursprüngliche Rechnung verweist. Welche Art von Dokument das ist, legt die **Rechnungsart** fest, ein Code im strukturierten Teil der E-Rechnung. Das Empfängersystem erkennt daran, ob es sich um eine Gutschrift, eine Korrektur oder eine Schlussrechnung handelt.

Taxful bildet diese Abläufe direkt an der ausgestellten Rechnung ab. Aus einer Rechnung erstellen Sie mit einem Klick eine Gutschrift oder eine Korrektur. Aus Teil- und Anzahlungsrechnungen erstellen Sie die Schlussrechnung. Die Originalrechnung bleibt dabei unverändert.`,
          ],
        ],
      },
      {
        layout: 'twoColumns',
        title: 'Welche Rechnungsarten Taxful unterstützt',
        columns: [
          [
            `### Gutschrift und Korrektur

- **Kaufmännische Gutschrift (381):** zum Beispiel für Rücksendungen oder Preisnachlässe, mit positiven Beträgen und Verweis auf die Ursprungsrechnung
- **Rechnungskorrektur (384):** mit Nummer und Datum der ursprünglichen Rechnung und dem Grund der Korrektur – ein eigenständiges Dokument statt einer Änderung der ausgestellten Rechnung`,
          ],
          [
            `### Teil-, Anzahlungs- und Schlussrechnung

- **Teilrechnung (326):** für gesondert vereinbarte und bereits abgeschlossene Teilleistungen
- **Anzahlungsrechnung (386):** für Zahlungen vor der Leistung; in Taxful nur als ZUGFeRD, weil die XRechnung-Regeln diese Rechnungsart ablehnen
- **Schlussrechnung (380):** über die gesamte Leistung mit ausdrücklichem Hinweis und Abzug der bereits erhaltenen Zahlungen`,
          ],
        ],
      },
      {
        title: 'So erstellen Sie eine Korrektur oder Schlussrechnung',
        tone: 'surface',
        columns: [
          [
            `1. **Ausgestellte Rechnung öffnen.** Wählen Sie in der Dateiübersicht die Rechnung, auf die sich das neue Dokument bezieht.
2. **Dokumentart wählen.** Wählen Sie „Gutschrift erstellen“ oder „Korrektur erstellen“. Bei ausgestellten Teil- und Anzahlungsrechnungen steht zusätzlich „Schlussrechnung erstellen“ zur Verfügung.
3. **Neue Nummer und Bezug.** Taxful reserviert eine neue Rechnungsnummer, übernimmt eine Kopie der Angaben und verweist auf die Ursprungsrechnung.
4. **Umfang und Beträge prüfen.** Passen Sie Positionen und Beträge an. Für eine Schlussrechnung tragen Sie den vollständigen Auftragswert ein und erfassen die bereits erhaltenen Zahlungen.
5. **Freigeben und exportieren.** Nach der Freigabe erzeugen Sie die XRechnung oder ZUGFeRD-Datei; beide werden vor dem Download validiert.`,
          ],
        ],
      },
      {
        title: 'Schlussrechnung mit korrektem Abzug der Zahlungen',
        columns: [
          [
            `In einer Schlussrechnung müssen die vor der Leistung vereinnahmten Zahlungen und die darauf entfallenden Steuerbeträge abgezogen werden ([§ 14 Abs. 5 UStG](${sources.ustg14})). Es reicht also nicht, nur den Zahlbetrag zu verringern.

Taxful weist jede erhaltene Zahlung mit Netto-, Steuer- und Bruttobetrag aus und berechnet den verbleibenden Betrag. Die Abzüge erscheinen sowohl in der sichtbaren Rechnung als auch in den strukturierten Daten der E-Rechnung. Ob die erfassten Zahlungen buchhalterisch vollständig sind, prüfen Sie selbst – Taxful gleicht keine Kontoauszüge ab.`,
          ],
        ],
      },
      {
        title: 'Gutschrift ist nicht gleich Gutschrift',
        tone: 'accent',
        columns: [
          [
            `Im Alltag meint „Gutschrift“ meist eine **kaufmännische Gutschrift**: Sie als Lieferant schreiben Ihrem Kunden einen Betrag gut, etwa nach einer Reklamation. Diese Gutschrift unterstützt Taxful.

Umsatzsteuerlich bezeichnet „Gutschrift“ dagegen das **Gutschriftsverfahren**: Der Leistungsempfänger stellt die Rechnung über eine Leistung aus, die er erhalten hat ([§ 14 Abs. 2 UStG](${sources.ustg14})). Dieses Verfahren unterstützt Taxful nicht. Ebenso wenig storniert oder ändert Taxful eine Ursprungsrechnung automatisch, und es unterstützt nur die Steuerkategorien positiver Steuersatz, Nullsatz, steuerfrei und Reverse Charge. Taxful ersetzt keine Steuerberatung.`,
          ],
        ],
      },
      {
        title: 'Rechtlicher Hintergrund',
        tone: 'surface',
        columns: [
          [
            `Die E-Rechnungspflicht kennt nach Auffassung des Bundesfinanzministeriums keine Sonderregeln für Gutschriften im Gutschriftsverfahren: Auch sie sind ab den jeweiligen Stichtagen als E-Rechnung auszustellen. Für Schlussrechnungen gilt der Abzug der vereinnahmten Teilentgelte und Steuerbeträge nach § 14 Abs. 5 UStG. Ob eine kaufmännische Gutschrift oder Korrektur umsatzsteuerlich als Rechnung gilt, hängt vom Einzelfall ab.

Quellen: [§ 14 UStG](${sources.ustg14}), [§ 27 Abs. 38 UStG](${sources.ustg27}) und die [Fragen und Antworten des Bundesfinanzministeriums](${sources.bmfFaq}). Stand: November 2026.`,
          ],
        ],
      },
      {
        title: 'Beispiel: Schlussrechnung nach zwei Anzahlungen',
        columns: [
          [
            `Ein vereinfachtes Beispiel zeigt, wie der Abzug funktioniert. Ein Auftrag über 10.000 Euro netto zuzüglich 19 % Umsatzsteuer wurde mit zwei Anzahlungsrechnungen teilweise vorab abgerechnet und bezahlt: 2.000 Euro netto mit 380 Euro Umsatzsteuer und 3.000 Euro netto mit 570 Euro Umsatzsteuer.

- **Gesamte Leistung:** 10.000,00 Euro netto, 1.900,00 Euro Umsatzsteuer, 11.900,00 Euro brutto
- **Abzüglich erhaltener Anzahlungen:** 5.000,00 Euro netto, 950,00 Euro Umsatzsteuer, 5.950,00 Euro brutto
- **Verbleibende Zahlung:** 5.000,00 Euro netto, 950,00 Euro Umsatzsteuer, 5.950,00 Euro brutto

Die Schlussrechnung weist also die gesamte Leistung mit der gesamten Umsatzsteuer aus und zieht die bereits gezahlten Beträge einschließlich der darauf entfallenden Steuer ab. Würde sie nur den Restbetrag nennen, fehlte die vollständige Abrechnung der Leistung. Prüfen Sie vor der Freigabe, dass alle Anzahlungen mit Datum und Betrag erfasst sind.`,
          ],
        ],
      },
      {
        title: 'Häufige Fragen zu Gutschriften und Korrekturen',
        columns: [
          [
            {
              faq: [
                {
                  question: 'Muss eine Gutschrift als E-Rechnung ausgestellt werden?',
                  answer:
                    'Eine Gutschrift im Gutschriftsverfahren ist eine Rechnung und unterliegt damit der E-Rechnungspflicht. Kaufmännische Gutschriften erwarten viele Empfänger ebenfalls im strukturierten Format. Zweifelsfälle klären Sie mit Ihrer Steuerberatung.',
                },
                {
                  question: 'Was ist der Unterschied zwischen Gutschrift und Rechnungskorrektur?',
                  answer:
                    'Eine kaufmännische Gutschrift (381) schreibt dem Kunden einen Betrag gut. Eine Rechnungskorrektur (384) berichtigt Angaben einer bestimmten Rechnung und nennt deren Nummer, Datum und den Grund der Korrektur.',
                },
                {
                  question: 'Wie storniere ich eine E-Rechnung?',
                  answer:
                    'Eine ausgestellte E-Rechnung wird nicht gelöscht oder überschrieben. Erstellen Sie je nach Fall eine Rechnungskorrektur mit Verweis auf das Original oder eine Gutschrift über den betroffenen Betrag.',
                },
                {
                  question: 'Kann ich eine Abschlagsrechnung als XRechnung erstellen?',
                  answer:
                    'Das hängt davon ab, worüber Sie abrechnen. Gesondert vereinbarte, bereits abgeschlossene Teilleistungen rechnen Sie als Teilrechnung (326) ab, auch als XRechnung. Anzahlungsrechnungen (386) sind in Taxful nur als ZUGFeRD möglich. Ob ein Abschlag umsatzsteuerlich eine Teilleistung oder eine Anzahlung ist, hängt von Ihrer Vereinbarung ab – klären Sie das mit Ihrer Steuerberatung.',
                },
                {
                  question: 'Was muss in einer Schlussrechnung stehen?',
                  answer:
                    'Der gesamte Leistungsumfang mit Hinweis auf die Schlussrechnung sowie die bereits erhaltenen Zahlungen mit den darauf entfallenden Steuerbeträgen, die abgezogen werden.',
                },
                {
                  question: 'Unterstützt Taxful das Gutschriftsverfahren?',
                  answer:
                    'Nein. Taxful unterstützt kaufmännische Gutschriften des Lieferanten, aber keine Rechnungen, die der Leistungsempfänger im Gutschriftsverfahren ausstellt.',
                },
                {
                  question: 'Braucht eine Rechnungskorrektur eine neue Rechnungsnummer?',
                  answer:
                    'In Taxful erhält jede Korrektur und jede Gutschrift eine eigene, neue Nummer und verweist auf Nummer und Datum der ursprünglichen Rechnung. Die Ursprungsrechnung behält ihre Nummer und bleibt unverändert.',
                },
              ],
            },
          ],
        ],
      },
      {
        title: 'Passende Leistungen',
        columns: [
          [
            {
              services: [
                'e-rechnung-erstellen',
                'e-rechnung-pruefen',
                'rechnungen-digital-verwalten',
              ],
            },
          ],
        ],
      },
      {
        title: 'Korrekturen sauber abbilden',
        tone: 'surface',
        columns: [
          [
            'Erstellen Sie Gutschriften, Korrekturen und Schlussrechnungen direkt aus Ihren ausgestellten Rechnungen. [Kostenlos starten](/signup) oder [Tarife vergleichen](/pricing).',
          ],
        ],
      },
    ],
  },
  en: {
    title: 'Credit notes, corrections and final invoices as e-invoices',
    summary:
      'Create credit notes, corrected invoices, partial, prepayment and final invoices as e-invoices – linked to the original invoice, which always stays unchanged.',
    keyPoints: [
      'Credit note (381) and correction (384)',
      'Partial, prepayment and final invoices',
      'Payments deducted with VAT shown',
      'Original invoice stays unchanged',
    ],
    seo: {
      title: 'E-invoice credit notes & corrections | Taxful',
      description:
        'Create credit notes, corrected invoices, partial and final invoices as XRechnung or ZUGFeRD – linked to the original invoice and validated before export.',
    },
    sections: [
      {
        title: 'Corrections need the e-invoice format too',
        columns: [
          [
            `Invoicing rarely ends with one invoice. Goods come back, prices are reduced, a detail was wrong, or a project is billed in stages. If you issue e-invoices, these follow-up documents need the same structured format; otherwise automated processing at your customer stops at the first correction.

An issued e-invoice is never overwritten. Instead, a new document with its own number refers to the original. Its **invoice type code** tells the recipient's system whether it is a credit note, a correction or a final invoice.

Taxful builds these workflows into the issued invoice: create a credit note or a correction in one click, or a final invoice from partial and prepayment invoices. The original stays untouched.`,
          ],
        ],
      },
      {
        layout: 'twoColumns',
        title: 'Supported document types',
        columns: [
          [
            `### Credit notes and corrections

- **Commercial credit note (381):** for returns or price reductions, with positive amounts and a reference to the original
- **Corrected invoice (384):** quotes the original number, date and the reason – a separate document, not an edit`,
          ],
          [
            `### Partial, prepayment and final invoices

- **Partial invoice (326):** for separately agreed parts of a supply that are already completed
- **Prepayment invoice (386):** for payments before delivery; ZUGFeRD only, because the XRechnung rules reject this type
- **Final invoice (380):** for the full scope, with an explicit note and the payments already received deducted`,
          ],
        ],
      },
      {
        title: 'How it works',
        tone: 'surface',
        columns: [
          [
            `1. **Open the issued invoice** the new document relates to.
2. **Choose the document type:** create a credit note or a correction; for issued partial and prepayment invoices, also create the final invoice.
3. **New number and reference:** Taxful reserves a new number, copies the details and links the original.
4. **Review scope and amounts.** For a final invoice, enter the full contract value and the payments received.
5. **Approve and export** XRechnung or ZUGFeRD; both are validated before download.`,
          ],
        ],
      },
      {
        title: 'Final invoices with correct payment deductions',
        columns: [
          [
            `German VAT law requires a final invoice to deduct the payments received before delivery and the VAT they contained ([Section 14(5) UStG](${sources.ustg14})); reducing the amount due is not enough. Taxful shows each payment with net, VAT and gross amounts, calculates the remainder, and includes the deductions in both the visible invoice and the structured data. Whether the recorded payments are complete is for you to confirm – Taxful does not reconcile bank statements.`,
          ],
        ],
      },
      {
        title: 'Not every "Gutschrift" is the same',
        tone: 'accent',
        columns: [
          [
            `In everyday German, "Gutschrift" usually means a **commercial credit note** issued by the supplier – Taxful supports this. In VAT law it also means **self-billing**, where the customer issues the invoice for a supply received. Taxful does not support self-billing, does not cancel or edit an original automatically, and covers the positive-rate, zero-rated, exempt and reverse-charge VAT categories only. Taxful is not tax advice.`,
          ],
        ],
      },
      {
        title: 'Legal background',
        tone: 'surface',
        columns: [
          [
            `According to the German Federal Ministry of Finance, the e-invoicing obligation has no special rules for self-billed invoices: they must also be e-invoices from the relevant dates. Final invoices must deduct prepayments and their VAT under Section 14(5) UStG. Whether a commercial credit note or correction counts as an invoice for VAT purposes depends on the case.

Sources: [Section 14 UStG](${sources.ustg14}) and the [German Federal Ministry of Finance FAQ](${sources.bmfFaq}). As of November 2026.`,
          ],
        ],
      },
      {
        title: 'Example: final invoice after two prepayments',
        columns: [
          [
            `A contract worth EUR 10,000 net plus 19% VAT was partly billed and paid in advance with two prepayment invoices: EUR 2,000 net with EUR 380 VAT and EUR 3,000 net with EUR 570 VAT.

- **Full supply:** EUR 10,000.00 net, EUR 1,900.00 VAT, EUR 11,900.00 gross
- **Less prepayments received:** EUR 5,000.00 net, EUR 950.00 VAT, EUR 5,950.00 gross
- **Remaining amount:** EUR 5,000.00 net, EUR 950.00 VAT, EUR 5,950.00 gross

The final invoice shows the full supply with all VAT and deducts the amounts already paid, including their VAT. Before approving, check that every prepayment is recorded with its date and amount.`,
          ],
        ],
      },
      {
        title: 'Frequently asked questions',
        columns: [
          [
            {
              faq: [
                {
                  question: 'Does a credit note have to be an e-invoice?',
                  answer:
                    'A self-billed invoice is an invoice and falls under the e-invoicing obligation. Many recipients also expect commercial credit notes in a structured format. Ask your tax adviser about edge cases.',
                },
                {
                  question: 'What is the difference between a credit note and a corrected invoice?',
                  answer:
                    'A commercial credit note (381) credits an amount to the customer. A corrected invoice (384) fixes details of a specific invoice and states its number, date and the reason.',
                },
                {
                  question: 'How do I cancel an e-invoice?',
                  answer:
                    'An issued e-invoice is never deleted or overwritten. Create a correction that references the original or a credit note for the affected amount.',
                },
                {
                  question: 'Can I issue a prepayment invoice as XRechnung?',
                  answer:
                    'Prepayment invoices (386) are available as ZUGFeRD only in Taxful. Separately agreed, completed parts of a supply can be billed as partial invoices (326) in both formats. Whether an instalment is a partial supply or a prepayment for VAT purposes depends on your agreement – ask your tax adviser.',
                },
                {
                  question: 'Does Taxful support self-billing?',
                  answer:
                    'No. Taxful supports commercial credit notes issued by the supplier, not invoices issued by the customer under self-billing.',
                },
                {
                  question: 'Does a corrected invoice need a new number?',
                  answer:
                    'In Taxful, every correction and credit note gets its own new number and refers to the number and date of the original invoice, which keeps its number and stays unchanged.',
                },
              ],
            },
          ],
        ],
      },
      {
        title: 'Related services',
        columns: [
          [
            {
              services: [
                'e-rechnung-erstellen',
                'e-rechnung-pruefen',
                'rechnungen-digital-verwalten',
              ],
            },
          ],
        ],
      },
      {
        title: 'Handle corrections cleanly',
        tone: 'surface',
        columns: [
          [
            'Create credit notes, corrections and final invoices straight from your issued invoices. [Start for free](/signup) or [compare plans](/pricing).',
          ],
        ],
      },
    ],
  },
}
