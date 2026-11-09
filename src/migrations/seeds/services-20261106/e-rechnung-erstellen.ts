import { sources } from './sources'
import type { ServiceSeed } from './types'

export const eRechnungErstellen: ServiceSeed = {
  slug: 'e-rechnung-erstellen',
  sortOrder: 10,
  icon: 'outgoing-invoices',
  de: {
    title: 'E-Rechnung erstellen: XRechnung und ZUGFeRD in wenigen Schritten',
    summary:
      'Mit Taxful erstellen Sie E-Rechnungen als XRechnung oder ZUGFeRD – mit gespeicherten Kunden und Leistungen, automatischer Prüfung und einer validierten Datei für Ihre Kunden.',
    keyPoints: [
      'XRechnung 3.0.2 und ZUGFeRD EN16931',
      'Pflichtangaben vor dem Export geprüft',
      'Fortlaufende Rechnungsnummern pro Jahr',
      'Kostenlos starten, später upgraden',
    ],
    seo: {
      title: 'E-Rechnung erstellen: XRechnung & ZUGFeRD | Taxful',
      description:
        'E-Rechnung erstellen als XRechnung oder ZUGFeRD: Angaben erfassen, automatisch prüfen und die validierte Datei herunterladen. Kostenlos starten mit Taxful.',
    },
    sections: [
      {
        title: 'Was ist eine E-Rechnung?',
        columns: [
          [
            `Eine E-Rechnung ist eine Rechnung in einem strukturierten elektronischen Format, das Software ohne Abtippen auslesen kann. Gemeint sind Formate nach der europäischen Norm EN 16931 – in Deutschland vor allem die **XRechnung** und **ZUGFeRD** ab Version 2.0.1, mit Ausnahme der Profile MINIMUM und BASIC-WL. Eine einfache PDF-Datei, ein Foto oder ein Word-Dokument ist dagegen keine E-Rechnung im Sinne des Umsatzsteuergesetzes, auch wenn sie per E-Mail verschickt wird.

Für Unternehmen heißt das: Wer Leistungen an andere Unternehmen in Deutschland abrechnet, braucht eine Lösung, um E-Rechnungen zu erstellen. Empfangen müssen alle inländischen Unternehmen E-Rechnungen bereits seit dem 1. Januar 2025. Für das Ausstellen gelten Übergangsfristen bis Ende 2026 beziehungsweise Ende 2027. Danach ist die E-Rechnung im Geschäftsverkehr zwischen Unternehmen der Normalfall.

Taxful ist eine Software, mit der Sie E-Rechnungen ohne eigene IT-Infrastruktur erstellen. Sie erfassen die Angaben in einem geführten Formular, Taxful prüft sie und erzeugt eine validierte XRechnung oder ZUGFeRD-Datei. Die Datei laden Sie herunter und senden sie wie gewohnt an Ihren Kunden.`,
          ],
        ],
      },
      {
        title: 'So erstellen Sie eine E-Rechnung mit Taxful',
        tone: 'surface',
        columns: [
          [
            `1. **Unternehmensprofil anlegen.** Name, Anschrift, Steuernummer oder USt-IdNr., Bankverbindung und Kontaktdaten hinterlegen Sie einmal. Taxful übernimmt sie in jede neue Rechnung.
2. **Kunden und Leistungen wählen.** Wählen Sie gespeicherte Kunden, Produkte und Leistungen aus oder geben Sie die Angaben direkt ein. Jede Rechnung speichert eine eigene Kopie. Spätere Änderungen im Kundenverzeichnis verändern bestehende Rechnungen nicht.
3. **Angaben prüfen.** Das Formular zeigt fehlende Pflichtangaben an, berechnet Netto, Umsatzsteuer und Brutto mit exakter Dezimalrechnung und prüft die Einheiten-Codes. Entwürfe speichern Sie jederzeit.
4. **Freigeben und Format wählen.** Inhaber, Administratoren und Prüfer Ihres Unternehmens geben die Rechnung nach bestätigter Zwei-Faktor-Anmeldung frei. Anschließend wählen Sie XRechnung (UBL) oder ZUGFeRD (PDF/A-3 mit eingebettetem XML).
5. **Validieren und herunterladen.** Jede Datei wird vor der Ausgabe mit unabhängigen Prüfwerkzeugen validiert. Erst eine gültige Datei steht zum Download bereit.`,
          ],
        ],
      },
      {
        layout: 'threeColumns',
        title: 'Funktionen für den Rechnungsalltag',
        columns: [
          [
            `### Fortlaufende Rechnungsnummern

Taxful vergibt pro Unternehmen und Jahr fortlaufende Nummern im Format TF-JJJJ-000001. Eine vergebene Nummer wird nie erneut verwendet – auch dann nicht, wenn ein Entwurf gelöscht wird.

### Gespeicherte Kunden und Leistungen

Kundendaten, Produkte und Leistungen pflegen Inhaber und Administratoren zentral. Alle Mitglieder können sie in neuen Rechnungen auswählen.`,
          ],
          [
            `### Steuersätze und Sonderfälle

Positionen unterstützen Umsatzsteuer mit positivem Steuersatz wie 19 % oder 7 %, den Nullsatz, steuerfreie Umsätze mit Befreiungsgrund und das Reverse-Charge-Verfahren mit Hinweis und USt-IdNr. des Empfängers.

### Rabatte, Zuschläge und Zeiträume

Nachlässe und Zuschläge auf Positions- oder Rechnungsebene sowie abweichende Leistungsdaten und Leistungszeiträume werden in das Zielformat übernommen.`,
          ],
          [
            `### Festgeschrieben nach Ausstellung

Mit dem ersten erfolgreichen Export gilt eine Rechnung als ausgestellt. Sie lässt sich danach nicht mehr bearbeiten oder löschen; Änderungen erfolgen über eine Korrektur oder Gutschrift.

### Status im Blick

Markieren Sie Rechnungen als versendet oder bezahlt und behalten Sie offene Vorgänge in der Dateiübersicht im Blick.`,
          ],
        ],
      },
      {
        layout: 'twoColumns',
        title: 'XRechnung oder ZUGFeRD?',
        subtitle:
          'Beide Formate entsprechen der EN 16931. Welches Format Sie verwenden, vereinbaren Sie mit Ihrem Kunden.',
        columns: [
          [
            `### XRechnung

- Reine XML-Datei ohne eigene Sichtdarstellung
- Standard für Rechnungen an öffentliche Auftraggeber in Deutschland
- Behörden verlangen oft eine Leitweg-ID als Käuferreferenz, die sie Ihnen mitteilen
- In Taxful: XRechnung 3.0.2 im UBL-Format, geprüft mit dem Validator der KoSIT`,
          ],
          [
            `### ZUGFeRD

- PDF/A-3-Datei mit eingebettetem XML: für Menschen lesbar, für Software auswertbar
- Verbreitet im Geschäftsverkehr zwischen Unternehmen
- Für die Umsatzsteuer maßgeblich sind die Daten im XML-Teil
- In Taxful: Profil EN16931 mit CII-XML, geprüft als XML und als PDF/A`,
          ],
        ],
      },
      {
        title: 'Was Taxful nicht übernimmt',
        tone: 'accent',
        columns: [
          [
            `Taxful ist eine Software zum Erstellen und Prüfen von E-Rechnungen und ersetzt keine Steuerberatung. Welche Steuersätze, Befreiungen und Hinweise für Ihre Umsätze gelten, entscheiden Sie – Taxful leitet die steuerliche Behandlung nicht automatisch ab.

Rechnungen werden derzeit nicht direkt aus Taxful an Ihre Kunden zugestellt und nicht an das Finanzamt oder über ELSTER übermittelt. Eine direkte Anbindung an Buchhaltungsprogramme wie DATEV oder Lexware besteht nicht; Dateien tauschen Sie per Upload und Download aus. Das umsatzsteuerliche Gutschriftsverfahren, bei dem der Leistungsempfänger die Rechnung ausstellt, wird nicht unterstützt.`,
          ],
        ],
      },
      {
        title: 'Rechtlicher Rahmen der E-Rechnungspflicht',
        tone: 'surface',
        columns: [
          [
            `- **Seit 1. Januar 2025:** Alle Unternehmen in Deutschland müssen E-Rechnungen empfangen können.
- **Bis 31. Dezember 2026:** Für Umsätze aus 2025 und 2026 sind Papierrechnungen und – mit Zustimmung des Empfängers – andere elektronische Formate wie PDF noch zulässig.
- **Ab 1. Januar 2027:** Wer im Vorjahr mehr als 800.000 Euro Gesamtumsatz hatte, muss E-Rechnungen ausstellen. Bei geringerem Vorjahresumsatz sind Papier- und PDF-Rechnungen für Umsätze aus 2027 noch bis Ende 2027 möglich.
- **Ab 1. Januar 2028:** Die Pflicht gilt für alle Rechnungen zwischen inländischen Unternehmen.

Ausgenommen sind unter anderem Kleinbetragsrechnungen bis 250 Euro brutto und Fahrausweise. Kleinunternehmer dürfen weiterhin sonstige Rechnungen ausstellen. Quellen: [§ 27 Abs. 38 UStG](${sources.ustg27}), [§ 33 UStDV](${sources.ustdv33}), [§ 34 UStDV](${sources.ustdv34}), [§ 34a UStDV](${sources.ustdv34a}) und die [Fragen und Antworten des Bundesfinanzministeriums](${sources.bmfFaq}).

Stand: November 2026. Bitte klären Sie Ihre konkrete Situation mit Ihrer Steuerberatung.`,
          ],
        ],
      },
      {
        title: 'Häufige Fragen zum Erstellen von E-Rechnungen',
        columns: [
          [
            {
              faq: [
                {
                  question: 'Was ist der Unterschied zwischen XRechnung und ZUGFeRD?',
                  answer:
                    'Die XRechnung ist eine reine XML-Datei. ZUGFeRD kombiniert ein lesbares PDF mit eingebetteten XML-Daten. Beide entsprechen der EN 16931. Im Geschäftsverkehr ist ZUGFeRD verbreitet, öffentliche Auftraggeber verlangen meist die XRechnung.',
                },
                {
                  question: 'Ab wann muss ich E-Rechnungen ausstellen?',
                  answer:
                    'Für Umsätze ab dem 1. Januar 2027, wenn Ihr Gesamtumsatz im Vorjahr über 800.000 Euro lag, sonst spätestens ab dem 1. Januar 2028. Empfangen müssen Sie E-Rechnungen bereits seit dem 1. Januar 2025.',
                },
                {
                  question: 'Ist eine PDF-Rechnung eine E-Rechnung?',
                  answer:
                    'Nein. Eine PDF ohne eingebettete strukturierte Daten gilt als sonstige Rechnung. Eine ZUGFeRD-Datei ist zwar ebenfalls eine PDF, enthält aber die maßgeblichen Rechnungsdaten als XML.',
                },
                {
                  question: 'Brauche ich eine Leitweg-ID?',
                  answer:
                    'Nur für Rechnungen an öffentliche Auftraggeber, die Ihnen die Leitweg-ID mitteilen. Für Rechnungen an Unternehmen ist keine Leitweg-ID nötig; Taxful zeigt das Feld als Käuferreferenz an.',
                },
                {
                  question: 'Kann ich E-Rechnungen kostenlos erstellen?',
                  answer:
                    'Ja. Sie starten mit dem kostenlosen Tarif und wechseln bei Bedarf jederzeit in einen größeren Tarif. Die aktuellen Kontingente finden Sie auf der [Preisseite](/pricing).',
                },
                {
                  question: 'Kann ich eine ausgestellte Rechnung nachträglich ändern?',
                  answer:
                    'Nein. Nach dem ersten erfolgreichen Export ist die Rechnung festgeschrieben. Für Änderungen erstellen Sie eine [Rechnungskorrektur oder Gutschrift](/services/gutschrift-korrektur-schlussrechnung), die auf die ursprüngliche Rechnung verweist.',
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
                'pdf-in-e-rechnung-umwandeln',
                'e-rechnung-pruefen',
                'gutschrift-korrektur-schlussrechnung',
              ],
            },
          ],
        ],
      },
      {
        title: 'Jetzt die erste E-Rechnung erstellen',
        tone: 'surface',
        columns: [
          [
            'Legen Sie ein Konto an, hinterlegen Sie Ihr Unternehmensprofil und erstellen Sie Ihre erste XRechnung oder ZUGFeRD-Rechnung. [Kostenlos starten](/signup) oder [Tarife vergleichen](/pricing).',
          ],
        ],
      },
    ],
  },
  en: {
    title: 'Create e-invoices for Germany: XRechnung and ZUGFeRD',
    summary:
      'Taxful lets you create e-invoices as XRechnung or ZUGFeRD with saved customers and services, automatic checks and a validated file ready to send to your customers.',
    keyPoints: [
      'XRechnung 3.0.2 and ZUGFeRD EN16931',
      'Required details checked before export',
      'Sequential invoice numbers per year',
      'Start for free, upgrade anytime',
    ],
    seo: {
      title: 'Create XRechnung & ZUGFeRD e-invoices | Taxful',
      description:
        'Create e-invoices for German business customers as XRechnung or ZUGFeRD: enter the details, validate automatically and download the file. Start for free.',
    },
    sections: [
      {
        title: 'What counts as an e-invoice in Germany?',
        columns: [
          [
            `In Germany, an e-invoice is an invoice in a structured electronic format that software can read without retyping. The format must follow the European standard EN 16931 – in practice mostly **XRechnung** or **ZUGFeRD** from version 2.0.1, except the MINIMUM and BASIC-WL profiles. A plain PDF, a photo or a Word document is not an e-invoice under German VAT law, even when it is sent by email.

Every business established in Germany has had to be able to receive e-invoices since 1 January 2025. Issuing becomes mandatory after transition periods ending in 2026 and 2027. If you invoice German business customers, you need a way to produce e-invoices – including when your company is based abroad but serves German clients who ask for them.

Taxful is software for creating e-invoices without your own IT setup. You enter the details in a guided form, Taxful checks them and produces a validated XRechnung or ZUGFeRD file that you download and send to your customer.`,
          ],
        ],
      },
      {
        title: 'How it works',
        tone: 'surface',
        columns: [
          [
            `1. **Set up your company profile.** Enter your name, address, tax number or VAT ID, bank details and contact information once; Taxful adds them to every invoice.
2. **Choose customers and items.** Select saved customers, products and services or type the details directly. Each invoice keeps its own copy, so later directory changes never alter existing invoices.
3. **Review the details.** The form highlights missing required details, calculates net, VAT and gross amounts with exact decimal arithmetic and checks unit codes. Save drafts at any time.
4. **Approve and pick a format.** Owners, admins and reviewers approve the invoice after confirming two-factor sign-in, then choose XRechnung (UBL) or ZUGFeRD (PDF/A-3 with embedded XML).
5. **Validate and download.** Every file is validated with independent tools before you can download it.`,
          ],
        ],
      },
      {
        layout: 'threeColumns',
        title: 'Built for everyday invoicing',
        columns: [
          [
            `### Sequential numbers

Taxful reserves numbers per company and year in the format TF-YYYY-000001. A number is never reused, even when a draft is deleted.

### Saved customers and items

Owners and admins maintain customers, products and services in one place for the whole team.`,
          ],
          [
            `### VAT rates and special cases

Line items support positive VAT rates such as 19% or 7%, the zero rate, exempt supplies with the exemption reason, and reverse charge with the required note and the buyer's VAT ID.

### Discounts, charges and periods

Line and document discounts or charges and separate service dates or periods are carried into the target format.`,
          ],
          [
            `### Locked once issued

The first successful export issues the invoice. After that it cannot be edited or deleted; changes are made with a correction or credit note.

### Track status

Mark invoices as sent or paid and keep an eye on open items in your file overview.`,
          ],
        ],
      },
      {
        layout: 'twoColumns',
        title: 'XRechnung or ZUGFeRD?',
        subtitle: 'Both follow EN 16931. Agree with your customer which format they need.',
        columns: [
          [
            `### XRechnung

- XML only, with no visual layer
- Standard for invoices to German public-sector buyers
- Public buyers often require a Leitweg-ID as the buyer reference
- In Taxful: XRechnung 3.0.2 (UBL), validated with the KoSIT validator`,
          ],
          [
            `### ZUGFeRD

- PDF/A-3 with embedded XML: readable for people, processable by software
- Common between businesses
- The XML part holds the authoritative invoice data
- In Taxful: EN16931 profile with CII XML, validated as XML and as PDF/A`,
          ],
        ],
      },
      {
        title: 'What Taxful does not do',
        tone: 'accent',
        columns: [
          [
            `Taxful is software for creating and checking e-invoices; it is not tax advice. You decide which VAT rates, exemptions and notes apply – Taxful never infers the tax treatment for you.

Taxful does not currently deliver invoices to your customers, and it does not submit anything to the tax office or through ELSTER. There is no direct connection to accounting software such as DATEV or Lexware; you exchange files by upload and download. Buyer-issued self-billing invoices are not supported.`,
          ],
        ],
      },
      {
        title: 'The legal timeline',
        tone: 'surface',
        columns: [
          [
            `- **Since 1 January 2025:** every business in Germany must be able to receive e-invoices.
- **Until 31 December 2026:** paper invoices and, with the recipient's consent, other electronic formats such as PDF remain allowed for supplies made in 2025 and 2026.
- **From 1 January 2027:** businesses with more than EUR 800,000 total turnover in the previous year must issue e-invoices. Smaller businesses may use paper or PDF for 2027 supplies until the end of 2027.
- **From 1 January 2028:** the obligation applies to all invoices between domestic businesses.

Exceptions include small invoices up to EUR 250 gross and travel tickets. Businesses under the German small-business scheme (Kleinunternehmerregelung) may keep issuing other invoices. Sources: [Section 27(38) UStG](${sources.ustg27}), [Sections 33](${sources.ustdv33}) and [34 UStDV](${sources.ustdv34}), [Section 34a UStDV](${sources.ustdv34a}) and the [German Federal Ministry of Finance FAQ](${sources.bmfFaq}).

As of November 2026. Please confirm your situation with your tax adviser.`,
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
                  question: 'What is the difference between XRechnung and ZUGFeRD?',
                  answer:
                    'XRechnung is a pure XML file. ZUGFeRD combines a readable PDF with embedded XML data. Both follow EN 16931; public-sector buyers usually ask for XRechnung, businesses often accept ZUGFeRD.',
                },
                {
                  question: 'When do I have to issue e-invoices in Germany?',
                  answer:
                    'For supplies from 1 January 2027 if your total turnover in the previous year exceeded EUR 800,000, otherwise from 1 January 2028 at the latest. Receiving has been mandatory since 1 January 2025.',
                },
                {
                  question: 'Is a PDF invoice an e-invoice?',
                  answer:
                    'No. A PDF without embedded structured data is an "other invoice". A ZUGFeRD file is also a PDF, but it contains the authoritative invoice data as XML.',
                },
                {
                  question: 'Do I need a Leitweg-ID?',
                  answer:
                    'Only for invoices to public-sector buyers, who give you the ID. Invoices to businesses do not need one; Taxful shows the field as the buyer reference.',
                },
                {
                  question: 'Can I create e-invoices for free?',
                  answer:
                    'Yes. Start on the free plan and upgrade whenever you need more. Current allowances are on the [pricing page](/pricing).',
                },
                {
                  question: 'Can I change an invoice after issuing it?',
                  answer:
                    'No. The first successful export locks the invoice. Create a [correction or credit note](/services/gutschrift-korrektur-schlussrechnung) that references the original instead.',
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
                'pdf-in-e-rechnung-umwandeln',
                'e-rechnung-pruefen',
                'gutschrift-korrektur-schlussrechnung',
              ],
            },
          ],
        ],
      },
      {
        title: 'Create your first e-invoice',
        tone: 'surface',
        columns: [
          [
            'Create an account, add your company profile and issue your first XRechnung or ZUGFeRD invoice. [Start for free](/signup) or [compare plans](/pricing).',
          ],
        ],
      },
    ],
  },
}
