import { workbookProject } from '../src/data/workbook'
import {
  activeUnits,
  autonomySweep,
  computeSizing,
  computeTotals,
  itemPhaseW,
  ktAt,
  projectChecks,
  smallestStandard,
} from '../src/lib/sizing'
import { csvCell } from '../src/lib/format'
import { applyKtEdit, nextKtDuration } from '../src/lib/kt'
import { normalizeProject } from '../src/lib/normalize'
import type { LoadItem } from '../src/types'

const results: { name: string; ok: boolean; actual: string }[] = []

function check(name: string, ok: boolean, actual: unknown = ''): void {
  results.push({ name, ok, actual: String(actual) })
}

function near(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) <= tolerance
}

/* ── workbook baseline ─────────────────────────────────────────────────────── */

const totals = computeTotals(workbookProject.systems)
const sizing = computeSizing(totals, workbookProject.sizing)
const checks = projectChecks(sizing, workbookProject.sizing)

check('connected load 8,143.97 W', near(totals.connectedW, 8143.97), totals.connectedW.toFixed(2))
check('BOC 35.775 W', near(totals.bocW, 35.775), totals.bocW.toFixed(3))
check('CONT 3,464.17 W', near(totals.contW, 3464.17), totals.contW.toFixed(2))
check('EOD 3,190.15 W', near(totals.eodW, 3190.15), totals.eodW.toFixed(2))
check('item count 75', totals.items === 75, totals.items)
check('Kt(1) = 1.300', near(ktAt(workbookProject.sizing.ktTable, 1), 1.3, 1e-6), ktAt(workbookProject.sizing.ktTable, 1).toFixed(3))
check('Kt(240) = 4.240', near(ktAt(workbookProject.sizing.ktTable, 240), 4.24, 1e-6), ktAt(workbookProject.sizing.ktTable, 240).toFixed(3))
check('section 2 = 148.09 Ah', near(sizing.sections[1].ah, 148.09, 0.02), sizing.sections[1].ah.toFixed(2))
check('section 3 = 144.63 Ah', near(sizing.sections[2].ah, 144.63, 0.02), sizing.sections[2].ah.toFixed(2))
check('required = 195.5 Ah', near(sizing.requiredAh, 195.5, 0.2), sizing.requiredAh.toFixed(2))
check('governing = CONT', sizing.sections[sizing.governingIndex].phase === 'cont', sizing.sections[sizing.governingIndex].phase)
check('headroom +43.2%', near(sizing.headroomPct, 43.2, 0.2), sizing.headroomPct.toFixed(2))
check('design current 34.99 A', near(sizing.designCurrentA, 34.99, 0.02), sizing.designCurrentA.toFixed(2))
check('cells per string 55', sizing.cellsPerString === 55, sizing.cellsPerString)
check('end cell 1.80 V', near(sizing.endCellVoltage, 1.8, 0.005), sizing.endCellVoltage.toFixed(2))
check('energy 13.79 kWh', near(sizing.energyWh / 1000, 13.79, 0.02), (sizing.energyWh / 1000).toFixed(2))
check('smallest standard 200 Ah', smallestStandard(workbookProject.sizing.catalog, sizing.requiredAh) === 200, smallestStandard(workbookProject.sizing.catalog, sizing.requiredAh))
check('all required checks pass at baseline', checks.filter((entry) => entry.required).every((entry) => entry.ok), checks.filter((entry) => !entry.ok).map((entry) => entry.key).join(','))
check('default Kt table covers 240 min duty', sizing.durationCovered && sizing.maxKtMinutes === 600, `${sizing.maxKtMinutes}/${sizing.maxDutyDuration}`)

/* ── sweep and coverage ───────────────────────────────────────────────────── */

const sweep = autonomySweep(totals, workbookProject.sizing)
check('sweep covers 30..480', sweep[0].minutes === 30, `${sweep.length} points`)
check('sweep includes an out-of-range design autonomy', autonomySweep(totals, { ...workbookProject.sizing, autonomyMin: 600 }).some((point) => point.minutes === 600), `${autonomySweep(totals, { ...workbookProject.sizing, autonomyMin: 600 }).length} points`)
check('autonomy 120 lowers duty', computeSizing(totals, workbookProject.sizing, 120).requiredAh < sizing.requiredAh, computeSizing(totals, workbookProject.sizing, 120).requiredAh.toFixed(1))

const beyondTable = computeSizing(totals, workbookProject.sizing, 720)
check('720 min duty is flagged as uncovered', !beyondTable.durationCovered, `${beyondTable.maxKtMinutes}/${beyondTable.maxDutyDuration}`)
check(
  'uncovered duty fails a required check',
  projectChecks(beyondTable, workbookProject.sizing).some((entry) => entry.key === 'kt-coverage' && entry.required && !entry.ok),
  projectChecks(beyondTable, workbookProject.sizing).find((entry) => entry.key === 'kt-coverage')?.detail,
)

const brokenTable = { ...workbookProject.sizing, ktTable: [{ minutes: 1, kt: 0 }, { minutes: 240, kt: 0 }, { minutes: 600, kt: 0 }] }
const brokenResult = computeSizing(totals, brokenTable)
check('invalid Kt table is flagged', brokenResult.ktPoints === 0 && !brokenResult.durationCovered, brokenResult.ktPoints)

/* ── active-unit clamping ────────────────────────────────────────────────── */

const clampedItem: LoadItem = {
  id: 'test',
  code: '1',
  description: 'clamp',
  qty: 1,
  watt: 10,
  active: { boc: 4, cont: 0, eod: 0 },
}
check('active units clamp to panel quantity', activeUnits(clampedItem, 'boc') === 1, activeUnits(clampedItem, 'boc'))
check('phase watts use clamped units', itemPhaseW(clampedItem, 'boc') === 10, itemPhaseW(clampedItem, 'boc'))

/* ── CSV formula neutralising ────────────────────────────────────────────── */

check('CSV neutralises formulas', csvCell('=1+1') === "'=1+1", csvCell('=1+1'))
check('CSV keeps numbers numeric', csvCell(2) === '2' && csvCell(-2.5) === '-2.5', csvCell(-2.5))
check('CSV quotes commas', csvCell('a,b') === '"a,b"', csvCell('a,b'))

/* ── imported project normalisation ──────────────────────────────────────── */

const emptied = normalizeProject({ ...workbookProject, systems: [] })
check('empty system list survives normalisation', emptied.systems.length === 0, emptied.systems.length)

const imported = normalizeProject({
  ...workbookProject,
  sizing: { ...workbookProject.sizing, minVoltage: '99' as unknown as number, autonomyMin: 1, tempFactor: 0 },
})
check('imported numeric strings become numbers', typeof imported.sizing.minVoltage === 'number' && imported.sizing.minVoltage === 99, typeof imported.sizing.minVoltage)
check('imported autonomy is clamped', imported.sizing.autonomyMin === 3, imported.sizing.autonomyMin)
check('imported temperature factor is clamped', imported.sizing.tempFactor === 0.5, imported.sizing.tempFactor)
check(
  'imported project still yields checks',
  (() => {
    try {
      projectChecks(computeSizing(computeTotals(imported.systems), imported.sizing), imported.sizing)
      return true
    } catch {
      return false
    }
  })(),
  'no throw',
)

const importedKt = normalizeProject({
  ...workbookProject,
  sizing: { ...workbookProject.sizing, ktTable: [{ minutes: 1, kt: 0 }, { minutes: 240, kt: 0 }] },
})
check(
  'invalid Kt imports fall back to usable defaults',
  importedKt.sizing.ktTable.filter((point) => point.minutes > 0 && point.kt > 0).length >= 2,
  importedKt.sizing.ktTable.length,
)

/* ── Kt edit validation ──────────────────────────────────────────────────── */

const ktRows = [
  { minutes: 1, kt: 1.3 },
  { minutes: 240, kt: 4.24 },
]
check('Kt rejects zero factor', !applyKtEdit(ktRows, 0, 'kt', 0) && ktRows[0].kt === 1.3, ktRows[0].kt)
check('Kt rejects duplicate duration', !applyKtEdit(ktRows, 1, 'minutes', 1) && ktRows[1].minutes === 240, ktRows[1].minutes)
check('Kt accepts valid factor', applyKtEdit(ktRows, 0, 'kt', 1.35) && ktRows[0].kt === 1.35, ktRows[0].kt)
check('Kt add picks an unused duration', nextKtDuration(ktRows) === 720, nextKtDuration(ktRows))

/* ── verdict coverage ────────────────────────────────────────────────────── */

const lowVoltage = { ...workbookProject.sizing, minVoltage: 105 }
const lowVoltageResult = computeSizing(totals, lowVoltage)
check(
  'out-of-range end voltage fails a required check',
  projectChecks(lowVoltageResult, lowVoltage).some((entry) => entry.key === 'end-voltage' && entry.required && !entry.ok),
  projectChecks(lowVoltageResult, lowVoltage).find((entry) => entry.key === 'end-voltage')?.detail,
)

const emptyTotals = computeTotals([])
check(
  'empty register is not verified',
  projectChecks(computeSizing(emptyTotals, workbookProject.sizing), workbookProject.sizing).some(
    (entry) => entry.key === 'capacity' && entry.required && !entry.ok,
  ),
  'capacity check',
)

/* ── report ─────────────────────────────────────────────────────────────── */

const failures = results.filter((entry) => !entry.ok)
for (const entry of results) {
  console.log(`${entry.ok ? 'PASS' : 'FAIL'}  ${entry.name}${entry.ok ? '' : `  (got ${entry.actual})`}`)
}
console.log(`\n${results.length - failures.length}/${results.length} checks passed`)
if (failures.length > 0) process.exit(1)
