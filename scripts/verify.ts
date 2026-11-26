import { workbookProject } from '../src/data/workbook'
import { computeTotals, computeSizing, ktAt, smallestStandard, autonomySweep } from '../src/lib/sizing'

const t = computeTotals(workbookProject.systems)
const s = computeSizing(t, workbookProject.sizing)
const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol

const checks: [string, boolean, string][] = [
  ['connected load 8,143.97 W', near(t.connectedW, 8143.97), t.connectedW.toFixed(2)],
  ['BOC 35.775 W', near(t.bocW, 35.775), t.bocW.toFixed(3)],
  ['CONT 3,464.17 W', near(t.contW, 3464.17), t.contW.toFixed(2)],
  ['EOD 3,190.15 W', near(t.eodW, 3190.15), t.eodW.toFixed(2)],
  ['item count 75', t.items === 75, String(t.items)],
  ['Kt(1) = 1.300', near(ktAt(workbookProject.sizing.ktTable, 1), 1.3, 1e-6), ktAt(workbookProject.sizing.ktTable, 1).toFixed(3)],
  ['Kt(240) = 4.240', near(ktAt(workbookProject.sizing.ktTable, 240), 4.24, 1e-6), ktAt(workbookProject.sizing.ktTable, 240).toFixed(3)],
  ['section 2 = 148.09 Ah', near(s.sections[1].ah, 148.09, 0.02), s.sections[1].ah.toFixed(2)],
  ['section 3 = 144.63 Ah', near(s.sections[2].ah, 144.63, 0.02), s.sections[2].ah.toFixed(2)],
  ['required = 195.5 Ah', near(s.requiredAh, 195.5, 0.2), s.requiredAh.toFixed(2)],
  ['governing = CONT', s.sections[s.governingIndex].phase === 'cont', s.sections[s.governingIndex].phase],
  ['headroom +43.2%', near(s.headroomPct, 43.2, 0.2), s.headroomPct.toFixed(2)],
  ['design current 34.99 A', near(s.designCurrentA, 34.99, 0.02), s.designCurrentA.toFixed(2)],
  ['cells per string 55', s.cellsPerString === 55, String(s.cellsPerString)],
  ['end cell 1.80 V', near(s.endCellVoltage, 1.8, 0.005), s.endCellVoltage.toFixed(2)],
  ['energy 13.79 kWh', near(s.energyWh / 1000, 13.79, 0.02), (s.energyWh / 1000).toFixed(2)],
  ['smallest standard 200 Ah', smallestStandard(workbookProject.sizing.catalog, s.requiredAh) === 200, String(smallestStandard(workbookProject.sizing.catalog, s.requiredAh))],
  ['sweep covers 30..480', autonomySweep(t, workbookProject.sizing)[0].minutes === 30, `${autonomySweep(t, workbookProject.sizing).length} points`],
  ['autonomy 120 lower duty', computeSizing(t, workbookProject.sizing, 120).requiredAh < s.requiredAh, computeSizing(t, workbookProject.sizing, 120).requiredAh.toFixed(1)],
]

let failures = 0
for (const [name, ok, actual] of checks) {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${actual})`}`)
}
console.log(`\n${checks.length - failures}/${checks.length} checks passed`)
if (failures > 0) process.exit(1)
