import { workbookProject } from '../data/workbook'
import type { KtPoint, LoadItem, LoadSection, LoadSystem, PhaseKey, Project } from '../types'
import { PHASES } from '../types'

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function uid(prefix: string): string {
  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${suffix}`
}

export function normalizeItem(raw: Partial<LoadItem> & { active?: Partial<Record<PhaseKey, number>> }): LoadItem {
  const qty = Math.max(1, Number(raw.qty) || 1)
  const watt = Math.max(0, Number(raw.watt) || 0)
  const active = { boc: 0, cont: 0, eod: 0 } as Record<PhaseKey, number>
  for (const phase of PHASES) {
    active[phase.key] = Math.min(qty, Math.max(0, Number(raw.active?.[phase.key]) || 0))
  }
  return {
    id: raw.id || uid('item'),
    code: String(raw.code ?? ''),
    description: String(raw.description ?? 'Untitled load'),
    qty,
    watt,
    active,
    remark: raw.remark ?? null,
  }
}

function normalizeSection(raw: Partial<LoadSection>): LoadSection {
  return {
    id: raw.id || uid('sec'),
    code: String(raw.code ?? ''),
    name: String(raw.name ?? 'Untitled section'),
    items: Array.isArray(raw.items) ? raw.items.map(normalizeItem) : [],
  }
}

function normalizeSystem(raw: Partial<LoadSystem>): LoadSystem {
  return {
    id: raw.id || uid('sys'),
    code: String(raw.code ?? ''),
    name: String(raw.name ?? 'Untitled system'),
    doc: raw.doc ?? null,
    note: raw.note ?? null,
    items: Array.isArray(raw.items) ? raw.items.map(normalizeItem) : [],
    sections: Array.isArray(raw.sections) ? raw.sections.map(normalizeSection) : [],
  }
}

function numOr(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clampNum(value: unknown, fallback: number, min: number, max: number): number {
  return Math.min(Math.max(numOr(value, fallback), min), max)
}

export function normalizeProject(raw: Partial<Project>): Project {
  const base = clone(workbookProject)
  const sizing = { ...base.sizing, ...(raw.sizing ?? {}) }
  const rawKt = Array.isArray(sizing.ktTable) ? sizing.ktTable : base.sizing.ktTable
  const cleanedKt = rawKt
    .map((point: KtPoint) => ({ minutes: numOr(point.minutes, 0), kt: numOr(point.kt, 0) }))
    .filter(
      (point, index, list) =>
        point.minutes > 0 &&
        point.kt > 0 &&
        list.findIndex((other) => Math.abs(other.minutes - point.minutes) < 1e-6) === index,
    )
    .sort((a, b) => a.minutes - b.minutes)
  sizing.ktTable = cleanedKt.length >= 2 ? cleanedKt : base.sizing.ktTable
  sizing.catalog = Array.isArray(sizing.catalog) && sizing.catalog.length > 0
    ? [...sizing.catalog].map(Number).filter((n) => n > 0).sort((a, b) => a - b)
    : base.sizing.catalog

  sizing.nominalVoltage = clampNum(sizing.nominalVoltage, base.sizing.nominalVoltage, 12, 1000)
  sizing.minVoltage = clampNum(sizing.minVoltage, base.sizing.minVoltage, 6, sizing.nominalVoltage)
  sizing.autonomyMin = Math.round(clampNum(sizing.autonomyMin, base.sizing.autonomyMin, 3, 1440))
  sizing.agingFactor = clampNum(sizing.agingFactor, base.sizing.agingFactor, 0, 1)
  sizing.spareFactor = clampNum(sizing.spareFactor, base.sizing.spareFactor, 0, 2)
  sizing.tempFactor = clampNum(sizing.tempFactor, base.sizing.tempFactor, 0.5, 2)
  sizing.strings = Math.round(clampNum(sizing.strings, base.sizing.strings, 1, 8))
  sizing.selectedCellAh = clampNum(sizing.selectedCellAh, base.sizing.selectedCellAh, 0, 100000)
  sizing.redundancy = String(sizing.redundancy ?? base.sizing.redundancy)
  sizing.cellModel = String(sizing.cellModel ?? base.sizing.cellModel)
  sizing.ktSource = String(sizing.ktSource ?? base.sizing.ktSource)

  return {
    meta: { ...base.meta, ...(raw.meta ?? {}) },
    systems: Array.isArray(raw.systems) ? raw.systems.map(normalizeSystem) : base.systems,
    sizing,
    notes: Array.isArray(raw.notes) ? raw.notes : base.notes,
    references: Array.isArray(raw.references) ? raw.references : base.references,
  }
}

