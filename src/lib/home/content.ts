import type { Home } from '@/payload-types'
import type { FlowProvider, HeroLabels } from '@/lib/home/types'
import { accountingProviders } from '@/lib/home/accounting-providers'
import { homeDefaults, type HomeLocale } from './defaults'

const text = (value: string | null | undefined, fallback: string) => value?.trim() || fallback

export function homeContent(
  home: Partial<Home>,
  locale: HomeLocale,
): { labels: HeroLabels; providers: FlowProvider[] } {
  const fallback = homeDefaults[locale]
  const providers = home.providers ?? accountingProviders.map(({ id }) => ({ provider: id }))
  const resolved = providers
    .flatMap((row, index): FlowProvider[] => {
      const builtin = accountingProviders.find(({ id }) => id === row.provider)
      if (builtin)
        return [
          {
            ...builtin,
            id: 'id' in row && row.id ? row.id : `${builtin.id}-${index}`,
            builtin: builtin.id,
            src: `/brands/accounting/${builtin.id}.svg`,
          },
        ]
      if (
        !('logo' in row) ||
        !row.logo ||
        typeof row.logo !== 'object' ||
        !row.logo.url ||
        !row.logo.mimeType?.startsWith('image/')
      )
        return []
      return [
        {
          id: row.id || `custom-${index}`,
          name: row.name?.trim() || row.logo.alt,
          src: row.logo.url,
          width: row.logo.width || 120,
          height: row.logo.height || 40,
        },
      ]
    })
    .slice(0, 6)

  return {
    providers: resolved,
    labels: {
      eyebrow: home.eyebrow?.trim() || '',
      title: home.title?.trim() || '',
      titleAccent: home.titleAccent?.trim() || '',
      description: home.description?.trim() || '',
      stepsLabel: fallback.stepsLabel,
      steps: [
        text(home.steps?.import, fallback.steps.import),
        text(home.steps?.review, fallback.steps.review),
        text(home.steps?.validate, fallback.steps.validate),
        text(home.steps?.export, fallback.steps.export),
      ],
      flow: {
        ...fallback.flow,
        sources: text(home.diagram?.sources, fallback.flow.sources),
        processing: text(home.diagram?.processing, fallback.flow.processing),
        customers: text(home.diagram?.customers, fallback.flow.customers),
        formats: text(home.diagram?.formats, fallback.flow.formats),
        taxOffice: text(home.diagram?.taxOffice, fallback.flow.taxOffice),
        taxSubmission: text(home.diagram?.taxSubmission, fallback.flow.taxSubmission),
      },
    },
  }
}
