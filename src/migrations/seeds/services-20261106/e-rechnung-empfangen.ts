import { sources } from './sources'
import type { ServiceSeed } from './types'

export const eRechnungEmpfangen: ServiceSeed = {
  slug: 'e-rechnung-empfangen',
  sortOrder: 30,
  icon: 'incoming-invoices',
  de: {
    title: 'E-Rechnung empfangen: XRechnung und ZUGFeRD öffnen und lesen',
    summary:
      'Seit 2025 müssen Unternehmen E-Rechnungen empfangen können. Mit Taxful öffnen Sie XRechnung- und ZUGFeRD-Dateien im Browser, prüfen sie und bewahren das Original unverändert auf.',
    keyPoints: [
      'XRechnung und ZUGFeRD im Browser lesen',
      'Strukturierte Dateien ohne KI ausgewertet',
      'Prüfbericht für jede XRechnung und ZUGFeRD-Datei',
      'Original bleibt unverändert erhalten',
    ],
    seo: {
      title: 'E-Rechnung empfangen & XRechnung öffnen | Taxful',
      description:
        'E-Rechnungen empfangen und XRechnung oder ZUGFeRD im Browser öffnen: lesbare Ansicht, Prüfbericht und unverändertes Original – ohne zusätzliche Software.',
    },
    sections: [
      {
        title: 'Empfangspflicht seit 2025 – und eine Datei, die niemand lesen kann',
        columns: [
          [
            `Seit dem 1. Januar 2025 müssen alle Unternehmen in Deutschland E-Rechnungen von anderen Unternehmen annehmen können. Nach Auffassung des Bundesfinanzministeriums genügt dafür ein E-Mail-Postfach. Die eigentliche Arbeit beginnt aber erst, wenn die Rechnung ankommt: Eine XRechnung ist eine XML-Datei. Wer sie per Doppelklick öffnet, sieht Programmcode statt einer Rechnung – keine übersichtlichen Positionen, keine Summen, keine Bankverbindung.

Bei ZUGFeRD ist es anders und doch ähnlich: Die Datei sieht aus wie eine normale PDF, enthält aber zusätzlich strukturierte XML-Daten. Umsatzsteuerlich maßgeblich ist der XML-Teil. Weicht die sichtbare PDF von den eingebetteten Daten ab, zählen die Daten im XML.

Um eine eingehende E-Rechnung zu prüfen, zu buchen und zu bezahlen, brauchen Sie also ein Werkzeug, das die Daten lesbar macht und die Datei auf formale Fehler prüft. Taxful übernimmt beides direkt im Browser – unter Windows, macOS und Linux, ohne Installation.`,
          ],
        ],
      },
      {
        title: 'So öffnen Sie eine E-Rechnung mit Taxful',
        tone: 'surface',
        columns: [
          [
            `1. **Datei speichern.** Speichern Sie den Anhang aus der E-Mail Ihres Lieferanten, etwa die XML-Datei oder die ZUGFeRD-PDF.
2. **Unter Eingangsrechnungen hochladen.** Eingehende Dokumente liegen in einem eigenen Bereich, getrennt von Ihren Ausgangsrechnungen.
3. **Sicherheitsprüfung abwarten.** Dateisignatur, Typ und Größe werden geprüft, die Datei wird in Quarantäne auf Schadsoftware gescannt.
4. **Format erkennen und validieren.** Taxful erkennt XRechnung im UBL- oder CII-Format sowie ZUGFeRD- und Factur-X-PDFs mit genau einem eingebetteten Rechnungs-XML und prüft sie gegen die Regeln des Formats.
5. **Rechnung lesen.** Sie sehen Lieferant, Empfänger, Positionen, Steuersätze, Summen und Zahlungsangaben als übersichtliche Zusammenfassung – zusammen mit dem Prüfbericht.
6. **Als geprüft markieren.** Ist die Datei gültig und stimmen die Angaben, markieren Sie die Rechnung als geprüft. Ungültige Dateien lassen sich nicht als geprüft markieren.`,
          ],
        ],
      },
      {
        layout: 'threeColumns',
        title: 'Was den Empfang mit Taxful ausmacht',
        columns: [
          [
            `### Ohne KI und ohne Raten

XRechnung- und ZUGFeRD-Dateien enthalten bereits strukturierte Daten. Taxful liest sie direkt aus, ohne KI und ohne Schätzungen. Fehlerhafte Dateien werden nicht stillschweigend über eine Texterkennung „repariert“.`,
          ],
          [
            `### Das Original bleibt erhalten

Die empfangene Datei wird unverändert gespeichert. Der Prüfbericht ist über Prüfsummen fest mit genau dieser Datei verbunden und lässt sich jederzeit nachvollziehen.`,
          ],
          [
            `### Auch normale PDF-Rechnungen

Erhalten Sie noch Papier- oder PDF-Rechnungen, laden Sie diese ebenfalls hoch. Taxful fasst die Angaben mit Hilfe eines externen KI-Dienstes zur Prüfung zusammen und kennzeichnet sie als Vorschlag. Einen Prüfbericht gibt es nur für strukturierte E-Rechnungen.`,
          ],
        ],
      },
      {
        layout: 'twoColumns',
        title: 'Was Sie in der Ansicht sehen',
        columns: [
          [
            `### XRechnung (XML)

- Rechnungsnummer, Rechnungsart und Datum
- Verkäufer und Käufer mit Anschrift und Steuernummern
- Positionen mit Menge, Einheit, Preis und Steuersatz
- Steueraufschlüsselung, Gesamtbeträge und Zahlungsangaben`,
          ],
          [
            `### ZUGFeRD (PDF mit XML)

- Dieselbe strukturierte Zusammenfassung aus dem eingebetteten XML
- Die originale PDF zum Ansehen und Herunterladen
- Prüfung des XML und des PDF/A-Containers
- Hinweis bei Dateien mit mehreren oder fehlenden Rechnungs-XML`,
          ],
        ],
      },
      {
        title: 'Was Taxful beim Empfang nicht übernimmt',
        tone: 'accent',
        columns: [
          [
            `Taxful verbindet sich nicht mit Ihrem E-Mail-Postfach und holt keine Rechnungen automatisch ab – Sie laden die Dateien selbst hoch. Eine erfolgreiche formale Prüfung bestätigt nicht, dass die Rechnung echt ist, dass Leistung und Betrag stimmen oder dass PDF und XML inhaltlich übereinstimmen. Zahlungen werden nicht ausgelöst, und Taxful übergibt keine Buchungen an Ihre Buchhaltung. Wie Sie eine Rechnung steuerlich behandeln, klären Sie mit Ihrer Steuerberatung.`,
          ],
        ],
      },
      {
        title: 'Rechtlicher Hintergrund',
        tone: 'surface',
        columns: [
          [
            `- **Empfang:** Seit dem 1. Januar 2025 müssen alle inländischen Unternehmen E-Rechnungen empfangen können – auch Kleinunternehmer. Laut Bundesfinanzministerium reicht dafür ein E-Mail-Postfach; andere Übertragungswege können vereinbart werden.
- **Maßgebliche Daten:** Bei hybriden Formaten wie ZUGFeRD sind die XML-Daten führend.
- **Aufbewahrung:** Bewahren Sie die E-Rechnung im Originalformat auf – bei der XRechnung die XML-Datei, bei ZUGFeRD die PDF mit eingebettetem XML. Für Rechnungen gilt in der Regel eine Aufbewahrungsfrist von acht Jahren ([§ 147 AO](${sources.ao147})).

Quellen: [§ 14 UStG](${sources.ustg14}), [§ 27 Abs. 38 UStG](${sources.ustg27}) und die [Fragen und Antworten des Bundesfinanzministeriums](${sources.bmfFaq}). Stand: November 2026.`,
          ],
        ],
      },
      {
        title: 'Checkliste: Pflichtangaben einer Rechnung',
        tone: 'surface',
        columns: [
          [
            `Auch eine formal gültige E-Rechnung kann inhaltlich unvollständig sein. Prüfen Sie bei Eingangsrechnungen insbesondere die Pflichtangaben nach [§ 14 Abs. 4 UStG](${sources.ustg14}):

- vollständiger Name und Anschrift von Lieferant und Empfänger
- Steuernummer oder USt-IdNr. des Lieferanten
- Rechnungsdatum und eine einmalige, fortlaufende Rechnungsnummer
- Menge und Art der Lieferung oder Umfang und Art der Leistung
- Zeitpunkt der Lieferung oder Leistung
- Entgelt nach Steuersätzen aufgeschlüsselt sowie im Voraus vereinbarte Minderungen
- Steuersatz und Steuerbetrag oder ein Hinweis auf die Steuerbefreiung

Für Kleinbetragsrechnungen bis 250 Euro gelten vereinfachte Anforderungen. Fehlt eine Pflichtangabe, kann der Vorsteuerabzug gefährdet sein; fordern Sie dann eine berichtigte Rechnung an. Die Zusammenfassung in Taxful zeigt diese Angaben übersichtlich an – ob sie inhaltlich stimmen, prüfen Sie wie bisher selbst.`,
          ],
        ],
      },
      {
        title: 'Häufige Fragen zum Empfang von E-Rechnungen',
        columns: [
          [
            {
              faq: [
                {
                  question: 'Muss ich E-Rechnungen empfangen können?',
                  answer:
                    'Ja. Seit dem 1. Januar 2025 müssen alle Unternehmen in Deutschland E-Rechnungen von anderen Unternehmen annehmen können. Die Übergangsfristen betreffen nur das Ausstellen.',
                },
                {
                  question: 'Reicht ein E-Mail-Postfach für den Empfang?',
                  answer:
                    'Nach Auffassung des Bundesfinanzministeriums ja. Um die Rechnung zu lesen und zu prüfen, brauchen Sie zusätzlich ein Werkzeug, das die XML-Daten darstellt – zum Beispiel Taxful.',
                },
                {
                  question: 'Wie öffne ich eine XRechnung?',
                  answer:
                    'Laden Sie die XML-Datei in Taxful unter Eingangsrechnungen hoch. Sie sehen danach eine lesbare Zusammenfassung mit Positionen, Summen und Zahlungsangaben sowie den Prüfbericht. Bei sehr umfangreichen Rechnungen ist die Zusammenfassung gekürzt; das vollständige Original bleibt herunterladbar.',
                },
                {
                  question: 'Kann ich eine XRechnung auf dem Mac öffnen?',
                  answer:
                    'Ja. Taxful läuft im Browser und funktioniert unter macOS, Windows und Linux, ohne dass Sie zusätzliche Software installieren.',
                },
                {
                  question: 'Müssen Kleinunternehmer E-Rechnungen empfangen?',
                  answer:
                    'Ja. Kleinunternehmer dürfen weiterhin sonstige Rechnungen ausstellen, müssen E-Rechnungen von Lieferanten aber annehmen können.',
                },
                {
                  question: 'Was gilt, wenn PDF und XML bei ZUGFeRD voneinander abweichen?',
                  answer:
                    'Maßgeblich sind die Daten im XML. Taxful zeigt die Zusammenfassung aus dem XML an; vergleichen Sie bei Zweifeln die sichtbare PDF und wenden Sie sich an den Rechnungsaussteller.',
                },
                {
                  question: 'Kann ich eine XRechnung ausdrucken?',
                  answer:
                    'Eine eigene Druckansicht bietet Taxful nicht. Sie können die lesbare Zusammenfassung aber über die Druckfunktion Ihres Browsers drucken. Der Ausdruck ersetzt aber nicht die Aufbewahrung der XML-Datei, denn umsatzsteuerlich maßgeblich ist das elektronische Original.',
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
                'e-rechnung-pruefen',
                'rechnungen-digital-verwalten',
                'pdf-in-e-rechnung-umwandeln',
              ],
            },
          ],
        ],
      },
      {
        title: 'E-Rechnungen ab sofort lesbar machen',
        tone: 'surface',
        columns: [
          [
            'Öffnen Sie Ihre erste XRechnung in wenigen Minuten. [Kostenlos starten](/signup) oder [Tarife vergleichen](/pricing).',
          ],
        ],
      },
    ],
  },
  en: {
    title: 'Receive e-invoices: open and read XRechnung and ZUGFeRD',
    summary:
      'Businesses in Germany must be able to receive e-invoices since 2025. Taxful opens XRechnung and ZUGFeRD files in your browser, validates them and keeps the original unchanged.',
    keyPoints: [
      'Read XRechnung and ZUGFeRD in the browser',
      'Structured files parsed without AI',
      'Validation report for each XRechnung or ZUGFeRD file',
      'Original kept unchanged',
    ],
    seo: {
      title: 'Open XRechnung & receive e-invoices | Taxful',
      description:
        'Receive e-invoices and open XRechnung or ZUGFeRD files in your browser: a readable summary, a validation report and the unchanged original. No install.',
    },
    sections: [
      {
        title: 'You must receive e-invoices – but can you read them?',
        columns: [
          [
            `Since 1 January 2025, every business established in Germany must be able to accept e-invoices from other businesses. According to the German Federal Ministry of Finance, an email inbox is enough for that. The real work starts when the invoice arrives: an XRechnung is an XML file. Open it with a double click and you see code, not an invoice – no clear line items, totals or bank details.

ZUGFeRD looks like an ordinary PDF but also contains structured XML data. For VAT purposes, the XML is authoritative; if the visible PDF differs from the embedded data, the XML counts.

To review, book and pay an incoming e-invoice, you need a tool that makes the data readable and checks the file for formal errors. Taxful does both in your browser on Windows, macOS and Linux, with nothing to install.`,
          ],
        ],
      },
      {
        title: 'How to open an e-invoice with Taxful',
        tone: 'surface',
        columns: [
          [
            `1. **Save the file** your supplier sent, for example the XML file or the ZUGFeRD PDF.
2. **Upload it as an incoming invoice.** Incoming documents live in their own area, separate from your outgoing invoices.
3. **Security check.** Signature, type and size are verified, and the file is scanned for malware in quarantine.
4. **Detect and validate.** Taxful recognises XRechnung in UBL or CII syntax and ZUGFeRD or Factur-X PDFs with exactly one embedded invoice XML, then validates them.
5. **Read the invoice.** See seller, buyer, line items, VAT rates, totals and payment details as a clear summary next to the validation report.
6. **Mark as reviewed.** Valid files can be marked as reviewed; invalid ones cannot.`,
          ],
        ],
      },
      {
        layout: 'threeColumns',
        title: 'Why receive with Taxful',
        columns: [
          [
            `### No AI, no guessing

Structured files already contain the data. Taxful reads it directly, without AI, and never "repairs" a broken file through text recognition.`,
          ],
          [
            `### The original is preserved

The file you received is stored unchanged. The validation report is tied to that exact file by checksums.`,
          ],
          [
            `### Ordinary PDFs too

Still receiving paper or PDF invoices? Upload them as well; Taxful summarises the details with the help of an external AI service as suggestions for your review. Validation reports apply to structured e-invoices only.`,
          ],
        ],
      },
      {
        layout: 'twoColumns',
        title: 'What you see',
        columns: [
          [
            `### XRechnung (XML)

- Invoice number, type and date
- Seller and buyer with addresses and tax identifiers
- Line items with quantity, unit, price and VAT rate
- VAT breakdown, totals and payment details`,
          ],
          [
            `### ZUGFeRD (PDF with XML)

- The same structured summary from the embedded XML
- The original PDF to view and download
- Validation of the XML and the PDF/A container
- A notice when invoice XML is missing or duplicated`,
          ],
        ],
      },
      {
        title: 'What Taxful does not do',
        tone: 'accent',
        columns: [
          [
            `Taxful does not connect to your mailbox or collect invoices automatically – you upload the files. A successful formal validation does not prove that an invoice is authentic, that goods and amounts are correct, or that the PDF and XML match. Taxful does not trigger payments or post entries to your accounting system, and it does not give tax advice.`,
          ],
        ],
      },
      {
        title: 'Legal background',
        tone: 'surface',
        columns: [
          [
            `- **Receiving:** since 1 January 2025, all domestic businesses – including businesses under the German small-business scheme (Kleinunternehmerregelung) – must be able to receive e-invoices. An email inbox is sufficient according to the Federal Ministry of Finance.
- **Authoritative data:** in hybrid formats such as ZUGFeRD, the XML data prevails.
- **Retention:** keep e-invoices in their original format – the XML for XRechnung, the PDF with embedded XML for ZUGFeRD. Invoices generally have to be kept for eight years ([Section 147 AO](${sources.ao147})).

Sources: [Section 14 UStG](${sources.ustg14}) and the [German Federal Ministry of Finance FAQ](${sources.bmfFaq}). As of November 2026.`,
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
                  question: 'Do I have to be able to receive e-invoices?',
                  answer:
                    'Yes. Since 1 January 2025, every business in Germany must be able to accept e-invoices from other businesses. The transition periods only apply to issuing.',
                },
                {
                  question: 'Is an email inbox enough to receive e-invoices?',
                  answer:
                    'According to the Federal Ministry of Finance, yes. To read and check the invoice you also need a tool that displays the XML data, such as Taxful.',
                },
                {
                  question: 'How do I open an XRechnung file?',
                  answer:
                    'Upload the XML file to Taxful as an incoming invoice. You get a readable summary with line items, totals, payment details and the validation report.',
                },
                {
                  question: 'Can I open XRechnung on a Mac?',
                  answer:
                    'Yes. Taxful runs in the browser on macOS, Windows and Linux without additional software.',
                },
                {
                  question: 'What if the PDF and XML of a ZUGFeRD invoice differ?',
                  answer:
                    'The XML data prevails. Taxful shows the summary from the XML; compare it with the visible PDF and contact the issuer if in doubt.',
                },
                {
                  question: 'Can I print an XRechnung?',
                  answer:
                    'Taxful has no dedicated print view, but you can print the readable summary with your browser’s print function. A printout does not replace keeping the XML file, which is the original for VAT purposes.',
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
                'e-rechnung-pruefen',
                'rechnungen-digital-verwalten',
                'pdf-in-e-rechnung-umwandeln',
              ],
            },
          ],
        ],
      },
      {
        title: 'Make e-invoices readable today',
        tone: 'surface',
        columns: [
          [
            'Open your first XRechnung in minutes. [Start for free](/signup) or [compare plans](/pricing).',
          ],
        ],
      },
    ],
  },
}
