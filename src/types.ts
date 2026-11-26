export type PhaseKey = 'boc' | 'cont' | 'eod'

export type PhaseActive = Record<PhaseKey, number>

export interface LoadItem {
  id: string
  code: string
  description: string
  qty: number
  watt: number
  active: PhaseActive
  remark?: string | null
}

export interface LoadSection {
  id: string
  code: string
  name: string
  items: LoadItem[]
}

export interface LoadSystem {
  id: string
  code: string
  name: string
  doc?: string | null
  note?: string | null
  items: LoadItem[]
  sections: LoadSection[]
}

export interface KtPoint {
  minutes: number
  kt: number
}

export interface SizingConfig {
  nominalVoltage: number
  minVoltage: number
  autonomyMin: number
  agingFactor: number
  spareFactor: number
  tempFactor: number
  strings: number
  redundancy: string
  selectedCellAh: number
  cellModel: string
  catalog: number[]
  ktTable: KtPoint[]
  ktSource: string
}

export interface Reference {
  tag: string
  desc: string
  doc: string
}

export interface ProjectMeta {
  title: string
  project: string
  subject: string
  docNo: string
  revision: string
  client: string
  preparedBy: string
  discipline: string
  date: string
}

export interface Project {
  meta: ProjectMeta
  systems: LoadSystem[]
  sizing: SizingConfig
  notes: string[]
  references: Reference[]
}

export interface PhaseMeta {
  key: PhaseKey
  short: string
  label: string
  window: string
  hint: string
}

export const PHASES: PhaseMeta[] = [
  {
    key: 'boc',
    short: 'BOC',
    label: 'Beginning of discharge',
    window: '0 – 1 min',
    hint: 'Short inrush window at the start of the discharge cycle',
  },
  {
    key: 'cont',
    short: 'CONT',
    label: 'Continuous',
    window: '1 – 239 min',
    hint: 'Steady load carried for the full autonomy period',
  },
  {
    key: 'eod',
    short: 'EOD',
    label: 'End of discharge',
    window: '239 – 240 min',
    hint: 'Switching and restoration load at the end of autonomy',
  },
]
