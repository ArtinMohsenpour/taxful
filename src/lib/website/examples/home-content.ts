import type { Home } from '@/payload-types'
import type { WebsiteLocale } from '../catalog'

export const EXAMPLE_BLOCK_PREFIX = 'Sample — '

function text(heading: string, paragraphs: string[]) {
  const node = (value: string, type: 'heading' | 'paragraph') => ({
    type,
    version: 1,
    direction: null,
    format: '',
    indent: 0,
    ...(type === 'heading' ? { tag: 'h3' } : {}),
    children: [
      { type: 'text', version: 1, text: value, format: 0, detail: 0, mode: 'normal', style: '' },
    ],
  })
  return {
    type: 'text' as const,
    text: {
      root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '' as const,
        indent: 0,
        children: [
          ...(heading ? [node(heading, 'heading')] : []),
          ...paragraphs.map((value) => node(value, 'paragraph')),
        ],
      },
    },
  }
}

const copy = {
  de: {
    introduction: 'Mehr Klarheit. Weniger Umwege.',
    intro:
      'Bringen Sie Ihre Dokumente, die Prüfung und den strukturierten Rechnungsexport in einen gemeinsamen Ablauf.',
    imageTitle: 'Aus Dokumenten werden nachvollziehbare Schritte.',
    imageBody:
      'Importieren Sie unterstützte Dokumente, prüfen Sie die erkannten Angaben und exportieren Sie freigegebene Rechnungen im passenden Format.',
    imageAlt: 'Eine Rechnung wird zur Prüfung an ein Symbol mit Häkchen weitergegeben.',
    steps: 'Ihr nächster Schritt ist immer sichtbar.',
    cards: [
      [
        '01 — Importieren',
        'Laden Sie unterstützte Dokumente hoch oder erstellen Sie einen Rechnungsentwurf. Das Original bleibt nachvollziehbar.',
      ],
      [
        '02 — Prüfen',
        'Vergleichen und korrigieren Sie die Angaben. Fehlende oder unsichere Informationen bleiben sichtbar.',
      ],
      [
        '03 — Exportieren',
        'Berechtigte Personen geben ausgehende Rechnungen frei. Unterstützte Exporte werden gegen das ausgewählte Profil validiert.',
      ],
    ],
    contact: 'Ein kurzer Einblick. Ein persönlicher Kontakt.',
    videoTitle: 'Vom Dokument zum geprüften Rechnungsexport',
    videoCaption: 'Import, Prüfung und Export – als einfache Illustration ohne Ton.',
    transcript:
      'Ein Dokument durchläuft nacheinander drei Stationen: Import, menschliche Prüfung und Export. Eine animierte Verbindung zeigt die Reihenfolge. Die Illustration zeigt keinen echten Kundenbeleg.',
  },
  en: {
    introduction: 'More clarity. Fewer detours.',
    intro: 'Bring your documents, review and structured invoice exports into one shared workflow.',
    imageTitle: 'Turn documents into a process you can follow.',
    imageBody:
      'Import supported documents, review the extracted details and export approved invoices in the appropriate format.',
    imageAlt: 'An invoice moves to a review symbol with a check mark.',
    steps: 'Your next step stays visible.',
    cards: [
      [
        '01 — Import',
        'Upload supported documents or create an invoice draft. The original remains traceable.',
      ],
      [
        '02 — Review',
        'Compare and correct the details. Missing or uncertain information stays visible.',
      ],
      [
        '03 — Export',
        'Authorized people approve outgoing invoices. Supported exports are validated against the selected profile.',
      ],
    ],
    contact: 'A quick look. A personal conversation.',
    videoTitle: 'From document to reviewed invoice export',
    videoCaption: 'Import, review and export — a simple illustration without audio.',
    transcript:
      'A document moves through three stages: import, human review and export. An animated connection shows their order. This illustration contains no real customer document.',
  },
}

export function homeExampleSections(
  locale: WebsiteLocale,
  assets: { image: number; video: number; form: number },
): NonNullable<Home['sections']> {
  const t = copy[locale]
  return [
    {
      blockType: 'fullWidth',
      blockName: `${EXAMPLE_BLOCK_PREFIX}100% · text`,
      tone: 'accent',
      title: t.introduction,
      column1: { content: [text('', [t.intro])] },
    },
    {
      blockType: 'twoColumns',
      blockName: `${EXAMPLE_BLOCK_PREFIX}50/50 · image + text`,
      tone: 'surface',
      alignment: 'center',
      column1: {
        content: [
          { type: 'image', image: assets.image, imageAlt: t.imageAlt, imageFit: 'landscape' },
        ],
      },
      column2: { content: [text(t.imageTitle, [t.imageBody])] },
    },
    {
      blockType: 'threeColumns',
      blockName: `${EXAMPLE_BLOCK_PREFIX}thirds · text`,
      tone: 'plain',
      title: t.steps,
      column1: { content: [text(t.cards[0][0], [t.cards[0][1]])] },
      column2: { content: [text(t.cards[1][0], [t.cards[1][1]])] },
      column3: { content: [text(t.cards[2][0], [t.cards[2][1]])] },
    },
    {
      blockType: 'twoColumns',
      blockName: `${EXAMPLE_BLOCK_PREFIX}50/50 · video + form`,
      tone: 'surface',
      title: t.contact,
      column1: {
        content: [
          {
            type: 'video',
            video: assets.video,
            poster: assets.image,
            videoTitle: t.videoTitle,
            caption: t.videoCaption,
            transcript: text('', [t.transcript]).text,
          },
        ],
      },
      column2: { content: [{ type: 'form', form: assets.form }] },
    },
  ]
}
