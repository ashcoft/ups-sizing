import { computed, ref, watch } from 'vue'
import { workbookProject } from './data/workbook'
import type { KtPoint, LoadItem, LoadSection, LoadSystem, PhaseKey, Project } from './types'
import { PHASES } from './types'
import { allItems, autonomySweep, computeSizing, computeTotals, projectChecks, systemTotals, type Totals } from './lib/sizing'
import { download, csvCell, fmt, fmtMinutes } from './lib/format'
import { systemColor } from './lib/palette'

const STORAGE_KEY = 'dcups.project.v1'
const THEME_KEY = 'dcups.theme'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function uid(prefix: string): string {
  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${suffix}`
}

function normalizeItem(raw: Partial<LoadItem> & { active?: Partial<Record<PhaseKey, number>> }): LoadItem {
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
  sizing.ktTable = Array.isArray(sizing.ktTable) && sizing.ktTable.length > 1
    ? [...sizing.ktTable]
        .map((point: KtPoint) => ({ minutes: Number(point.minutes) || 0, kt: Number(point.kt) || 0 }))
        .sort((a, b) => a.minutes - b.minutes)
    : base.sizing.ktTable
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
    systems: Array.isArray(raw.systems) && raw.systems.length > 0 ? raw.systems.map(normalizeSystem) : base.systems,
    sizing,
    notes: Array.isArray(raw.notes) ? raw.notes : base.notes,
    references: Array.isArray(raw.references) ? raw.references : base.references,
  }
}

function loadInitialProject(): Project {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return normalizeProject(JSON.parse(stored))
  } catch {
    /* corrupted or unavailable storage falls back to the workbook */
  }
  return clone(workbookProject)
}

export const project = ref<Project>(loadInitialProject())

export const totals = computed<Totals>(() => computeTotals(project.value.systems))

export const sizing = computed(() => computeSizing(totals.value, project.value.sizing))

export const autonomyCurve = computed(() => autonomySweep(totals.value, project.value.sizing))

export const checks = computed(() => projectChecks(sizing.value, project.value.sizing))

export const systemRows = computed(() =>
  project.value.systems.map((system, index) => ({
    system,
    totals: systemTotals(system),
    color: systemColor(index),
  })),
)

export const itemCount = computed(() =>
  project.value.systems.reduce((count, system) => count + allItems(system).length, 0),
)

export const checksPassed = computed(() => checks.value.filter((check) => check.ok).length)

export const requiredAh = computed(() => sizing.value.requiredAh)

/* ── persistence ──────────────────────────────────────────── */

export const lastSaved = ref<number | null>(null)

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project.value))
    lastSaved.value = Date.now()
  } catch {
    /* storage full or blocked — the session still works in memory */
  }
}

watch(project, persist, { deep: true })

/* ── theme ────────────────────────────────────────────────── */

function initialTheme(): 'light' | 'dark' {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* ignore */
  }
  return 'light'
}

export const theme = ref<'light' | 'dark'>(initialTheme())

watch(
  theme,
  (value) => {
    document.documentElement.dataset.theme = value
    try {
      localStorage.setItem(THEME_KEY, value)
    } catch {
      /* ignore */
    }
  },
  { immediate: true },
)

export function toggleTheme(): void {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
}

/* ── toasts ───────────────────────────────────────────────── */

export interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

export const toasts = ref<Toast[]>([])
let toastId = 0

export function dismissToast(id: number): void {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

export function notify(text: string, action?: Toast['action']): void {
  const id = (toastId += 1)
  toasts.value = [...toasts.value, { id, text, action }]
  window.setTimeout(() => dismissToast(id), action ? 7000 : 2800)
}

/* ── navigation ───────────────────────────────────────────── */

export type ViewKey = 'overview' | 'loads' | 'sizing' | 'report'

const validViews: ViewKey[] = ['overview', 'loads', 'sizing', 'report']

function viewFromHash(): ViewKey {
  const raw = window.location.hash.replace(/^#\/?/, '')
  return (validViews as string[]).includes(raw) ? (raw as ViewKey) : 'overview'
}

export const view = ref<ViewKey>(viewFromHash())

export function go(next: ViewKey): void {
  view.value = next
  if (window.location.hash !== `#/${next}`) window.location.hash = `#/${next}`
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    view.value = viewFromHash()
  })
}

/* ── project actions ──────────────────────────────────────── */

function locateItem(itemId: string): { list: LoadItem[]; index: number } | null {
  for (const system of project.value.systems) {
    const direct = system.items.findIndex((item) => item.id === itemId)
    if (direct >= 0) return { list: system.items, index: direct }
    for (const section of system.sections) {
      const index = section.items.findIndex((item) => item.id === itemId)
      if (index >= 0) return { list: section.items, index }
    }
  }
  return null
}

export function addSystem(): void {
  const index = project.value.systems.length + 1
  project.value.systems.push({
    id: uid('sys'),
    code: String(index),
    name: 'New switchboard',
    doc: null,
    note: null,
    items: [],
    sections: [
      {
        id: uid('sec'),
        code: `${index}.1`,
        name: 'INCOMER',
        items: [normalizeItem({ code: `${index}.1.1`, description: 'New load', qty: 1, watt: 10 })],
      },
    ],
  })
  notify('System added')
}

export function addSection(systemId: string): void {
  const system = project.value.systems.find((entry) => entry.id === systemId)
  if (!system) return
  const index = system.sections.length + 1
  system.sections.push({
    id: uid('sec'),
    code: `${system.code}.${index}`,
    name: 'NEW SECTION',
    items: [normalizeItem({ code: `${system.code}.${index}.1`, description: 'New load', qty: 1, watt: 10 })],
  })
  notify('Section added')
}

export function addItem(systemId: string, sectionId?: string): void {
  const system = project.value.systems.find((entry) => entry.id === systemId)
  if (!system) return
  const container = sectionId ? system.sections.find((section) => section.id === sectionId) : undefined
  const target = container ? container.items : system.items
  const code = container ? `${container.code}.${target.length + 1}` : `${system.code}.${target.length + 1}`
  target.push(normalizeItem({ code, description: 'New load', qty: 1, watt: 10 }))
  notify('Load added')
}

export function duplicateItem(itemId: string): void {
  const found = locateItem(itemId)
  if (!found) return
  const source = found.list[found.index]
  found.list.splice(found.index + 1, 0, {
    ...clone(source),
    id: uid('item'),
    code: `${source.code}-copy`,
  })
  notify('Load duplicated')
}

export function removeItem(itemId: string): void {
  const found = locateItem(itemId)
  if (!found) return
  const [removed] = found.list.splice(found.index, 1)
  notify('Load removed', {
    label: 'Undo',
    run: () => {
      found.list.splice(Math.min(found.index, found.list.length), 0, removed)
      notify('Load restored')
    },
  })
}

export function removeSection(systemId: string, sectionId: string): void {
  const system = project.value.systems.find((entry) => entry.id === systemId)
  if (!system) return
  const index = system.sections.findIndex((section) => section.id === sectionId)
  if (index < 0) return
  const [removed] = system.sections.splice(index, 1)
  notify('Section removed', {
    label: 'Undo',
    run: () => {
      system.sections.splice(Math.min(index, system.sections.length), 0, removed)
      notify('Section restored')
    },
  })
}

export function removeSystem(systemId: string): void {
  const index = project.value.systems.findIndex((system) => system.id === systemId)
  if (index < 0) return
  const [removed] = project.value.systems.splice(index, 1)
  notify('System removed', {
    label: 'Undo',
    run: () => {
      project.value.systems.splice(Math.min(index, project.value.systems.length), 0, removed)
      notify('System restored')
    },
  })
}

export function resetProject(): void {
  project.value = clone(workbookProject)
  notify('Restored workbook baseline')
}

export function exportProjectJson(): void {
  download(`${project.value.meta.docNo}.json`, JSON.stringify(project.value, null, 2))
  notify('Project JSON exported')
}

export function exportProjectCsv(): void {
  const rows: string[] = [
    ['System', 'Section', 'Item', 'Description', 'Qty', 'W/unit', 'Connected (W)', 'BOC (W)', 'CONT (W)', 'EOD (W)', 'Remark']
      .map(csvCell)
      .join(','),
  ]
  for (const system of project.value.systems) {
    const groups: { name: string; items: LoadItem[] }[] = [
      { name: '—', items: system.items },
      ...system.sections.map((section) => ({ name: `${section.code} ${section.name}`, items: section.items })),
    ]
    for (const group of groups) {
      for (const item of group.items) {
        rows.push(
          [
            system.name,
            group.name,
            item.code,
            item.description,
            item.qty,
            item.watt,
            item.qty * item.watt,
            item.active.boc * item.watt,
            item.active.cont * item.watt,
            item.active.eod * item.watt,
            item.remark ?? '',
          ]
            .map(csvCell)
            .join(','),
        )
      }
    }
  }
  download(`${project.value.meta.docNo}-load-list.csv`, rows.join('\n'), 'text/csv')
  notify('Load list CSV exported')
}

export function importProjectFile(text: string): void {
  try {
    const parsed = JSON.parse(text) as Partial<Project>
    if (!parsed || !Array.isArray(parsed.systems)) throw new Error('missing systems')
    project.value = normalizeProject(parsed)
    notify('Project imported')
  } catch {
    notify('Could not read that project file')
  }
}

export function addKtPoint(): void {
  project.value.sizing.ktTable.push({ minutes: 720, kt: 5.6 })
  notify('Kt point added')
}

export function removeKtPoint(index: number): void {
  if (project.value.sizing.ktTable.length <= 2) {
    notify('Keep at least two Kt points')
    return
  }
  project.value.sizing.ktTable.splice(index, 1)
}

export function selectCell(capacity: number): void {
  project.value.sizing.selectedCellAh = capacity
  project.value.sizing.cellModel = `Cell ${fmt(capacity, 0)} Ah`
}

export function setAutonomy(minutes: number): void {
  project.value.sizing.autonomyMin = Math.round(minutes)
  if (project.value.sizing.autonomyMin > 0) {
    notify(`Autonomy set to ${fmtMinutes(project.value.sizing.autonomyMin)}`)
  }
}
