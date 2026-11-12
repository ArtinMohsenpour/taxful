import type { Payload, PayloadRequest } from 'payload'
import type { Home } from '../../payload-types'

function richText(paragraphs: string[]) {
  return {
    root: {
      type: 'root',
      version: 1,
      direction: null,
      format: '' as const,
      indent: 0,
      children: paragraphs.map((text) => ({
        type: 'paragraph',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [
          { type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' },
        ],
        textFormat: 0,
        textStyle: '',
      })),
    },
  }
}
const column = (...paragraphs: string[]) => {
  const text = richText(paragraphs)
  if (paragraphs.length > 1) Object.assign(text.root.children[0], { type: 'heading', tag: 'h3' })
  return { content: [{ type: 'text' as const, text }] }
}
type Sections = NonNullable<Home['sections']>

const content = {
  de: {
    services: {
      title: 'Ein klarer Weg zur E-Rechnung.',
      eyebrow: 'Leistungen',
      subtitle: 'Dokumente importieren, Angaben prüfen und strukturierte Rechnungen exportieren.',
      sections: [
        {
          blockType: 'threeColumns',
          title: 'Vom Dokument zum geprüften Export',
          tone: 'surface',
          column1: column(
            'Dokumente importieren',
            'Laden Sie unterstützte Dokumente in Ihren Unternehmensbereich. Strukturierte Rechnungsdaten werden zuerst gelesen; erkannte Angaben bleiben überprüfbar.',
          ),
          column2: column(
            'Gemeinsam prüfen',
            'Prüfen und korrigieren Sie Angaben vor der Freigabe. Fehlende und unsichere Informationen bleiben sichtbar.',
          ),
          column3: column(
            'E-Rechnungen exportieren',
            'Für unterstützte Rechnungen stehen validierte XRechnung- und ZUGFeRD-Exporte zur Verfügung.',
          ),
        },
        {
          blockType: 'fullWidth',
          title: 'Rechnungsformat und Steuererklärung sind getrennte Schritte.',
          tone: 'accent',
          column1: column(
            'XRechnung und ZUGFeRD sind E-Rechnungsformate. Eine direkte Übermittlung an ELSTER oder das Finanzamt ist noch nicht verfügbar.',
          ),
        },
      ],
    },
    about: {
      title: 'Mehr Klarheit für Ihre Rechnungen.',
      eyebrow: 'Über Taxful',
      subtitle:
        'Ein deutsch- und englischsprachiger Arbeitsbereich für Dokumente, Prüfung und E-Rechnungen.',
      sections: [
        {
          blockType: 'twoColumns',
          tone: 'surface',
          title: 'Ein nachvollziehbarer Ablauf',
          column1: column(
            'Taxful verbindet den Import Ihrer Dokumente mit der Prüfung und dem Export strukturierter Rechnungen. Originale, bearbeitete Angaben und freigegebene Ausgaben bleiben unterscheidbar.',
          ),
          column2: column(
            'Menschen behalten die Kontrolle.',
            'Automatisch erkannte Daten sind ein Ausgangspunkt. Sie prüfen fehlende Angaben, korrigieren Unsicherheiten und geben die Rechnung vor dem Export frei.',
          ),
        },
      ],
    },
    'how-it-works': {
      title: 'Schritt für Schritt zur E-Rechnung.',
      eyebrow: 'So funktioniert es',
      subtitle: 'Import, Prüfung, Validierung und Export in einem gemeinsamen Ablauf.',
      sections: [
        {
          blockType: 'threeColumns',
          tone: 'surface',
          column1: column(
            '01 — Importieren',
            'Laden Sie ein unterstütztes Dokument hoch oder erstellen Sie einen Rechnungsentwurf. Eingehende und ausgehende Rechnungen haben getrennte Abläufe.',
          ),
          column2: column(
            '02 — Prüfen und freigeben',
            'Vergleichen Sie die Angaben mit dem Original, ergänzen Sie fehlende Pflichtfelder und lassen Sie die Rechnung durch eine berechtigte Person freigeben.',
          ),
          column3: column(
            '03 — Validieren und exportieren',
            'Exportieren Sie unterstützte ausgehende Rechnungen als XRechnung oder ZUGFeRD. Die Ausgabe wird gegen das ausgewählte Profil geprüft.',
          ),
        },
        {
          blockType: 'fullWidth',
          tone: 'accent',
          title: 'Was kommt später?',
          column1: column(
            'Eine direkte Steuerübermittlung benötigt ein eigenes Verfahren und eine eigene Integration. Sie gehört noch nicht zum verfügbaren Rechnungsablauf.',
          ),
        },
      ],
    },
    faq: {
      title: 'Ihre Fragen. Klare Antworten.',
      eyebrow: 'Häufige Fragen',
      subtitle: 'Das Wichtigste zu Dokumenten, Prüfung und Export.',
      sections: [
        {
          blockType: 'fullWidth',
          tone: 'surface',
          title: 'Welche Ausgaben werden unterstützt?',
          column1: column(
            'Unterstützte Standardrechnungen können als XRechnung 3.0.2 UBL oder ZUGFeRD EN16931 exportiert werden. Pflichtangaben und das jeweilige Zielprofil werden geprüft.',
          ),
        },
        {
          blockType: 'fullWidth',
          tone: 'surface',
          title: 'Wer prüft die erkannten Daten?',
          column1: column(
            'Sie prüfen die erkannten Angaben im Unternehmensbereich. Berechtigte Inhaber, Administratoren und Prüfer können ausgehende Rechnungen freigeben und exportieren.',
          ),
        },
        {
          blockType: 'fullWidth',
          tone: 'accent',
          title: 'Sendet Taxful Daten direkt an das Finanzamt?',
          column1: column(
            'Noch nicht. E-Rechnungen und Steuerübermittlungen sind unterschiedliche Abläufe. Die direkte ELSTER-Integration ist geplant.',
          ),
        },
      ],
    },
    contact: {
      title: 'Sprechen wir über Ihre Fragen.',
      eyebrow: 'Kontakt',
      subtitle: 'Schreiben Sie uns eine Nachricht über das Kontaktformular.',
      sections: [],
    },
    privacy: { title: 'Datenschutz', eyebrow: null, subtitle: null, sections: [] },
    terms: { title: 'Nutzungsbedingungen', eyebrow: null, subtitle: null, sections: [] },
    impressum: { title: 'Impressum', eyebrow: null, subtitle: null, sections: [] },
  },
  en: {
    services: {
      title: 'A clear path to e-invoicing.',
      eyebrow: 'Services',
      subtitle: 'Import documents, review the details and export structured invoices.',
      sections: [
        {
          blockType: 'threeColumns',
          title: 'From document to validated export',
          tone: 'surface',
          column1: column(
            'Import documents',
            'Upload supported documents to your company workspace. Existing structured invoice data is read first, and extracted details remain available for review.',
          ),
          column2: column(
            'Review together',
            'Check and correct the details before approval. Missing and uncertain information stays visible.',
          ),
          column3: column(
            'Export e-invoices',
            'Validated XRechnung and ZUGFeRD exports are available for supported invoices.',
          ),
        },
        {
          blockType: 'fullWidth',
          title: 'Invoice formats and tax returns are separate steps.',
          tone: 'accent',
          column1: column(
            'XRechnung and ZUGFeRD are e-invoice formats. Direct submission to ELSTER or the tax office is not available yet.',
          ),
        },
      ],
    },
    about: {
      title: 'More clarity for your invoices.',
      eyebrow: 'About Taxful',
      subtitle: 'A German and English workspace for documents, review and e-invoicing.',
      sections: [
        {
          blockType: 'twoColumns',
          tone: 'surface',
          title: 'A process you can follow',
          column1: column(
            'Taxful connects document import with the review and export of structured invoices. Originals, edited details and approved outputs remain separate and traceable.',
          ),
          column2: column(
            'People stay in control.',
            'Automatically extracted data is a starting point. You review missing details, resolve uncertainties and approve the invoice before export.',
          ),
        },
      ],
    },
    'how-it-works': {
      title: 'Step by step to an e-invoice.',
      eyebrow: 'How it works',
      subtitle: 'Import, review, validation and export in one shared workflow.',
      sections: [
        {
          blockType: 'threeColumns',
          tone: 'surface',
          column1: column(
            '01 — Import',
            'Upload a supported document or create an invoice draft. Incoming and outgoing invoices follow separate workflows.',
          ),
          column2: column(
            '02 — Review and approve',
            'Compare the details with the original, complete missing required fields and have an authorized person approve the invoice.',
          ),
          column3: column(
            '03 — Validate and export',
            'Export supported outgoing invoices as XRechnung or ZUGFeRD. The output is checked against the selected profile.',
          ),
        },
        {
          blockType: 'fullWidth',
          tone: 'accent',
          title: 'What comes later?',
          column1: column(
            'Direct tax submission needs a separate procedure and integration. It is not part of the available invoice workflow yet.',
          ),
        },
      ],
    },
    faq: {
      title: 'Your questions. Clear answers.',
      eyebrow: 'Frequently asked questions',
      subtitle: 'The essentials about documents, review and export.',
      sections: [
        {
          blockType: 'fullWidth',
          tone: 'surface',
          title: 'Which outputs are supported?',
          column1: column(
            'Supported standard invoices can be exported as XRechnung 3.0.2 UBL or ZUGFeRD EN16931. Required details and the selected target profile are checked.',
          ),
        },
        {
          blockType: 'fullWidth',
          tone: 'surface',
          title: 'Who reviews the extracted data?',
          column1: column(
            'You review extracted details in your company workspace. Authorized owners, administrators and reviewers can approve and export outgoing invoices.',
          ),
        },
        {
          blockType: 'fullWidth',
          tone: 'accent',
          title: 'Does Taxful send data directly to the tax office?',
          column1: column(
            'Not yet. E-invoices and tax submissions are separate workflows. Direct ELSTER integration is planned.',
          ),
        },
      ],
    },
    contact: {
      title: 'Let’s talk about your questions.',
      eyebrow: 'Contact us',
      subtitle: 'Send us a message using the contact form.',
      sections: [],
    },
    privacy: { title: 'Privacy', eyebrow: null, subtitle: null, sections: [] },
    terms: { title: 'Terms of use', eyebrow: null, subtitle: null, sections: [] },
    impressum: { title: 'Legal notice', eyebrow: null, subtitle: null, sections: [] },
  },
} satisfies Record<
  'de' | 'en',
  Record<
    string,
    { title: string; eyebrow: string | null; subtitle: string | null; sections: Sections }
  >
>

// Page globals written by seedWebsite; starter content checks they are untouched.
export const websiteSeedGlobals = Object.keys(content.de) as (keyof typeof content.de)[]

export async function seedWebsite(payload: Payload, req: Partial<PayloadRequest>) {
  const form = await payload.create({
    collection: 'website-forms',
    overrideAccess: true,
    req,
    locale: 'de',
    data: {
      name: 'Contact',
      enabled: true,
      _status: 'published',
      title: 'Ihre Nachricht',
      submitLabel: 'Nachricht senden',
      successMessage: 'Vielen Dank. Ihre Nachricht wurde gespeichert.',
      fields: [
        { key: 'name', type: 'text', label: 'Name', required: true },
        { key: 'email', type: 'email', label: 'E-Mail', required: true },
        {
          key: 'message',
          type: 'textarea',
          label: 'Nachricht',
          required: true,
          help: 'Bitte keine Steuerunterlagen, Zugangsdaten oder sensiblen persönlichen Daten senden.',
        },
      ],
    },
  })
  await payload.update({
    collection: 'website-forms',
    id: form.id,
    overrideAccess: true,
    req,
    locale: 'en',
    data: {
      _status: 'published',
      title: 'Your message',
      submitLabel: 'Send message',
      successMessage: 'Thank you. Your message has been saved.',
      fields: form.fields.map((field) => ({
        ...field,
        label: field.key === 'name' ? 'Name' : field.key === 'email' ? 'Email' : 'Message',
        help:
          field.key === 'message'
            ? 'Please do not send tax documents, credentials or sensitive personal data.'
            : null,
      })),
    },
  })
  for (const locale of ['de', 'en'] as const) {
    for (const slug of Object.keys(content[locale]) as (keyof typeof content.de)[]) {
      const data = content[locale][slug]
      const sections: Sections =
        slug === 'contact'
          ? [
              {
                blockType: 'twoColumns',
                alignment: 'top',
                tone: 'plain',
                column1: column(
                  locale === 'de'
                    ? 'Wir helfen Ihnen beim nächsten Schritt.'
                    : 'We can help with your next step.',
                  locale === 'de'
                    ? 'Nutzen Sie das Formular für allgemeine Fragen zu Taxful. Für Rechnungen und private Dokumente verwenden Sie bitte Ihren geschützten Unternehmensbereich.'
                    : 'Use this form for general questions about Taxful. Please use your protected company workspace for invoices and private documents.',
                ),
                column2: { content: [{ type: 'form', form: form.id }] },
              },
            ]
          : data.sections
      const legal = ['privacy', 'terms', 'impressum'].includes(slug)
      await payload.updateGlobal({
        slug,
        locale,
        overrideAccess: true,
        req,
        draft: legal,
        data: { ...data, sections, _status: legal ? 'draft' : 'published' },
      })
    }
  }
}
