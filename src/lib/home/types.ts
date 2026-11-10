import type { Home } from '@/payload-types'

export type InvoiceFlowLabels = {
  title: string
  description: string
  sources: string
  importMethod: string
  providerNote: string
  processing: string
  customers: string
  formats: string
  formatChip: string
  partners: string
  partnerFormats: string
  inbox: string
  inboxStorage: string
  report: string
  pause: string
  play: string
}

// A hero button as stored in the CMS; rendered only when its link is safe.
export type HeroAction = NonNullable<Home['actions']>[number]

export type HeroLabels = {
  eyebrow: string
  title: string
  titleAccent: string
  description: string
  stepsLabel: string
  newTab: string
  steps: readonly string[]
  flow: InvoiceFlowLabels
}

export type FlowProvider = {
  id: string
  name: string
  src: string
  width: number
  height: number
  builtin?: string
}
