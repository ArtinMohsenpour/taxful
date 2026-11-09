import { sources } from './sources'
import type { LandingSeed } from './types'

export const landingSeed: LandingSeed = {
  de: {
    eyebrow: 'Leistungen',
    title: 'E-Rechnung-Software für XRechnung und ZUGFeRD',
    subtitle:
      'Erstellen, umwandeln, empfangen und prüfen Sie E-Rechnungen an einem Ort – vorbereitet auf die E-Rechnungspflicht ab 2027.',
    seo: {
      title: 'E-Rechnung-Software: XRechnung & ZUGFeRD | Taxful',
      description:
        'E-Rechnungen erstellen, aus PDF umwandeln, empfangen und prüfen: Taxful ist die E-Rechnung-Software für XRechnung und ZUGFeRD. Kostenlos starten.',
    },
    sections: [
      {
        title: 'Unsere Leistungen',
        subtitle:
          'Jede Leistung deckt einen Schritt rund um die E-Rechnung ab. Wählen Sie, womit Sie beginnen möchten.',
        columns: [[{ services: [] }]],
      },
      {
        layout: 'twoColumns',
        title: 'Die E-Rechnungspflicht im Überblick',
        tone: 'surface',
        columns: [
          [
            `- **Seit 1. Januar 2025:** Alle Unternehmen in Deutschland müssen E-Rechnungen empfangen können.
- **Ab 1. Januar 2027:** Unternehmen mit mehr als 800.000 Euro Vorjahresumsatz müssen E-Rechnungen ausstellen.
- **Ab 1. Januar 2028:** Die Pflicht gilt für alle Rechnungen zwischen inländischen Unternehmen.

Ausgenommen sind unter anderem Kleinbetragsrechnungen bis 250 Euro ([§ 33 UStDV](${sources.ustdv33})); Kleinunternehmer dürfen weiterhin sonstige Rechnungen ausstellen ([§ 34a UStDV](${sources.ustdv34a})).`,
          ],
          [
            `### Was das für Sie bedeutet

Sie brauchen ein Werkzeug, das XRechnung und ZUGFeRD lesen, prüfen und erzeugen kann. Taxful deckt diese Schritte ab, ohne dass Sie Software installieren oder Ihre Buchhaltung umstellen müssen.

Quellen: [§ 27 Abs. 38 UStG](${sources.ustg27}) und die [Fragen und Antworten des Bundesfinanzministeriums](${sources.bmfFaq}). Stand: November 2026.`,
          ],
        ],
      },
      {
        layout: 'threeColumns',
        title: 'Warum Taxful',
        columns: [
          [
            `### Geprüfte Dateien

Jede XRechnung und jede ZUGFeRD-Datei wird vor dem Download mit unabhängigen Prüfwerkzeugen validiert.`,
          ],
          [
            `### Nichts wird erfunden

Was in einem Dokument fehlt, wird markiert. Sie prüfen und ergänzen die Angaben, bevor eine Rechnung entsteht.`,
          ],
          [
            `### Ein Ablauf für das Team

Rollen legen fest, wer hochlädt, prüft und freigibt. Originale bleiben unverändert und privat gespeichert.`,
          ],
        ],
      },
      {
        title: 'Was Taxful ist – und was nicht',
        tone: 'accent',
        columns: [
          [
            'Taxful ist eine Software für E-Rechnungen und ersetzt keine Steuerberatung. Taxful übermittelt nichts an das Finanzamt oder über ELSTER und ist nicht direkt mit Buchhaltungsprogrammen wie DATEV verbunden; Dateien tauschen Sie per Upload und Download aus.',
          ],
        ],
      },
      {
        title: 'Häufige Fragen',
        columns: [
          [
            {
              faq: [
                {
                  question: 'Was ist eine E-Rechnung?',
                  answer:
                    'Eine Rechnung in einem strukturierten elektronischen Format nach der Norm EN 16931, etwa XRechnung oder ZUGFeRD. Eine einfache PDF ist keine E-Rechnung.',
                },
                {
                  question: 'Ab wann muss ich E-Rechnungen ausstellen?',
                  answer:
                    'Ab 2027, wenn Ihr Vorjahresumsatz über 800.000 Euro lag, sonst ab 2028. Empfangen müssen Sie E-Rechnungen bereits seit 2025.',
                },
                {
                  question: 'Kann ich Taxful kostenlos nutzen?',
                  answer:
                    'Ja, mit dem kostenlosen Tarif. Wenn Sie mehr Dokumente oder Teammitglieder brauchen, wechseln Sie jederzeit in einen größeren [Tarif](/pricing).',
                },
                {
                  question: 'Ersetzt Taxful meine Steuerberatung?',
                  answer:
                    'Nein. Taxful erstellt und prüft E-Rechnungen. Steuerliche Entscheidungen treffen Sie gemeinsam mit Ihrer Steuerberatung.',
                },
              ],
            },
          ],
        ],
      },
      {
        title: 'Bereit für die E-Rechnung',
        tone: 'surface',
        columns: [
          [
            'Starten Sie kostenlos und erstellen oder prüfen Sie Ihre erste E-Rechnung noch heute. [Konto erstellen](/signup) oder [Tarife vergleichen](/pricing).',
          ],
        ],
      },
    ],
  },
  en: {
    eyebrow: 'Services',
    title: 'E-invoicing software for XRechnung and ZUGFeRD',
    subtitle:
      'Create, convert, receive and validate German e-invoices in one place – ready for mandatory e-invoicing from 2027.',
    seo: {
      title: 'E-invoicing software for Germany | Taxful',
      description:
        'Create, convert from PDF, receive and validate e-invoices: Taxful is e-invoicing software for XRechnung and ZUGFeRD in Germany. Start for free.',
    },
    sections: [
      {
        title: 'Our services',
        subtitle: 'Each service covers one step of working with e-invoices. Pick where to start.',
        columns: [[{ services: [] }]],
      },
      {
        layout: 'twoColumns',
        title: 'Mandatory e-invoicing at a glance',
        tone: 'surface',
        columns: [
          [
            `- **Since 1 January 2025:** every business in Germany must be able to receive e-invoices.
- **From 1 January 2027:** businesses with more than EUR 800,000 turnover in the previous year must issue them.
- **From 1 January 2028:** the obligation covers all invoices between domestic businesses.

Exceptions include invoices up to EUR 250 ([Section 33 UStDV](${sources.ustdv33})); businesses under the German small-business scheme (Kleinunternehmerregelung) may keep issuing other invoices ([Section 34a UStDV](${sources.ustdv34a})).`,
          ],
          [
            `### What this means for you

You need a tool that can read, validate and create XRechnung and ZUGFeRD. Taxful covers these steps without installing software or changing your accounting setup.

Sources: [Section 27(38) UStG](${sources.ustg27}) and the [German Federal Ministry of Finance FAQ](${sources.bmfFaq}). As of November 2026.`,
          ],
        ],
      },
      {
        layout: 'threeColumns',
        title: 'Why Taxful',
        columns: [
          [
            `### Validated files

Every XRechnung and ZUGFeRD file is validated with independent tools before download.`,
          ],
          [
            `### Nothing invented

Missing details are flagged. You review and complete them before an invoice is created.`,
          ],
          [
            `### One workflow for the team

Roles decide who uploads, reviews and approves. Originals stay unchanged and private.`,
          ],
        ],
      },
      {
        title: 'What Taxful is – and is not',
        tone: 'accent',
        columns: [
          [
            'Taxful is e-invoicing software, not tax advice. It does not submit anything to the tax office or through ELSTER and has no direct connection to accounting tools such as DATEV; you exchange files by upload and download.',
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
                  question: 'What is an e-invoice?',
                  answer:
                    'An invoice in a structured electronic format following EN 16931, such as XRechnung or ZUGFeRD. A plain PDF is not an e-invoice.',
                },
                {
                  question: 'When do I have to issue e-invoices?',
                  answer:
                    'From 2027 if your previous-year turnover exceeded EUR 800,000, otherwise from 2028. Receiving has been mandatory since 2025.',
                },
                {
                  question: 'Can I use Taxful for free?',
                  answer:
                    'Yes, on the free plan. Upgrade to a larger [plan](/pricing) whenever you need more documents or team members.',
                },
                {
                  question: 'Does Taxful replace my tax adviser?',
                  answer:
                    'No. Taxful creates and validates e-invoices; tax decisions remain with you and your adviser.',
                },
              ],
            },
          ],
        ],
      },
      {
        title: 'Ready for e-invoicing',
        tone: 'surface',
        columns: [
          [
            'Start for free and create or validate your first e-invoice today. [Create an account](/signup) or [compare plans](/pricing).',
          ],
        ],
      },
    ],
  },
}
