import { sources } from './sources'
import type { ServiceSeed } from './types'

export const eRechnungPruefen: ServiceSeed = {
  slug: 'e-rechnung-pruefen',
  sortOrder: 40,
  icon: 'check',
  de: {
    title: 'E-Rechnung prüfen: XRechnung und ZUGFeRD validieren',
    summary:
      'Taxful prüft XRechnung und ZUGFeRD mit unabhängigen Validierungswerkzeugen – bei jeder Rechnung, die Sie erstellen, und bei jeder empfangenen XRechnung oder ZUGFeRD-Datei. Der Prüfbericht zeigt, was fehlt.',
    keyPoints: [
      'KoSIT-Validator für XRechnung',
      'XML- und PDF/A-Prüfung für ZUGFeRD',
      'Prüfbericht für jede XRechnung und ZUGFeRD-Datei',
      'Ungültige Dateien werden nicht freigegeben',
    ],
    seo: {
      title: 'E-Rechnung prüfen: XRechnung Validator | Taxful',
      description:
        'XRechnung und ZUGFeRD validieren: Taxful prüft E-Rechnungen gegen EN 16931 und die XRechnung-Regeln und zeigt Fehler verständlich im Prüfbericht.',
    },
    sections: [
      {
        title: 'Warum Sie E-Rechnungen prüfen sollten',
        columns: [
          [
            `Eine E-Rechnung kann formal korrekt aussehen und trotzdem vom System des Empfängers abgelehnt werden. Eine wohlgeformte XML-Datei allein genügt nicht. Geprüft wird auf mehreren Ebenen:

- **Syntax:** Entspricht die Datei dem Schema von UBL oder CII?
- **Geschäftsregeln der EN 16931:** Stimmen zum Beispiel die Summen der Positionen, die Steueraufschlüsselung und die Pflichtangaben?
- **Nationale Regeln der XRechnung:** Sind etwa Kontaktdaten des Verkäufers und eine Käuferreferenz vorhanden?
- **Container bei ZUGFeRD:** Ist die PDF eine gültige PDF/A-3-Datei, und enthält sie das richtige XML?

Ein Validator prüft eine E-Rechnung automatisiert gegen diese Regeln. Für die XRechnung stellt die Koordinierungsstelle für IT-Standards (KoSIT) einen offiziellen Validator mit den passenden Prüfregeln bereit. Taxful nutzt ihn für jede XRechnung. ZUGFeRD-Dateien prüft Taxful mit dem quelloffenen Mustang-Validator, sowohl das XML als auch den PDF/A-Container.`,
          ],
        ],
      },
      {
        layout: 'twoColumns',
        title: 'Wann Taxful prüft',
        tone: 'surface',
        columns: [
          [
            `### Beim Erstellen Ihrer Rechnungen

- Pflichtangaben, Einheiten-Codes und Beträge werden schon im Formular geprüft
- Netto-, Steuer- und Bruttobeträge werden pro Steuersatz exakt nachgerechnet
- Die erzeugte XRechnung wird mit dem KoSIT-Validator geprüft
- Die ZUGFeRD-Datei wird als XML und als PDF/A geprüft; das eingebettete XML muss exakt den freigegebenen Daten entsprechen
- Nur gültige Dateien stehen zum Download bereit`,
          ],
          [
            `### Beim Empfang von Lieferantenrechnungen

- Hochgeladene XRechnungen prüft Taxful mit dem KoSIT-Validator
- ZUGFeRD- und Factur-X-Dateien werden mit dem Mustang-Validator geprüft
- Der Prüfbericht ist über Prüfsummen fest mit der Originaldatei verbunden
- Ungültige Rechnungen behalten ihren Bericht und lassen sich nicht als geprüft markieren
- Fehlerhafte strukturierte Dateien werden nie per Texterkennung „repariert“`,
          ],
        ],
      },
      {
        title: 'So lesen Sie den Prüfbericht',
        columns: [
          [
            `Der Prüfbericht listet Fehler und Warnungen. **Fehler** verletzen eine verbindliche Regel – die Datei ist dann keine gültige E-Rechnung des jeweiligen Formats. **Warnungen** weisen auf Auffälligkeiten hin, die die Gültigkeit nicht aufheben, aber eine Prüfung wert sind.

Viele Meldungen beziehen sich auf sogenannte Business Terms wie BT-10 (Käuferreferenz) oder BT-112 (Gesamtbetrag einschließlich Umsatzsteuer). So wissen Sie genau, welche Angabe betroffen ist. Der Bericht wird zusammen mit der geprüften Datei gespeichert.

- **Bei eigenen Rechnungen:** Korrigieren Sie den Entwurf und erzeugen Sie die Datei erneut. Taxful lässt keine ungültige Datei zum Download zu.
- **Bei Lieferantenrechnungen:** Bitten Sie den Aussteller um eine korrigierte Rechnung. Den Bericht können Sie ihm als Begründung nennen.`,
          ],
        ],
      },
      {
        title: 'Was eine erfolgreiche Prüfung nicht bedeutet',
        tone: 'accent',
        columns: [
          [
            `Eine gültige E-Rechnung ist technisch korrekt aufgebaut. Ob die abgerechnete Leistung erbracht wurde, ob Preise und Steuersätze stimmen und ob die Rechnung tatsächlich vom genannten Aussteller stammt, beantwortet ein Validator nicht. Bei ZUGFeRD prüft er auch nicht, ob die sichtbare PDF inhaltlich mit dem XML übereinstimmt.

Öffentliche Auftraggeber und große Unternehmen haben teilweise zusätzliche Anforderungen an Übertragungsweg oder Angaben, etwa eine Leitweg-ID. Klären Sie diese mit Ihrem Kunden. Taxful ersetzt keine Steuerberatung.`,
          ],
        ],
      },
      {
        title: 'Formate und Versionen',
        tone: 'surface',
        columns: [
          [
            `- **Zulässige Formate:** E-Rechnungen müssen der europäischen Norm EN 16931 entsprechen. Dazu zählen die XRechnung und ZUGFeRD ab Version 2.0.1 – mit Ausnahme der Profile MINIMUM und BASIC-WL.
- **XRechnung:** Taxful erzeugt und prüft XRechnung 3.0.2, die derzeit gültige Version. Die KoSIT hat die Version 4.0 angekündigt; verbindlich wird sie erst mit ihrer offiziellen Einführung.
- **ZUGFeRD:** Taxful erstellt Rechnungen im Profil EN16931. Bei hybriden Formaten sind die XML-Daten führend.

Quellen: [§ 14 UStG](${sources.ustg14}), [Fragen und Antworten des Bundesfinanzministeriums](${sources.bmfFaq}) und das [FAQ zur E-Rechnung des Bundes](${sources.eRechnungBund}). Stand: November 2026.`,
          ],
        ],
      },
      {
        layout: 'twoColumns',
        title: 'Häufige Fehler in E-Rechnungen',
        subtitle:
          'Diese Meldungen tauchen in Prüfberichten besonders oft auf – bei eigenen Rechnungen wie bei Lieferantenrechnungen.',
        columns: [
          [
            `### Fehlende Angaben

- **Käuferreferenz fehlt (BT-10):** Die XRechnung verlangt immer eine Käuferreferenz. Bei Behörden ist das die Leitweg-ID, bei Unternehmen etwa eine Bestell- oder Kundennummer.
- **Kontaktdaten des Verkäufers fehlen:** Die XRechnung erwartet Ansprechpartner, Telefonnummer und E-Mail-Adresse.
- **Elektronische Adresse fehlt:** Für Verkäufer und Käufer erwartet die XRechnung eine elektronische Adresse, meist eine E-Mail-Adresse.
- **Grund der Steuerbefreiung fehlt (BT-120):** Bei steuerfreien Umsätzen oder Reverse Charge muss der Grund angegeben werden.
- **Bankverbindung unvollständig:** Bei Zahlung per Überweisung gehört die IBAN in die strukturierten Zahlungsangaben.`,
          ],
          [
            `### Rechen- und Formatfehler

- **Summen stimmen nicht:** Positionssummen, Steuerbeträge je Steuersatz und Gesamtbetrag müssen exakt zusammenpassen; schon Rundungsdifferenzen fallen auf.
- **Steuersatz passt nicht zur Kategorie:** Eine Position mit positivem Steuersatz (Kategorie S) braucht einen Satz größer null, eine steuerfreie Position den Satz null.
- **Ungültige Einheiten-Codes (BT-130):** Mengeneinheiten stammen aus einer festen Codeliste, etwa H87 für Stück oder HUR für Stunde.
- **Falsches Datumsformat:** Datumsangaben folgen einem festen Format.
- **Ungeeignetes ZUGFeRD-Profil:** Die Profile MINIMUM und BASIC-WL erfüllen die Anforderungen an eine E-Rechnung nicht.

Die meisten dieser Fehler verhindert Taxful bereits im Formular, bevor eine Datei entsteht.`,
          ],
        ],
      },
      {
        title: 'Häufige Fragen zur Prüfung von E-Rechnungen',
        columns: [
          [
            {
              faq: [
                {
                  question: 'Was ist ein XRechnung-Validator?',
                  answer:
                    'Ein Programm, das eine XRechnung gegen das XML-Schema, die Geschäftsregeln der EN 16931 und die nationalen XRechnung-Regeln prüft. Taxful verwendet dafür den Validator der KoSIT.',
                },
                {
                  question: 'Was ist der Unterschied zwischen Fehler und Warnung?',
                  answer:
                    'Ein Fehler verletzt eine verbindliche Regel; die Datei ist dann keine gültige E-Rechnung des Formats. Eine Warnung weist auf eine Auffälligkeit hin, die Sie prüfen sollten, ohne dass die Datei ungültig wird.',
                },
                {
                  question: 'Ist eine valide E-Rechnung automatisch korrekt?',
                  answer:
                    'Nein. Die Validierung bestätigt den formal richtigen Aufbau. Ob Leistung, Beträge und Steuersätze stimmen, prüfen Sie inhaltlich selbst.',
                },
                {
                  question: 'Welche XRechnung-Version prüft Taxful?',
                  answer: 'Taxful erzeugt und prüft XRechnung 3.0.2, die derzeit gültige Version.',
                },
                {
                  question: 'Was mache ich mit einer ungültigen Lieferantenrechnung?',
                  answer:
                    'Bitten Sie den Aussteller um eine korrigierte E-Rechnung und nennen Sie die Meldungen aus dem Prüfbericht. Die ungültige Datei bleibt mit ihrem Bericht in Taxful gespeichert.',
                },
                {
                  question: 'Prüft Taxful auch die PDF einer ZUGFeRD-Rechnung?',
                  answer:
                    'Ja. Taxful prüft das eingebettete XML und den PDF/A-Container. Ob die sichtbare Darstellung inhaltlich mit dem XML übereinstimmt, wird nicht automatisch bestätigt.',
                },
                {
                  question: 'Kann ich eine E-Rechnung online kostenlos prüfen?',
                  answer:
                    'Ja. Mit dem kostenlosen Tarif laden Sie Eingangsrechnungen hoch und erhalten für jede XRechnung oder ZUGFeRD-Datei einen Prüfbericht, im Rahmen des monatlichen Kontingents. Mehr Dokumente bieten die größeren [Tarife](/pricing).',
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
                'e-rechnung-empfangen',
                'e-rechnung-erstellen',
                'pdf-in-e-rechnung-umwandeln',
              ],
            },
          ],
        ],
      },
      {
        title: 'E-Rechnungen sicher prüfen',
        tone: 'surface',
        columns: [
          [
            'Prüfen Sie eingehende und eigene E-Rechnungen mit den offiziellen Prüfregeln für XRechnung und ZUGFeRD. [Kostenlos starten](/signup) oder [Tarife vergleichen](/pricing).',
          ],
        ],
      },
    ],
  },
  en: {
    title: 'Validate e-invoices: XRechnung and ZUGFeRD validator',
    summary:
      'Taxful validates XRechnung and ZUGFeRD with independent tools – for every invoice you create and every XRechnung or ZUGFeRD file you receive. The validation report shows exactly what is missing.',
    keyPoints: [
      'KoSIT validator for XRechnung',
      'XML and PDF/A checks for ZUGFeRD',
      'A report for each XRechnung or ZUGFeRD file',
      'Invalid files are never released',
    ],
    seo: {
      title: 'XRechnung validator & ZUGFeRD check | Taxful',
      description:
        'Validate XRechnung and ZUGFeRD: Taxful checks e-invoices against EN 16931 and the XRechnung rules and explains every error in a clear validation report.',
    },
    sections: [
      {
        title: 'Why e-invoices need validating',
        columns: [
          [
            `An e-invoice can look right and still be rejected by the recipient's system. Well-formed XML alone is not enough. Validation happens on several levels:

- **Syntax:** does the file match the UBL or CII schema?
- **EN 16931 business rules:** do line totals, the VAT breakdown and required details add up?
- **National XRechnung rules:** are the seller's contact details and a buyer reference present?
- **ZUGFeRD container:** is the PDF a valid PDF/A-3 file containing the right XML?

A validator checks a file against these rules automatically. For XRechnung, Germany's Coordination Office for IT Standards (KoSIT) provides the official validator and rule set, which Taxful uses for every XRechnung. ZUGFeRD files are checked with the open-source Mustang validator – both the XML and the PDF/A container.`,
          ],
        ],
      },
      {
        layout: 'twoColumns',
        title: 'When Taxful validates',
        tone: 'surface',
        columns: [
          [
            `### When you create invoices

- Required details, unit codes and amounts are checked in the form
- Net, VAT and gross amounts are recalculated exactly per VAT rate
- Every XRechnung is validated with the KoSIT validator
- ZUGFeRD is validated as XML and as PDF/A, and the embedded XML must match the approved data
- Only valid files can be downloaded`,
          ],
          [
            `### When you receive invoices

- Uploaded XRechnung files are validated with the KoSIT validator
- ZUGFeRD and Factur-X files are validated with Mustang
- The report is tied to the original file by checksums
- Invalid invoices keep their report and cannot be marked as reviewed
- Broken structured files are never "repaired" through text recognition`,
          ],
        ],
      },
      {
        title: 'Reading the validation report',
        columns: [
          [
            `The report lists errors and warnings. An **error** breaks a mandatory rule, so the file is not a valid e-invoice of that format. A **warning** points to something worth checking without invalidating the file. Messages refer to business terms such as BT-10 (buyer reference) or BT-112 (total amount with VAT), so you know exactly which detail is affected.

For your own invoices, fix the draft and generate the file again. For supplier invoices, ask the issuer for a corrected e-invoice and quote the report.`,
          ],
        ],
      },
      {
        title: 'What a passed validation does not mean',
        tone: 'accent',
        columns: [
          [
            `A valid e-invoice is technically well built. A validator does not confirm that goods or services were delivered, that prices and VAT rates are right, or that the invoice really comes from the named issuer. For ZUGFeRD it does not confirm that the visible PDF matches the XML. Public-sector buyers and large companies may add requirements such as a Leitweg-ID or a specific delivery channel. Taxful is not tax advice.`,
          ],
        ],
      },
      {
        title: 'Formats and versions',
        tone: 'surface',
        columns: [
          [
            `- **Accepted formats:** e-invoices must follow EN 16931, which includes XRechnung and ZUGFeRD from version 2.0.1 except the MINIMUM and BASIC-WL profiles.
- **XRechnung:** Taxful creates and validates XRechnung 3.0.2, the version currently in force. KoSIT has announced version 4.0, which only becomes binding once officially introduced.
- **ZUGFeRD:** Taxful creates invoices in the EN16931 profile. In hybrid formats, the XML prevails.

Sources: [German Federal Ministry of Finance FAQ](${sources.bmfFaq}) and the [federal e-invoicing FAQ](${sources.eRechnungBund}). As of November 2026.`,
          ],
        ],
      },
      {
        layout: 'twoColumns',
        title: 'Common validation errors',
        columns: [
          [
            `### Missing details

- **No buyer reference (BT-10):** XRechnung always requires one – the Leitweg-ID for public buyers, a purchase order or customer number for businesses.
- **No seller contact:** XRechnung expects a contact name, phone number and email address.
- **No electronic address** for seller and buyer, usually an email address.
- **No VAT exemption reason (BT-120)** for exempt or reverse-charge supplies.`,
          ],
          [
            `### Calculation and format errors

- **Totals do not add up:** line totals, VAT per rate and the grand total must match exactly; rounding differences are caught.
- **Rate does not match the category:** standard-rated lines need a rate above zero, exempt lines a rate of zero.
- **Invalid unit codes (BT-130):** units come from a fixed code list, such as H87 for piece or HUR for hour.
- **Unsuitable ZUGFeRD profile:** MINIMUM and BASIC-WL do not qualify as e-invoices.

Taxful prevents most of these in the form before a file is generated.`,
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
                  question: 'What is an XRechnung validator?',
                  answer:
                    'A program that checks an XRechnung against the XML schema, the EN 16931 business rules and the national XRechnung rules. Taxful uses the KoSIT validator.',
                },
                {
                  question: 'What is the difference between an error and a warning?',
                  answer:
                    'An error breaks a mandatory rule and makes the file invalid for that format. A warning flags something to review without invalidating the file.',
                },
                {
                  question: 'Is a valid e-invoice automatically correct?',
                  answer:
                    'No. Validation confirms the structure. You still check that services, amounts and VAT rates are right.',
                },
                {
                  question: 'Which XRechnung version does Taxful support?',
                  answer:
                    'Taxful creates and validates XRechnung 3.0.2, the version currently in force.',
                },
                {
                  question: 'What should I do with an invalid supplier invoice?',
                  answer:
                    'Ask the issuer for a corrected e-invoice and share the messages from the report. The invalid file stays stored in Taxful with its report.',
                },
                {
                  question: 'Can I validate an e-invoice online for free?',
                  answer:
                    'Yes. On the free plan you upload incoming invoices and get a validation report for each XRechnung or ZUGFeRD file, within the monthly allowance. Larger [plans](/pricing) include more documents.',
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
                'e-rechnung-empfangen',
                'e-rechnung-erstellen',
                'pdf-in-e-rechnung-umwandeln',
              ],
            },
          ],
        ],
      },
      {
        title: 'Validate with confidence',
        tone: 'surface',
        columns: [
          [
            'Check incoming and outgoing e-invoices against the official XRechnung and ZUGFeRD validation rules. [Start for free](/signup) or [compare plans](/pricing).',
          ],
        ],
      },
    ],
  },
}
