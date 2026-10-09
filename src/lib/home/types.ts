export type InvoiceFlowLabels = {
  title: string
  description: string
  sources: string
  importMethod: string
  providerNote: string
  processing: string
  customers: string
  formats: string
  taxOffice: string
  taxSubmission: string
  planned: string
  pause: string
  play: string
}

export type HeroLabels = {
  eyebrow: string
  title: string
  titleAccent: string
  description: string
  stepsLabel: string
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
