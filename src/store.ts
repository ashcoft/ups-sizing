import { computed, ref, watch } from 'vue'
import { workbookProject } from './data/workbook'
import type { LoadItem, Project } from './types'
import { allItems, autonomySweep, computeSizing, computeTotals, projectChecks, systemTotals, type Totals } from './lib/sizing'
import { clone, normalizeItem, normalizeProject, uid } from './lib/normalize'
import { applyKtEdit, nextKtDuration } from './lib/kt'
import { download, csvCell, fmt, fmtMinutes } from './lib/format'
import { systemColor } from './lib/palette'

const STORAGE_KEY = 'dcups.project.v1'
const THEME_KEY = 'dcups.theme'

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

export const designOk = computed(() => checks.value.filter((check) => check.required).every((check) => check.ok))

export const requiredAh = computed(() => sizing.value.requiredAh)

/* ── persistence ──────────────────────────────────────────── */

export const lastSaved = ref<number | null>(null)
export const saveError = ref(false)

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project.value))
    lastSaved.value = Date.now()
    saveError.value = false
  } catch {
    saveError.value = true
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

/** Bumped whenever the whole project is replaced, retiring pending undo actions. */
let projectEpoch = 0

function retireUndoActions(): void {
  projectEpoch += 1
  toasts.value = toasts.value.filter((toast) => !toast.action)
}

function itemListAttached(list: LoadItem[]): boolean {
  return project.value.systems.some(
    (system) => system.items === list || system.sections.some((section) => section.items === list),
  )
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
  const epoch = projectEpoch
  notify('Load removed', {
    label: 'Undo',
    run: () => {
      if (epoch !== projectEpoch || !itemListAttached(found.list)) {
        notify('Project changed — nothing to restore')
        return
      }
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
  const epoch = projectEpoch
  notify('Section removed', {
    label: 'Undo',
    run: () => {
      if (epoch !== projectEpoch || !project.value.systems.includes(system)) {
        notify('Project changed — nothing to restore')
        return
      }
      system.sections.splice(Math.min(index, system.sections.length), 0, removed)
      notify('Section restored')
    },
  })
}

export function removeSystem(systemId: string): void {
  const index = project.value.systems.findIndex((system) => system.id === systemId)
  if (index < 0) return
  const [removed] = project.value.systems.splice(index, 1)
  const epoch = projectEpoch
  notify('System removed', {
    label: 'Undo',
    run: () => {
      if (epoch !== projectEpoch || project.value.systems.some((system) => system.id === removed.id)) {
        notify('Project changed — nothing to restore')
        return
      }
      project.value.systems.splice(Math.min(index, project.value.systems.length), 0, removed)
      notify('System restored')
    },
  })
}

export function resetProject(): void {
  const previous = clone(project.value)
  retireUndoActions()
  project.value = clone(workbookProject)
  const epoch = projectEpoch
  notify('Restored workbook baseline', {
    label: 'Undo',
    run: () => {
      if (epoch !== projectEpoch) {
        notify('Project changed — nothing to restore')
        return
      }
      project.value = previous
      notify('Edited project restored')
    },
  })
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
    retireUndoActions()
    project.value = normalizeProject(parsed)
    notify('Project imported')
  } catch {
    notify('Could not read that project file')
  }
}

export function setKtField(index: number, field: 'minutes' | 'kt', value: number): boolean {
  return applyKtEdit(project.value.sizing.ktTable, index, field, value)
}

export function addKtPoint(): void {
  const table = project.value.sizing.ktTable
  const minutes = nextKtDuration(table)
  const anchor = [...table].sort((a, b) => a.minutes - b.minutes).at(-1) ?? { minutes: 1, kt: 1.3 }
  const kt = Number((anchor.kt * Math.pow(minutes / anchor.minutes, 0.2157)).toFixed(2))
  table.push({ minutes, kt })
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
  if (!Number.isFinite(minutes)) return
  project.value.sizing.autonomyMin = Math.min(Math.max(Math.round(minutes), 3), 1440)
  notify(`Autonomy set to ${fmtMinutes(project.value.sizing.autonomyMin)}`)
}
