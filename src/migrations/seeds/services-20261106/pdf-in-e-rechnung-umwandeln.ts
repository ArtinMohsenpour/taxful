import { sources } from './sources'
import type { ServiceSeed } from './types'

export const pdfInERechnungUmwandeln: ServiceSeed = {
  slug: 'pdf-in-e-rechnung-umwandeln',
  sortOrder: 20,
  icon: 'converter',
  de: {
    title: 'PDF in XRechnung umwandeln: Rechnungen aus PDF, Scan oder Word',
    summary:
      'Laden Sie bestehende Rechnungen als PDF, Scan, Foto oder Word-Datei hoch. Taxful erkennt die Angaben, Sie prüfen sie, und daraus entsteht eine validierte XRechnung oder ZUGFeRD-Datei.',
    keyPoints: [
      'PDF, Word, JPEG, PNG, WebP, TIFF, GIF und AVIF',
      'Virenprüfung vor jeder Verarbeitung',
      'Fehlende Angaben werden markiert, nie erfunden',
      'Export als XRechnung oder ZUGFeRD',
    ],
    seo: {
      title: 'PDF in XRechnung umwandeln – online | Taxful',
      description:
        'PDF, Scan oder Word-Rechnung in XRechnung oder ZUGFeRD umwandeln: Angaben automatisch erkennen, neben dem Original prüfen und validiert exportieren.',
    },
    sections: [
      {
        title: 'Warum eine PDF noch keine E-Rechnung ist',
        columns: [
          [
            `Viele Unternehmen schreiben Rechnungen in Word, Excel oder einem Buchhaltungsprogramm und verschicken sie als PDF. Für das Umsatzsteuerrecht ist eine solche PDF eine sonstige Rechnung, keine E-Rechnung: Ihr fehlen die strukturierten Daten, die Software ohne Abtippen verarbeiten kann. Spätestens mit dem Ende der Übergangsfristen müssen Rechnungen an andere Unternehmen in Deutschland in einem Format wie XRechnung oder ZUGFeRD vorliegen.

Wer seine bisherigen Vorlagen behalten möchte, kann eine **PDF in eine XRechnung umwandeln**. Dabei werden die Angaben aus dem Layout gelesen – Rechnungsnummer, Datum, Anschriften, Positionen, Steuersätze und Summen – und in die Felder des Zielformats übertragen. Weil jede Vorlage anders aufgebaut ist, kann eine automatische Erkennung Werte falsch zuordnen oder übersehen. Eine gute Umwandlung zeigt deshalb das Original neben den erkannten Daten und lässt nichts ungeprüft durch.

Genau so arbeitet Taxful: Die Erkennung schlägt Werte vor, Sie prüfen und ergänzen sie, und erst nach Ihrer Freigabe entsteht eine validierte E-Rechnung. Rechnungen aus DATEV, Lexware, sevDesk oder anderen Programmen exportieren Sie dort als Datei und laden sie in Taxful hoch – eine direkte Anbindung ist nicht nötig.`,
          ],
        ],
      },
      {
        title: 'So funktioniert die Umwandlung',
        tone: 'surface',
        columns: [
          [
            `1. **Hochladen.** Ziehen Sie die Rechnung in den Konverter. Taxful vertraut weder dem Dateinamen noch der Angabe des Browsers, sondern prüft Dateisignatur, Typ, Größe und Seitenzahl.
2. **Sicherheitsprüfung.** Jede Datei wird in Quarantäne auf Schadsoftware geprüft, bevor sie geöffnet wird. Fällt der Scanner aus, wartet die Datei, statt ungeprüft verarbeitet zu werden.
3. **Einordnung.** Taxful erkennt, ob es sich überhaupt um eine Rechnung handelt. Lohnsteuerbescheinigungen, Kontoauszüge oder unklare Dokumente erhalten kein Rechnungsformular und lassen sich nicht als E-Rechnung exportieren.
4. **Erkennung.** Taxful liest vorhandenen Text lokal aus und lässt die Rechnungsfelder von einem externen KI-Dienst (derzeit Google Gemini) interpretieren. Bei Scans, Fotos und PDFs mit Bildern oder komplexem Layout wird dafür die Datei selbst übermittelt. Die Ergebnisse sind Vorschläge; der Fortschritt jedes Schritts ist in der Dateiübersicht sichtbar.
5. **Prüfung neben dem Original.** Sie sehen die Vorlage neben den erkannten Feldern. Fehlende Pflichtangaben werden markiert, Summen und Steuerbeträge nachgerechnet.
6. **Freigabe und Export.** Nach der Freigabe erzeugen Sie eine XRechnung oder eine ZUGFeRD-Datei. Beide werden vor dem Download validiert.`,
          ],
        ],
      },
      {
        layout: 'twoColumns',
        title: 'Welche Dateien Taxful verarbeitet',
        columns: [
          [
            `### Eingabe

- PDF mit Text sowie gescannte PDF
- Word-Dokumente (DOCX)
- Fotos und Scans als JPEG, PNG, WebP, TIFF, GIF oder AVIF
- Ältere Word-Dateien (DOC) und Excel-Tabellen werden nicht direkt unterstützt; speichern Sie diese vorher als PDF`,
          ],
          [
            `### Ergebnis

- XRechnung 3.0.2 im UBL-Format
- ZUGFeRD im Profil EN16931 als PDF/A-3 mit eingebettetem XML
- Das hochgeladene Original bleibt unverändert und separat herunterladbar
- Prüfbericht und Export werden zusammen mit der freigegebenen Fassung gespeichert`,
          ],
        ],
      },
      {
        layout: 'threeColumns',
        title: 'Worauf Sie sich verlassen können',
        columns: [
          [
            `### Keine erfundenen Werte

Unsichere Werte werden markiert, und fehlende Pflichtangaben bleiben offen, bis Sie sie ergänzen. Vorbelegungen wie die Währung EUR oder ein Leistungsdatum gleich dem Rechnungsdatum sind gekennzeichnet und jederzeit änderbar.`,
          ],
          [
            `### Das Original bleibt Original

Die hochgeladene Datei wird nicht verändert. Die erzeugte E-Rechnung ist eine neue Datei, die aus Ihren geprüften Angaben entsteht.`,
          ],
          [
            `### Freigabe im Team

Mitglieder laden hoch und speichern Entwürfe. Freigeben und exportieren dürfen nur Inhaber, Administratoren und Prüfer Ihres Unternehmens, jeweils mit bestätigter Zwei-Faktor-Anmeldung.`,
          ],
        ],
      },
      {
        title: 'Grenzen der Umwandlung',
        tone: 'accent',
        columns: [
          [
            `Eine automatische Erkennung ersetzt nicht Ihre Prüfung. Die Qualität hängt von der Vorlage ab: Unscharfe Fotos, handschriftliche Ergänzungen oder sehr ungewöhnliche Layouts erfordern mehr Korrekturen. Kassenbelege und Quittungen werden derzeit bewusst nicht als Rechnung verarbeitet.

Umwandeln sollten Sie Rechnungen, die Ihr Unternehmen selbst ausstellt. Eine Lieferantenrechnung, die Sie als PDF erhalten haben, wird durch Ihre Umwandlung nicht zur E-Rechnung des Lieferanten; laden Sie sie stattdessen unter [Eingangsrechnungen](/services/e-rechnung-empfangen) hoch. Taxful ersetzt keine Steuerberatung und übermittelt nichts an das Finanzamt.`,
          ],
        ],
      },
      {
        title: 'Rechtlicher Hintergrund',
        tone: 'surface',
        columns: [
          [
            `Eine PDF ohne strukturierte Daten ist umsatzsteuerlich eine sonstige Rechnung. Für Umsätze aus 2025 und 2026 darf sie mit Zustimmung des Empfängers noch bis zum 31. Dezember 2026 verwendet werden. Unternehmen mit höchstens 800.000 Euro Gesamtumsatz im Vorjahr dürfen Umsätze aus 2027 noch bis Ende 2027 so abrechnen. Ab 2028 sind Rechnungen zwischen inländischen Unternehmen grundsätzlich als E-Rechnung auszustellen. Ausnahmen gelten etwa für Kleinbetragsrechnungen bis 250 Euro und für Kleinunternehmer.

Quellen: [§ 27 Abs. 38 UStG](${sources.ustg27}), [§ 34a UStDV](${sources.ustdv34a}) und die [Fragen und Antworten des Bundesfinanzministeriums](${sources.bmfFaq}). Stand: November 2026.`,
          ],
        ],
      },
      {
        title: 'Für wen sich die Umwandlung eignet',
        columns: [
          [
            `Die Umwandlung ist für Unternehmen gedacht, die ihre Rechnungen heute außerhalb einer E-Rechnungs-Software schreiben: Handwerksbetriebe mit Word- oder Excel-Vorlagen, Freiberufler und Agenturen, die PDFs aus einem Textprogramm verschicken, oder Teams, deren Buchhaltungsprogramm noch keine XRechnung ausgibt.

Sie behalten Ihren gewohnten Ablauf und ergänzen nur einen Schritt: Die fertige PDF laden Sie in Taxful hoch, prüfen die erkannten Angaben und senden Ihrem Kunden anschließend die validierte E-Rechnung. Wer viele gleichartige Rechnungen schreibt, kann später mit gespeicherten Kunden und Leistungen direkt in Taxful [E-Rechnungen erstellen](/services/e-rechnung-erstellen) und spart sich den Umweg über die PDF.`,
          ],
        ],
      },
      {
        title: 'Häufige Fragen zur Umwandlung',
        columns: [
          [
            {
              faq: [
                {
                  question: 'Kann ich eine PDF kostenlos in eine XRechnung umwandeln?',
                  answer:
                    'Ja. Mit dem kostenlosen Tarif wandeln Sie Rechnungen im Rahmen des monatlichen Kontingents um. Wenn Sie mehr Dokumente brauchen, wechseln Sie in einen größeren Tarif; Details stehen auf der [Preisseite](/pricing).',
                },
                {
                  question: 'Ist die umgewandelte Datei eine gültige E-Rechnung?',
                  answer:
                    'Die erzeugte XRechnung oder ZUGFeRD-Datei wird technisch gegen die geltenden Regeln validiert. Inhaltlich verantwortlich bleibt der Rechnungsaussteller – deshalb prüfen und bestätigen Sie die Angaben vor dem Export.',
                },
                {
                  question: 'Was passiert, wenn Angaben in der PDF fehlen?',
                  answer:
                    'Fehlende Pflichtangaben werden im Prüfformular markiert und müssen ergänzt werden, bevor Sie die Rechnung freigeben können. Vorbelegte Standardwerte wie EUR sind gekennzeichnet und änderbar.',
                },
                {
                  question: 'Welche Dateiformate kann ich hochladen?',
                  answer:
                    'PDF (mit Text oder gescannt), DOCX sowie Bilder als JPEG, PNG, WebP, TIFF, GIF und AVIF. Ältere Word-Dateien (DOC) und Excel-Tabellen speichern Sie vorher als PDF.',
                },
                {
                  question: 'Kann ich Rechnungen aus DATEV oder Lexware umwandeln?',
                  answer:
                    'Ja, über den Datei-Export. Speichern Sie die Rechnung in Ihrem Programm als PDF und laden Sie sie in Taxful hoch. Eine direkte Schnittstelle zu diesen Programmen besteht nicht.',
                },
                {
                  question: 'Kann ich auch Lieferantenrechnungen umwandeln?',
                  answer:
                    'Eingehende Rechnungen laden Sie im Bereich Eingangsrechnungen hoch. Dort werden die Angaben zur Prüfung zusammengefasst, aber nicht als eigene Ausgangsrechnung exportiert.',
                },
                {
                  question: 'Werden meine Rechnungen an einen KI-Dienst übermittelt?',
                  answer:
                    'Ja, bei PDF-, Word- und Bilddateien: Taxful übermittelt den ausgelesenen Text oder die Datei an einen externen KI-Dienst (derzeit Google Gemini), der die Rechnungsfelder vorschlägt. Strukturierte E-Rechnungen wie XRechnung und ZUGFeRD wertet Taxful beim Empfang ohne KI aus. Informationen zur Verarbeitung finden Sie in unserer Datenschutzerklärung.',
                },
              ],
            },
          ],
        ],
      },
      {
        title: 'Passende Leistungen',
        columns: [
          [{ services: ['e-rechnung-erstellen', 'e-rechnung-pruefen', 'e-rechnung-empfangen'] }],
        ],
      },
      {
        title: 'Bestehende Rechnungen jetzt umwandeln',
        tone: 'surface',
        columns: [
          [
            'Behalten Sie Ihre gewohnten Vorlagen und machen Sie daraus geprüfte E-Rechnungen. [Kostenlos starten](/signup) oder [Tarife vergleichen](/pricing).',
          ],
        ],
      },
    ],
  },
  en: {
    title: 'Convert PDF to XRechnung: invoices from PDF, scans or Word',
    summary:
      'Upload existing invoices as PDF, scan, photo or Word file. Taxful extracts the details, you review them, and you get a validated XRechnung or ZUGFeRD file.',
    keyPoints: [
      'PDF, Word, JPEG, PNG, WebP, TIFF, GIF and AVIF',
      'Malware check before any processing',
      'Missing details flagged, never invented',
      'Export as XRechnung or ZUGFeRD',
    ],
    seo: {
      title: 'Convert PDF to XRechnung or ZUGFeRD | Taxful',
      description:
        'Convert PDF, scanned or Word invoices to XRechnung or ZUGFeRD: extract the details, review them beside the original and export a validated e-invoice.',
    },
    sections: [
      {
        title: 'Why a PDF is not yet an e-invoice',
        columns: [
          [
            `Many businesses write invoices in Word, Excel or accounting software and send them as PDF. Under German VAT law, such a PDF is an "other invoice", not an e-invoice: it lacks the structured data software can process without retyping. Once the transition periods end, invoices to German business customers must use a format such as XRechnung or ZUGFeRD.

If you want to keep your existing templates, you can **convert a PDF to XRechnung**. The conversion reads the invoice number, dates, addresses, line items, VAT rates and totals from the layout and maps them to the target format. Because every template is different, automatic extraction can misread or miss values – so a reliable conversion shows the original beside the extracted data and lets nothing through unchecked.

That is how Taxful works: extraction suggests values, you review and complete them, and only your approval produces a validated e-invoice. Invoices from DATEV, Lexware, sevDesk or other tools are exported there as files and uploaded to Taxful; no direct connection is needed.`,
          ],
        ],
      },
      {
        title: 'How the conversion works',
        tone: 'surface',
        columns: [
          [
            `1. **Upload.** Drop the invoice into the converter. Taxful checks the file signature, type, size and page count instead of trusting the file name.
2. **Security check.** Every file is scanned for malware in quarantine before it is opened. If the scanner is unavailable, the file waits rather than being processed unchecked.
3. **Classification.** Taxful first decides whether the document is an invoice. Wage certificates, bank statements or unclear documents get no invoice form and cannot be exported.
4. **Extraction.** Taxful extracts embedded text locally and has an external AI service (currently Google Gemini) interpret the invoice fields. For scans, photos and PDFs with images or complex layouts, the file itself is sent. Results are suggestions, and progress is visible in your file list.
5. **Review beside the original.** Missing required details are flagged, and totals and VAT amounts are recalculated.
6. **Approve and export.** Create XRechnung or ZUGFeRD; both are validated before download.`,
          ],
        ],
      },
      {
        layout: 'twoColumns',
        title: 'Supported files',
        columns: [
          [
            `### Input

- Text-based and scanned PDF
- Word documents (DOCX)
- Photos and scans as JPEG, PNG, WebP, TIFF, GIF or AVIF
- Legacy DOC files and spreadsheets are not supported directly; save them as PDF first`,
          ],
          [
            `### Output

- XRechnung 3.0.2 (UBL)
- ZUGFeRD EN16931 as PDF/A-3 with embedded XML
- The uploaded original stays unchanged and downloadable
- Validation report stored with the approved version`,
          ],
        ],
      },
      {
        layout: 'threeColumns',
        title: 'What you can rely on',
        columns: [
          [
            `### No invented values

Uncertain values are flagged, and missing required details stay open until you complete them. Prefilled defaults such as EUR or a service date equal to the invoice date are marked and can be changed.`,
          ],
          [
            `### Originals stay untouched

The uploaded file is never modified. The e-invoice is a new file built from the details you approved.`,
          ],
          [
            `### Team approval

Members upload and save drafts. Only owners, admins and reviewers can approve and export, after confirming two-factor sign-in.`,
          ],
        ],
      },
      {
        title: 'Limits of conversion',
        tone: 'accent',
        columns: [
          [
            `Extraction does not replace your review. Blurry photos, handwritten notes or unusual layouts need more corrections, and receipts are deliberately not processed as invoices yet.

Convert invoices your own business issues. Converting a supplier's PDF does not turn it into the supplier's e-invoice; upload it as an [incoming invoice](/services/e-rechnung-empfangen) instead. Taxful is not tax advice and submits nothing to the tax office.`,
          ],
        ],
      },
      {
        title: 'Legal background',
        tone: 'surface',
        columns: [
          [
            `A PDF without structured data counts as an "other invoice". With the recipient's consent it may still be used for 2025 and 2026 supplies until 31 December 2026. Businesses with total turnover of up to EUR 800,000 in the previous year may do so for 2027 supplies until the end of 2027. From 2028, invoices between domestic businesses must generally be e-invoices, with exceptions such as invoices up to EUR 250 and businesses under the German small-business scheme (Kleinunternehmerregelung).

Sources: [Section 27(38) UStG](${sources.ustg27}) and the [German Federal Ministry of Finance FAQ](${sources.bmfFaq}). As of November 2026.`,
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
                  question: 'Can I convert a PDF to XRechnung for free?',
                  answer:
                    'Yes, within the monthly allowance of the free plan. Upgrade when you need more documents; see the [pricing page](/pricing).',
                },
                {
                  question: 'Is the converted file a valid e-invoice?',
                  answer:
                    'The XRechnung or ZUGFeRD file is technically validated against the applicable rules. The issuer remains responsible for the content, which is why you review and confirm the details before export.',
                },
                {
                  question: 'What happens when details are missing from the PDF?',
                  answer:
                    'Missing required details are flagged and must be completed before approval. Prefilled defaults such as EUR are marked and can be changed.',
                },
                {
                  question: 'Which file types can I upload?',
                  answer:
                    'Text-based or scanned PDF, DOCX and images as JPEG, PNG, WebP, TIFF, GIF or AVIF. Save legacy DOC files and spreadsheets as PDF first.',
                },
                {
                  question: 'Can I convert invoices from DATEV or Lexware?',
                  answer:
                    'Yes, through a file export: save the invoice as PDF in your accounting tool and upload it. There is no direct integration.',
                },
                {
                  question: 'Can I convert supplier invoices?',
                  answer:
                    'Upload supplier invoices as incoming invoices. Taxful summarises them for review but does not export them as your own outgoing invoices.',
                },
                {
                  question: 'Are my invoices sent to an AI service?',
                  answer:
                    'Yes, for PDF, Word and image files: Taxful sends the extracted text or the file to an external AI service (currently Google Gemini), which suggests the invoice fields. Incoming structured e-invoices such as XRechnung and ZUGFeRD are processed without AI. See our privacy policy for details.',
                },
              ],
            },
          ],
        ],
      },
      {
        title: 'Related services',
        columns: [
          [{ services: ['e-rechnung-erstellen', 'e-rechnung-pruefen', 'e-rechnung-empfangen'] }],
        ],
      },
      {
        title: 'Convert your existing invoices',
        tone: 'surface',
        columns: [
          [
            'Keep your templates and turn them into validated e-invoices. [Start for free](/signup) or [compare plans](/pricing).',
          ],
        ],
      },
    ],
  },
}
