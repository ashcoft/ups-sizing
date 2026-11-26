import type { KtPoint, LoadItem, LoadSection, LoadSystem, PhaseKey, SizingConfig } from '../types'

export const TRANSIENT_MIN = 1

export interface Totals {
  connectedW: number
  bocW: number
  contW: number
  eodW: number
  items: number
}

export function itemConnectedW(item: LoadItem): number {
  return item.qty * item.watt
}

/**
 * Units actually drawing in a window. Active counts can briefly exceed the panel
 * quantity while the quantity input is being edited, so clamp at read time.
 */
export function activeUnits(item: LoadItem, phase: PhaseKey): number {
  return Math.min(Math.max(item.active[phase] || 0, 0), Math.max(item.qty, 0))
}

export function itemPhaseW(item: LoadItem, phase: PhaseKey): number {
  return activeUnits(item, phase) * item.watt
}

export function allItems(system: LoadSystem): LoadItem[] {
  return [...system.items, ...system.sections.flatMap((section) => section.items)]
}

function emptyTotals(): Totals {
  return { connectedW: 0, bocW: 0, contW: 0, eodW: 0, items: 0 }
}

function addItem(totals: Totals, item: LoadItem): void {
  totals.connectedW += itemConnectedW(item)
  totals.bocW += itemPhaseW(item, 'boc')
  totals.contW += itemPhaseW(item, 'cont')
  totals.eodW += itemPhaseW(item, 'eod')
  totals.items += 1
}

function merge(a: Totals, b: Totals): Totals {
  return {
    connectedW: a.connectedW + b.connectedW,
    bocW: a.bocW + b.bocW,
    contW: a.contW + b.contW,
    eodW: a.eodW + b.eodW,
    items: a.items + b.items,
  }
}

export function sectionTotals(section: LoadSection): Totals {
  const totals = emptyTotals()
  for (const item of section.items) addItem(totals, item)
  return totals
}

export function systemTotals(system: LoadSystem): Totals {
  let totals = emptyTotals()
  for (const item of system.items) addItem(totals, item)
  for (const section of system.sections) totals = merge(totals, sectionTotals(section))
  return totals
}

export function computeTotals(systems: LoadSystem[]): Totals {
  let totals = emptyTotals()
  for (const system of systems) totals = merge(totals, systemTotals(system))
  return totals
}

/**
 * Interpolate the discharge-capacity factor Kt at a given duration.
 * The manufacturer table is sampled in log–log space, which keeps the
 * curve smooth and monotonic between published points.
 */
export function usableKtPoints(table: KtPoint[]): KtPoint[] {
  return table
    .filter((p) => Number.isFinite(p.minutes) && Number.isFinite(p.kt) && p.minutes > 0 && p.kt > 0)
    .sort((a, b) => a.minutes - b.minutes)
}

export function ktAt(table: KtPoint[], minutes: number): number {
  const points = usableKtPoints(table)
  if (points.length === 0) return 1
  const t = Math.max(minutes, 1e-6)
  if (t <= points[0].minutes) return points[0].kt
  if (t >= points[points.length - 1].minutes) return points[points.length - 1].kt

  for (let i = 1; i < points.length; i += 1) {
    const hi = points[i]
    const lo = points[i - 1]
    if (t <= hi.minutes) {
      const span = Math.log(hi.minutes) - Math.log(lo.minutes)
      const ratio = span === 0 ? 0 : (Math.log(t) - Math.log(lo.minutes)) / span
      return Math.exp(Math.log(lo.kt) + ratio * (Math.log(hi.kt) - Math.log(lo.kt)))
    }
  }
  return points[points.length - 1].kt
}

export interface ProfilePeriod {
  index: number
  phase: PhaseKey
  startMin: number
  endMin: number
  loadW: number
  loadA: number
}

export function buildProfile(totals: Totals, config: SizingConfig, autonomy = config.autonomyMin): ProfilePeriod[] {
  const duration = Math.max(autonomy, TRANSIENT_MIN * 3)
  const transient = TRANSIENT_MIN
  const steadyEnd = duration - transient
  const voltage = Math.max(config.minVoltage, 1)
  const periods: ProfilePeriod[] = [
    { index: 0, phase: 'boc', startMin: 0, endMin: transient, loadW: totals.bocW, loadA: totals.bocW / voltage },
    { index: 1, phase: 'cont', startMin: transient, endMin: steadyEnd, loadW: totals.contW, loadA: totals.contW / voltage },
    { index: 2, phase: 'eod', startMin: steadyEnd, endMin: duration, loadW: totals.eodW, loadA: totals.eodW / voltage },
  ]
  return periods.filter((period) => period.endMin > period.startMin)
}

export interface SectionTerm {
  label: string
  phase: PhaseKey
  dLoadW: number
  dLoadA: number
  ktAtMin: number
  kt: number
  ah: number
}

export interface SectionResult {
  index: number
  phase: PhaseKey
  startMin: number
  endMin: number
  loadW: number
  loadA: number
  terms: SectionTerm[]
  ah: number
}

export interface SizingResult {
  periods: ProfilePeriod[]
  sections: SectionResult[]
  maxSectionAh: number
  governingIndex: number
  requiredAh: number
  selectedAh: number
  headroomPct: number
  marginFactor: number
  energyWh: number
  avgCurrentA: number
  peakCurrentA: number
  designCurrentA: number
  cRate: number
  cellsPerString: number
  endCellVoltage: number
  autonomyMin: number
  ktPoints: number
  maxKtMinutes: number
  maxDutyDuration: number
  durationCovered: boolean
}

export function computeSizing(totals: Totals, config: SizingConfig, autonomy = config.autonomyMin): SizingResult {
  const periods = buildProfile(totals, config, autonomy)
  const voltage = Math.max(config.minVoltage, 1)
  const sections: SectionResult[] = []

  let previousLoadA = 0
  let previousLoadW = 0
  const deltas: { dLoadA: number; dLoadW: number; startMin: number; phase: PhaseKey }[] = []

  for (const period of periods) {
    deltas.push({
      dLoadA: period.loadA - previousLoadA,
      dLoadW: period.loadW - previousLoadW,
      startMin: period.startMin,
      phase: period.phase,
    })
    previousLoadA = period.loadA
    previousLoadW = period.loadW

    const terms: SectionTerm[] = deltas.map((delta) => {
      const remaining = period.endMin - delta.startMin
      const ktAtMin = Math.max(remaining, 1e-6)
      const kt = ktAt(config.ktTable, ktAtMin)
      return {
        label: `${delta.phase.toUpperCase()} @ ${delta.startMin} min`,
        phase: delta.phase,
        dLoadW: delta.dLoadW,
        dLoadA: delta.dLoadA,
        ktAtMin,
        kt,
        ah: delta.dLoadA * kt,
      }
    })

    sections.push({
      index: period.index,
      phase: period.phase,
      startMin: period.startMin,
      endMin: period.endMin,
      loadW: period.loadW,
      loadA: period.loadA,
      terms,
      ah: terms.reduce((sum, term) => sum + term.ah, 0),
    })
  }

  const maxSectionAh = sections.reduce((max, section) => Math.max(max, section.ah), 0)
  const governingIndex = sections.findIndex((section) => section.ah === maxSectionAh)
  const marginFactor =
    (1 + Math.max(config.agingFactor, 0)) *
    (1 + Math.max(config.spareFactor, 0)) *
    Math.max(config.tempFactor, 0.01)
  const requiredAh = maxSectionAh * marginFactor

  const energyWh = periods.reduce((sum, period) => sum + period.loadW * ((period.endMin - period.startMin) / 60), 0)
  const peakCurrentA = periods.reduce((max, period) => Math.max(max, period.loadA), 0)
  const cellsPerString = Math.max(1, Math.round(config.nominalVoltage / 2))

  const usable = usableKtPoints(config.ktTable)
  const maxKtMinutes = usable.length > 0 ? usable[usable.length - 1].minutes : 0
  const maxDutyDuration = sections.reduce(
    (max, section) => section.terms.reduce((inner, term) => Math.max(inner, term.ktAtMin), max),
    0,
  )
  const durationCovered = usable.length >= 2 && maxDutyDuration <= maxKtMinutes + 1e-6

  return {
    periods,
    sections,
    maxSectionAh,
    governingIndex: governingIndex < 0 ? 0 : governingIndex,
    requiredAh,
    selectedAh: config.selectedCellAh,
    headroomPct: config.selectedCellAh > 0 ? (config.selectedCellAh / requiredAh - 1) * 100 : 0,
    marginFactor,
    energyWh,
    avgCurrentA: energyWh / Math.max(autonomy / 60, 1e-6) / voltage,
    peakCurrentA,
    designCurrentA: totals.contW / voltage,
    cRate: config.selectedCellAh > 0 ? totals.contW / voltage / config.selectedCellAh : 0,
    cellsPerString,
    endCellVoltage: voltage / cellsPerString,
    autonomyMin: autonomy,
    ktPoints: usable.length,
    maxKtMinutes,
    maxDutyDuration,
    durationCovered,
  }
}

export interface AutonomyPoint {
  minutes: number
  requiredAh: number
  energyWh: number
}

export function autonomySweep(totals: Totals, config: SizingConfig, from = 30, to = 480, step = 15): AutonomyPoint[] {
  const design = Math.min(Math.max(config.autonomyMin, 3), 1440)
  const start = Math.min(from, design)
  const end = Math.max(to, design)
  // Keep the chart to a bounded number of sizing runs even for extreme inputs.
  const safeStep = Math.max(step, (end - start) / 200)
  const points: AutonomyPoint[] = []
  for (let minutes = start; minutes <= end + 1e-6 && points.length < 220; minutes += safeStep) {
    const rounded = Math.round(minutes * 10) / 10
    const result = computeSizing(totals, config, rounded)
    points.push({ minutes: rounded, requiredAh: result.requiredAh, energyWh: result.energyWh })
  }
  if (!points.some((point) => point.minutes === design)) {
    const result = computeSizing(totals, config, design)
    points.push({ minutes: design, requiredAh: result.requiredAh, energyWh: result.energyWh })
    points.sort((a, b) => a.minutes - b.minutes)
  }
  return points
}

export function smallestStandard(catalog: number[], requiredAh: number): number | null {
  const sorted = [...catalog].sort((a, b) => a - b)
  return sorted.find((capacity) => capacity >= requiredAh) ?? null
}

export interface SizingCheck {
  key: string
  label: string
  detail: string
  ok: boolean
  required: boolean
}

export function projectChecks(result: SizingResult, config: SizingConfig): SizingCheck[] {
  return [
    {
      key: 'capacity',
      label: 'Selected cell covers the calculated duty',
      detail: `${config.selectedCellAh} Ah selected vs ${result.requiredAh.toFixed(1)} Ah required`,
      ok: result.requiredAh > 0 && config.selectedCellAh >= result.requiredAh,
      required: true,
    },
    {
      key: 'kt-coverage',
      label: 'Discharge data covers every duty duration',
      detail:
        result.ktPoints < 2
          ? 'Kt table needs at least two valid points'
          : `Table covers up to ${result.maxKtMinutes} min; duty reaches ${result.maxDutyDuration.toFixed(0)} min`,
      ok: result.durationCovered,
      required: true,
    },
    {
      key: 'end-voltage',
      label: 'End-cell voltage within manufacturer limits',
      detail: `${result.endCellVoltage.toFixed(2)} V/cell across ${result.cellsPerString} cells`,
      ok: result.endCellVoltage >= 1.75 && result.endCellVoltage <= 1.85,
      required: true,
    },
    {
      key: 'c-rate',
      label: 'Discharge rate within battery capability',
      detail: `${result.cRate.toFixed(3)} C continuous`,
      ok: result.cRate <= 0.5,
      required: true,
    },
    {
      key: 'autonomy',
      label: 'Discharge profile spans the full autonomy window',
      detail: `${result.autonomyMin} min at ${config.minVoltage.toFixed(0)} V minimum`,
      ok: result.periods.length === 3 && Math.abs((result.periods[result.periods.length - 1]?.endMin ?? 0) - result.autonomyMin) < 0.01,
      required: true,
    },
    {
      key: 'redundancy',
      label: 'Battery configuration provides redundancy',
      detail: `${config.redundancy} — ${config.strings} parallel strings`,
      ok: config.strings >= 2,
      required: false,
    },
    {
      key: 'margin',
      label: 'Aging and spare allowances applied',
      detail: `${(config.agingFactor * 100).toFixed(0)}% aging + ${(config.spareFactor * 100).toFixed(0)}% spare`,
      ok: config.agingFactor > 0 && config.spareFactor > 0,
      required: false,
    },
  ]
}
