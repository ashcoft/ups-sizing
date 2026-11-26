<script setup lang="ts">
import { computed } from 'vue'
import { Check, CircleAlert, Printer, Download, FileSpreadsheet } from 'lucide-vue-next'
import {
  checks,
  exportProjectCsv,
  exportProjectJson,
  project,
  requiredAh,
  sizing,
  systemRows,
  totals,
} from '@/store'
import { fmt, fmtA, fmtAh, fmtKw, fmtMinutes, fmtPct, fmtWatts } from '@/lib/format'

const config = computed(() => project.value.sizing)
const adequate = computed(() => config.value.selectedCellAh >= requiredAh.value)

const basisRows = computed(() => [
  ['Nominal DC voltage', `${config.value.nominalVoltage} V`],
  ['Minimum voltage at end of discharge', `${config.value.minVoltage} V`],
  ['Cells per string', `${sizing.value.cellsPerString} × 2 V`],
  ['End-cell voltage', `${fmt(sizing.value.endCellVoltage, 2)} V/cell`],
  ['Autonomy', fmtMinutes(config.value.autonomyMin)],
  ['Battery configuration', `${config.value.redundancy} (${config.value.strings} strings)`],
  ['Aging factor', fmtPct(config.value.agingFactor * 100, 0)],
  ['Future spare', fmtPct(config.value.spareFactor * 100, 0)],
  ['Temperature factor', fmt(config.value.tempFactor, 2)],
  ['Continuous design current', fmtA(sizing.value.designCurrentA, 2)],
])

const periodRows = computed(() =>
  sizing.value.periods.map((period) => ({
    label: `${period.phase.toUpperCase()} — ${fmtMinutes(period.startMin)} to ${fmtMinutes(period.endMin)}`,
    duration: fmtMinutes(period.endMin - period.startMin),
    loadW: fmtWatts(period.loadW, 1),
    loadA: fmtA(period.loadA, 2),
    kt: fmt(
      sizing.value.sections.find((section) => section.index === period.index)?.terms[0]?.kt ?? 0,
      3,
    ),
  })),
)

function shortDoc(doc?: string | null): string {
  if (!doc) return ''
  const match = doc.match(/EMAS-[A-Z0-9-]+/i)
  return match ? match[0] : doc.replace(/\s+/g, ' ').slice(0, 52)
}

function printReport(): void {
  window.print()
}
</script>

<template>
  <div>
    <header class="page-head no-print">
      <div>
        <div class="eyebrow">Deliverable <span class="dot" /> {{ project.meta.docNo }}</div>
        <h1 class="page-head__title">Calculation report</h1>
        <p class="page-head__sub">A print-ready summary of the load list, discharge duty and selected battery.</p>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="exportProjectJson">
          <Download :size="13" :stroke-width="1.7" /> JSON
        </button>
        <button class="btn" type="button" @click="exportProjectCsv">
          <FileSpreadsheet :size="13" :stroke-width="1.7" /> CSV
        </button>
        <button class="btn btn--primary" type="button" @click="printReport">
          <Printer :size="13" :stroke-width="1.7" /> Print
        </button>
      </div>
    </header>

    <article class="report print-sheet">
      <header class="report__head">
        <div class="report__brand">
          <span class="report__mark">DC</span>
          <div>
            <div class="report__brand-name">DC UPS Sizing Studio</div>
            <div class="report__brand-sub">{{ project.meta.client }} · {{ project.meta.discipline }}</div>
          </div>
        </div>
        <dl class="report__doc">
          <div>
            <dt>Document</dt>
            <dd>{{ project.meta.docNo }}</dd>
          </div>
          <div>
            <dt>Revision</dt>
            <dd>{{ project.meta.revision }}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{{ project.meta.date }}</dd>
          </div>
        </dl>
      </header>

      <div class="report__title">
        <h1 class="display">DC UPS Load List<br /><em>&amp; Battery Sizing</em></h1>
        <p class="report__subject">{{ project.meta.subject }}</p>
        <p class="report__project">{{ project.meta.project }}</p>
      </div>

      <section class="report__section">
        <h2><span>1</span> Design basis</h2>
        <div class="report__grid-2">
          <table class="report-table">
            <tbody>
              <tr v-for="row in basisRows.slice(0, 5)" :key="row[0]">
                <th>{{ row[0] }}</th>
                <td>{{ row[1] }}</td>
              </tr>
            </tbody>
          </table>
          <table class="report-table">
            <tbody>
              <tr v-for="row in basisRows.slice(5)" :key="row[0]">
                <th>{{ row[0] }}</th>
                <td>{{ row[1] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="report__section">
        <h2><span>2</span> Load summary</h2>
        <table class="report-table report-table--data">
          <thead>
            <tr>
              <th class="left">Board</th>
              <th>Connected</th>
              <th>Beginning</th>
              <th>Continuous</th>
              <th>End</th>
              <th>Loads</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in systemRows" :key="row.system.id">
              <td class="left">
                {{ row.system.name }}
                <span class="report-table__sub">{{ shortDoc(row.system.doc) || `Board ${row.system.code}` }}</span>
              </td>
              <td>{{ fmtKw(row.totals.connectedW) }}</td>
              <td>{{ fmtWatts(row.totals.bocW, 1) }}</td>
              <td>{{ fmtWatts(row.totals.contW, 0) }}</td>
              <td>{{ fmtWatts(row.totals.eodW, 0) }}</td>
              <td>{{ row.totals.items }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td class="left">Total</td>
              <td>{{ fmtKw(totals.connectedW) }}</td>
              <td>{{ fmtWatts(totals.bocW, 1) }}</td>
              <td>{{ fmtWatts(totals.contW, 0) }}</td>
              <td>{{ fmtWatts(totals.eodW, 0) }}</td>
              <td>{{ totals.items }}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section class="report__section">
        <h2><span>3</span> Discharge profile &amp; capacity</h2>
        <table class="report-table report-table--data">
          <thead>
            <tr>
              <th class="left">Window</th>
              <th>Duration</th>
              <th>Load</th>
              <th>Current @ {{ config.minVoltage }} V</th>
              <th>Kt at window end</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in periodRows" :key="row.label">
              <td class="left">{{ row.label }}</td>
              <td>{{ row.duration }}</td>
              <td>{{ row.loadW }}</td>
              <td>{{ row.loadA }}</td>
              <td>{{ row.kt }}</td>
            </tr>
          </tbody>
        </table>

        <table class="report-table report-table--data report-table--spaced">
          <thead>
            <tr>
              <th class="left">Section</th>
              <th class="left">Load step</th>
              <th>Δ load</th>
              <th>Kt at</th>
              <th>Kt</th>
              <th>Contribution</th>
              <th>Section Ah</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="section in sizing.sections" :key="section.index">
              <tr v-for="(term, termIndex) in section.terms" :key="`${section.index}-${term.label}`">
                <td class="left">{{ section.phase.toUpperCase() }}</td>
                <td class="left">{{ term.label }}</td>
                <td>{{ fmtA(term.dLoadA, 3) }}</td>
                <td>{{ fmt(term.ktAtMin, 0) }} min</td>
                <td>{{ fmt(term.kt, 3) }}</td>
                <td>{{ fmt(term.ah, 2) }} Ah</td>
                <td :class="{ 'report-table__governing': section.index === sizing.governingIndex }">
                  {{ termIndex === section.terms.length - 1 ? fmt(section.ah, 2) : '' }}
                </td>
              </tr>
            </template>
          </tbody>
          <tfoot>
            <tr>
              <td class="left" colspan="6">
                Governing section × {{ fmt(sizing.marginFactor, 2) }} (aging {{ fmtPct(config.agingFactor * 100, 0) }}, spare
                {{ fmtPct(config.spareFactor * 100, 0) }}, temperature {{ fmt(config.tempFactor, 2) }})
              </td>
              <td>{{ fmtAh(requiredAh, 1) }}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section class="report__section">
        <h2><span>4</span> Battery selection</h2>
        <div class="selection">
          <div class="selection__grid">
            <div class="selection__item">
              <span>Duty required</span>
              <strong>{{ fmtAh(requiredAh, 1) }}</strong>
            </div>
            <div class="selection__item">
              <span>Selected cell</span>
              <strong>{{ fmtAh(config.selectedCellAh, 0) }}</strong>
            </div>
            <div class="selection__item">
              <span>Headroom</span>
              <strong>{{ sizing.headroomPct >= 0 ? '+' : '' }}{{ fmtPct(sizing.headroomPct, 1) }}</strong>
            </div>
            <div class="selection__item">
              <span>Continuous C-rate</span>
              <strong>{{ fmt(sizing.cRate, 3) }} C</strong>
            </div>
            <div class="selection__item">
              <span>Stored energy</span>
              <strong>{{ fmt(sizing.energyWh / 1000, 2) }} kWh</strong>
            </div>
            <div class="selection__item">
              <span>Average current</span>
              <strong>{{ fmtA(sizing.avgCurrentA, 2) }}</strong>
            </div>
          </div>

          <div class="selection__result">
            <div class="stamp" :class="{ 'stamp--warn': !adequate }">
              <span class="stamp__top">{{ adequate ? 'Sizing' : 'Action' }}</span>
              <span class="stamp__big">{{ adequate ? 'Verified' : 'Review' }}</span>
              <span class="stamp__bottom">Rev {{ project.meta.revision }} · {{ fmt(sizing.endCellVoltage, 2) }} V/cell</span>
            </div>
            <p>
              <strong>{{ config.cellModel }}</strong> — {{ config.redundancy }} redundant strings.
              <span v-if="adequate">
                The selected {{ fmt(config.selectedCellAh, 0) }} Ah cells carry the {{ fmt(requiredAh, 1) }} Ah duty with
                {{ fmtPct(sizing.headroomPct, 1) }} headroom at {{ fmt(sizing.endCellVoltage, 2) }} V per cell.
              </span>
              <span v-else>
                The selected capacity is below the calculated duty by
                {{ fmtAh(requiredAh - config.selectedCellAh, 1) }}.
              </span>
            </p>
          </div>
        </div>
      </section>

      <section class="report__section">
        <h2><span>5</span> Verification</h2>
        <ul class="report__checks">
          <li v-for="check in checks" :key="check.key">
            <Check v-if="check.ok" :size="12" :stroke-width="2.6" class="ok" />
            <CircleAlert v-else :size="12" :stroke-width="2.4" class="warn" />
            <span>{{ check.label }}</span>
            <em>{{ check.detail }}</em>
          </li>
        </ul>
      </section>

      <section class="report__section">
        <h2><span>6</span> Notes &amp; references</h2>
        <ol class="report__notes">
          <li v-for="(note, index) in project.notes" :key="index">{{ note }}</li>
        </ol>
        <table class="report-table report-table--data report-table--spaced">
          <thead>
            <tr>
              <th class="left">Tag</th>
              <th class="left">Source</th>
              <th class="left">Document</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="reference in project.references" :key="reference.tag">
              <td class="left mono">{{ reference.tag }}</td>
              <td class="left">{{ reference.desc }}</td>
              <td class="left mono">{{ reference.doc }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer class="report__signoff">
        <div>
          <span>Prepared</span>
          <div class="signature">{{ project.meta.preparedBy }}</div>
        </div>
        <div>
          <span>Checked</span>
          <div class="signature" />
        </div>
        <div>
          <span>Approved</span>
          <div class="signature" />
        </div>
        <p class="report__disclaimer">
          This report is generated from a live sizing model. Verify all loads against the latest vendor documentation
          and confirm discharge factors with the cell manufacturer before issue for construction.
        </p>
      </footer>
    </article>
  </div>
</template>

<style scoped>
.report {
  background: var(--surface);
  border: 1px solid var(--line);
  padding: 38px 42px 30px;
  box-shadow: var(--shadow-sm);
}

.report__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 18px;
  border-bottom: 2px solid var(--ink);
}

.report__brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.report__mark {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  background: var(--ink);
  color: var(--paper);
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.02em;
  border-radius: 2px;
}

.report__brand-name {
  font-family: var(--font-display);
  font-size: 18px;
  line-height: 1.1;
}

.report__brand-sub {
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  margin-top: 2px;
}

.report__doc {
  display: flex;
  gap: 26px;
  margin: 0;
}

.report__doc dt {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted-2);
}

.report__doc dd {
  margin: 3px 0 0;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink);
}

.report__title {
  padding: 26px 0 24px;
}

.report__title h1 {
  font-size: clamp(30px, 3.6vw, 44px);
  line-height: 1.02;
}

.report__title h1 em {
  font-style: italic;
  color: var(--accent);
}

.report__subject {
  margin-top: 12px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.report__project {
  margin-top: 8px;
  max-width: 78ch;
  font-size: 12px;
  line-height: 1.6;
  color: var(--ink-soft);
}

.report__section {
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid var(--line);
  break-inside: avoid;
}

.report__section h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-size: 19px;
  margin-bottom: 12px;
}

.report__section h2 span {
  display: grid;
  place-items: center;
  width: 19px;
  height: 19px;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--accent);
}

.report__grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.report-table th,
.report-table td {
  padding: 5px 8px;
  border-bottom: 1px solid var(--line-soft);
  text-align: left;
  vertical-align: top;
}

.report-table th {
  font-family: var(--font-mono);
  font-size: 8.5px;
  font-weight: 400;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  width: 46%;
}

.report-table td {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--ink);
}

.report-table--data th {
  width: auto;
  font-size: 8px;
  letter-spacing: 0.1em;
  color: var(--muted-2);
  border-bottom: 1px solid var(--line);
  text-transform: uppercase;
}

.report-table--data td {
  font-size: 10px;
}

.report-table--data th:nth-child(n + 2),
.report-table--data td:nth-child(n + 2) {
  text-align: right;
}

.report-table--data tfoot td {
  border-top: 1.5px solid var(--ink);
  border-bottom: 0;
  font-weight: 500;
  color: var(--ink);
}

.report-table--spaced {
  margin-top: 14px;
}

.report-table__sub {
  display: block;
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--muted-2);
  margin-top: 1px;
}

.report-table__governing {
  background: color-mix(in srgb, var(--teal) 8%, transparent);
  font-weight: 600;
}

.selection {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(260px, 1fr);
  gap: 24px;
  align-items: start;
}

.selection__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  background: var(--line-soft);
  border: 1px solid var(--line-soft);
}

.selection__item {
  background: var(--surface);
  padding: 9px 10px;
}

.selection__item span {
  display: block;
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted-2);
}

.selection__item strong {
  display: block;
  margin-top: 3px;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
}

.selection__result {
  display: flex;
  align-items: center;
  gap: 18px;
}

.selection__result p {
  font-size: 10.5px;
  line-height: 1.6;
  color: var(--muted);
}

.report__checks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 26px;
}

.report__checks li {
  display: flex;
  align-items: baseline;
  gap: 7px;
  padding: 5px 0;
  border-bottom: 1px dotted var(--line);
  font-size: 10.5px;
}

.report__checks li em {
  margin-left: auto;
  font-family: var(--font-mono);
  font-style: normal;
  font-size: 9px;
  color: var(--muted-2);
  text-align: right;
}

.report__notes {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.report__notes li {
  font-size: 10.5px;
  line-height: 1.55;
  color: var(--muted);
}

.report__signoff {
  margin-top: 28px;
  padding-top: 18px;
  border-top: 2px solid var(--ink);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) 1.7fr;
  gap: 22px;
  align-items: end;
}

.report__signoff span {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted-2);
}

.signature {
  margin-top: 26px;
  border-bottom: 1px solid var(--line-strong);
  padding-bottom: 3px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--ink-soft);
  min-height: 18px;
}

.report__disclaimer {
  font-size: 8.5px;
  line-height: 1.55;
  color: var(--muted-2);
}

@media (max-width: 1000px) {
  .report {
    padding: 24px 22px;
  }
  .report__head {
    flex-direction: column;
  }
  .report__doc {
    gap: 18px;
  }
  .selection {
    grid-template-columns: minmax(0, 1fr);
  }
  .report__grid-2 {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
  .report__signoff {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media print {
  .report {
    padding: 0;
    border: 0;
    box-shadow: none;
  }

  .report__section {
    margin-top: 12px;
    padding-top: 12px;
  }

  .report__title {
    padding: 16px 0;
  }

  .report-table th,
  .report-table td {
    border-color: #ccc;
  }

  .report-table__governing {
    background: #eef5f3;
  }

  .stamp {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
