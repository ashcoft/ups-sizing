<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, ArrowRight, BatteryCharging, Check, Plus, Trash2 } from 'lucide-vue-next'
import {
  addKtPoint,
  autonomyCurve,
  checks,
  go,
  project,
  removeKtPoint,
  requiredAh,
  selectCell,
  setAutonomy,
  sizing,
  totals,
} from '@/store'
import { fmt, fmtA, fmtAh, fmtKw, fmtMinutes, fmtPct, fmtWatts } from '@/lib/format'
import { ktAt, smallestStandard } from '@/lib/sizing'
import AhGauge from '@/components/AhGauge.vue'
import KtCurveChart from '@/components/KtCurveChart.vue'
import AutonomyChart from '@/components/AutonomyChart.vue'
import NumberField from '@/components/ui/NumberField.vue'

const config = computed(() => project.value.sizing)

const ktMarkers = computed(() => {
  const durations = [...new Set(sizing.value.sections.flatMap((section) => section.terms.map((term) => Math.round(term.ktAtMin))))].sort(
    (a, b) => a - b,
  )
  const picks = durations.length > 1 ? [durations[0], durations[durations.length - 1]] : durations
  return picks.map((minutes) => ({ minutes, label: `${minutes} min` }))
})

const smallest = computed(() => smallestStandard(config.value.catalog, requiredAh.value))

const selectedOption = computed({
  get: () => config.value.selectedCellAh,
  set: (value: number) => selectCell(value),
})

const adequate = computed(() => config.value.selectedCellAh >= requiredAh.value)

const presets = [60, 120, 240, 300, 480]

function setStrings(value: string): void {
  const count = Number(value)
  config.value.strings = count
  config.value.redundancy = count > 1 ? `${count} × 100%` : '1 × 100%'
}

const gaugeSummary = computed(() => [
  { label: 'Governing section', value: `${fmt(sizing.value.maxSectionAh, 1)} Ah` },
  { label: 'Aging + spare', value: `× ${fmt(sizing.value.marginFactor, 2)}` },
  { label: 'C-rate (continuous)', value: `${fmt(sizing.value.cRate, 3)} C` },
  { label: 'End-cell voltage', value: `${fmt(sizing.value.endCellVoltage, 2)} V` },
  { label: 'Cells per string', value: `${sizing.value.cellsPerString}` },
  { label: 'Stored energy', value: `${fmt(sizing.value.energyWh / 1000, 2)} kWh` },
])
</script>

<template>
  <div>
    <header class="page-head">
      <div>
        <div class="eyebrow">Calculation <span class="dot" /> IEEE 485 section method</div>
        <h1 class="page-head__title">Battery sizing</h1>
        <p class="page-head__sub">
          Load current at minimum voltage, capacity factor Kt from the discharge characteristic, and a cell size with
          aging, spare and temperature allowances.
        </p>
      </div>
      <div class="page-actions">
        <button class="btn" type="button" @click="go('loads')">Review loads</button>
        <button class="btn btn--primary" type="button" @click="go('report')">
          Open report <ArrowRight :size="13" :stroke-width="1.8" />
        </button>
      </div>
    </header>

    <section class="grid grid--12 sizing-top">
      <article class="card col-5">
        <div class="card__head">
          <div>
            <h2 class="card__title">Design basis</h2>
            <p class="card__sub">Every input recalculates the duty immediately.</p>
          </div>
          <BatteryCharging :size="17" :stroke-width="1.4" class="dim" />
        </div>
        <div class="card__body">
          <div class="divider-label">DC system</div>
          <div class="fields">
            <NumberField
              label="Nominal voltage"
              unit="V"
              :model-value="config.nominalVoltage"
              :min="24"
              :step="2"
              hint="2 V cells in series"
              @update:model-value="config.nominalVoltage = $event"
            />
            <NumberField
              label="Minimum voltage"
              unit="V"
              :model-value="config.minVoltage"
              :min="12"
              :step="1"
              :hint="`${fmt(config.minVoltage / Math.round(config.nominalVoltage / 2), 2)} V per cell`"
              @update:model-value="config.minVoltage = $event"
            />
            <NumberField
              label="Autonomy"
              unit="min"
              :model-value="config.autonomyMin"
              :min="3"
              :step="5"
              hint="Discharge duration"
              @update:model-value="setAutonomy($event)"
            />
            <label class="field">
              <span class="field__label">Strings</span>
              <span class="field__control">
                <select class="input" :value="String(config.strings)" @change="setStrings(($event.target as HTMLSelectElement).value)">
                  <option value="1">1 × 100%</option>
                  <option value="2">2 × 100%</option>
                  <option value="3">3 × 100%</option>
                </select>
              </span>
              <span class="tiny dim">Parallel battery configuration</span>
            </label>
          </div>

          <div class="divider-label section-gap">Design allowances</div>
          <div class="fields">
            <NumberField
              label="Aging factor"
              unit="%"
              :model-value="config.agingFactor * 100"
              :min="0"
              :max="50"
              :step="1"
              @update:model-value="config.agingFactor = $event / 100"
            />
            <NumberField
              label="Future spare"
              unit="%"
              :model-value="config.spareFactor * 100"
              :min="0"
              :max="100"
              :step="5"
              @update:model-value="config.spareFactor = $event / 100"
            />
            <NumberField
              label="Temperature factor"
              unit="×"
              :model-value="config.tempFactor"
              :min="0.5"
              :max="2"
              :step="0.01"
              hint="1.00 at 25 °C reference"
              @update:model-value="config.tempFactor = $event"
            />
          </div>
        </div>
      </article>

      <article class="card col-7 outcome">
        <div class="card__head">
          <div>
            <h2 class="card__title">Selected cell</h2>
            <p class="card__sub">{{ config.cellModel }} · {{ config.redundancy }} redundant strings</p>
          </div>
          <span class="pill" :class="adequate ? 'pill--ok' : 'pill--warn'">
            {{ adequate ? 'capacity covered' : 'below duty' }}
          </span>
        </div>
        <div class="card__body outcome__body">
          <AhGauge :required-ah="requiredAh" :selected-ah="config.selectedCellAh" />

          <div class="outcome__side">
            <dl class="outcome__stats">
              <div v-for="item in gaugeSummary" :key="item.label">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
              </div>
            </dl>

            <div class="outcome__select">
              <label class="field">
                <span class="field__label">Cell capacity from catalogue</span>
                <span class="field__control">
                  <select v-model.number="selectedOption" class="input">
                    <option v-for="capacity in config.catalog" :key="capacity" :value="capacity">
                      {{ capacity }} Ah {{ capacity === smallest ? '· smallest adequate' : '' }}
                    </option>
                  </select>
                </span>
              </label>
              <label class="field">
                <span class="field__label">Cell reference</span>
                <input v-model="config.cellModel" class="input input--text" spellcheck="false" />
              </label>
            </div>

            <p class="outcome__note" :class="adequate ? 'ok' : 'warn'">
              <Check v-if="adequate" :size="13" :stroke-width="2.4" />
              <AlertTriangle v-else :size="13" :stroke-width="2.2" />
              <span v-if="adequate">
                {{ fmtAh(config.selectedCellAh, 0) }} cell carries the {{ fmtAh(requiredAh, 1) }} duty with
                {{ fmtPct(sizing.headroomPct, 1) }} headroom. Smallest adequate catalogue size:
                {{ smallest ? `${smallest} Ah` : 'none — review catalogue' }}.
              </span>
              <span v-else>
                Selected cell is {{ fmtAh(requiredAh - config.selectedCellAh, 1) }} below the calculated duty. Increase
                capacity or reduce the load.
              </span>
            </p>

            <div class="currents">
              <div>
                <span>Continuous</span>
                <strong>{{ fmtA(sizing.designCurrentA, 2) }}</strong>
                <em>at {{ config.minVoltage }} V</em>
              </div>
              <div>
                <span>Beginning</span>
                <strong>{{ fmtA(totals.bocW / config.minVoltage, 2) }}</strong>
                <em>1 min window</em>
              </div>
              <div>
                <span>End</span>
                <strong>{{ fmtA(totals.eodW / config.minVoltage, 2) }}</strong>
                <em>1 min window</em>
              </div>
            </div>
          </div>
        </div>
      </article>
    </section>

    <section class="card section-method">
      <div class="card__head">
        <div>
          <h2 class="card__title">Section method</h2>
          <p class="card__sub">
            Capacity at the end of each window: Σ (Δ load × Kt) over all preceding load steps. Negative deltas reduce
            the requirement.
          </p>
        </div>
        <span class="pill">Kt from {{ config.ktTable.length }} points</span>
      </div>
      <div class="table-wrap">
        <table class="data method-table">
          <thead>
            <tr>
              <th class="left">Section</th>
              <th class="left">Load step</th>
              <th>Δ load</th>
              <th>Kt at</th>
              <th>Kt</th>
              <th>Contribution</th>
              <th>Section total</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="section in sizing.sections" :key="section.index">
              <tr v-for="(term, termIndex) in section.terms" :key="term.label">
                <td v-if="termIndex === 0" class="left" :rowspan="section.terms.length">
                  <span class="section-badge">{{ section.index + 1 }}</span>
                  <span class="section-window">
                    {{ section.phase.toUpperCase() }}
                    <span class="sub">ends {{ fmtMinutes(section.endMin) }}</span>
                  </span>
                </td>
                <td class="left term-label">
                  <span class="term-phase" :class="`term-phase--${term.phase}`">{{ term.phase.toUpperCase() }}</span>
                  @ {{ term.label.split(' @ ')[1] }}
                </td>
                <td>{{ fmtA(term.dLoadA, 3) }}</td>
                <td>{{ fmt(term.ktAtMin, 0) }} min</td>
                <td>{{ fmt(term.kt, 3) }}</td>
                <td>{{ fmt(term.ah, 2) }} Ah</td>
                <td />
              </tr>
              <tr class="section-total" :class="{ governing: section.index === sizing.governingIndex }">
                <td class="left" colspan="5">
                  <span v-if="section.index === sizing.governingIndex" class="governing-tag">Governing section</span>
                  <span v-else>Section {{ section.index + 1 }} subtotal</span>
                  <span class="dim"> · ends at {{ fmtMinutes(section.endMin) }}</span>
                </td>
                <td>{{ fmtAh(section.ah, 2) }}</td>
                <td>{{ fmt(section.ah * sizing.marginFactor, 1) }} Ah</td>
              </tr>
            </template>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td class="left" colspan="5">Maximum section × aging {{ fmtPct(config.agingFactor * 100, 0) }} × spare {{ fmtPct(config.spareFactor * 100, 0) }} × temp {{ fmt(config.tempFactor, 2) }}</td>
              <td>{{ fmt(sizing.maxSectionAh, 2) }} Ah</td>
              <td>{{ fmtAh(requiredAh, 1) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="method-foot">
        <p class="tiny dim">
          Rounding follows the source calculation: load currents at {{ config.minVoltage }} V, Kt interpolated log–log
          between published durations. Section totals before margins are shown for comparison with the workbook.
        </p>
      </div>
    </section>

    <section class="grid grid--12 kt-row">
      <article class="card col-7">
        <div class="card__head">
          <div>
            <h2 class="card__title">Discharge characteristic</h2>
            <p class="card__sub">Capacity factor Kt versus discharge duration.</p>
          </div>
          <span class="pill">Kt {{ fmt(1.3, 2) }} – {{ fmt(4.24, 2) }}</span>
        </div>
        <div class="card__body">
          <KtCurveChart :table="config.ktTable" :markers="ktMarkers" :height="236" />
          <p class="tiny dim kt-note">{{ config.ktSource }}</p>
        </div>
      </article>

      <article class="card col-5">
        <div class="card__head">
          <div>
            <h2 class="card__title">Kt table</h2>
            <p class="card__sub">Editable manufacturer discharge factors.</p>
          </div>
          <button class="btn btn--sm" type="button" @click="addKtPoint">
            <Plus :size="11" :stroke-width="2" /> Add
          </button>
        </div>
        <div class="card__body card__body--tight">
          <div class="kt-table-wrap">
            <table class="data kt-table">
              <thead>
                <tr>
                  <th class="left">Duration</th>
                  <th>Kt</th>
                  <th style="width: 40px" />
                </tr>
              </thead>
              <tbody>
                <tr v-for="(point, index) in config.ktTable" :key="index">
                  <td class="left">
                    <input v-model.lazy.number="point.minutes" class="cell-input" type="number" min="0.1" step="1" />
                    <span class="tiny dim">min</span>
                  </td>
                  <td>
                    <input v-model.lazy.number="point.kt" class="cell-input" type="number" min="0.01" step="0.01" />
                  </td>
                  <td>
                    <button class="btn btn--sm btn--ghost btn--danger" type="button" title="Remove point" @click="removeKtPoint(index)">
                      <Trash2 :size="11" :stroke-width="1.8" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="tiny dim kt-foot">
            Design lookups: {{ sizing.sections.map((section) => `${fmt(ktAt(config.ktTable, section.terms[0]?.ktAtMin ?? 0), 3)}`).join(' · ') }}
          </p>
        </div>
      </article>

      <article class="card col-12">
        <div class="card__head">
          <div>
            <h2 class="card__title">Autonomy sensitivity</h2>
            <p class="card__sub">How much capacity the duty needs as the autonomy window changes. Click the curve to apply.</p>
          </div>
          <div class="presets">
            <button
              v-for="preset in presets"
              :key="preset"
              class="btn btn--sm"
              :class="{ 'btn--primary': config.autonomyMin === preset }"
              type="button"
              @click="setAutonomy(preset)"
            >
              {{ fmtMinutes(preset) }}
            </button>
          </div>
        </div>
        <div class="card__body">
          <AutonomyChart
            :points="autonomyCurve"
            :design-minutes="config.autonomyMin"
            :selected-ah="config.selectedCellAh"
            :height="252"
            @select="setAutonomy"
          />
          <div class="autonomy-foot">
            <div>
              <span class="eyebrow">At design point</span>
              <p class="mono">{{ fmtAh(requiredAh, 1) }} required · {{ fmtAh(config.selectedCellAh, 0) }} selected · {{ fmtKw(totals.contW) }} continuous</p>
            </div>
            <div>
              <span class="eyebrow">Energy</span>
              <p class="mono">{{ fmt(sizing.energyWh / 1000, 2) }} kWh · avg {{ fmtA(sizing.avgCurrentA, 2) }}</p>
            </div>
            <div>
              <span class="eyebrow">Profile</span>
              <p class="mono">{{ fmtWatts(totals.bocW, 1) }} → {{ fmtWatts(totals.contW, 0) }} → {{ fmtWatts(totals.eodW, 1) }}</p>
            </div>
          </div>
        </div>
      </article>
    </section>

    <section class="checks-strip">
      <div v-for="check in checks" :key="check.key" class="checks-strip__item">
        <span class="checks-strip__icon" :class="check.ok ? 'ok' : 'warn'">
          <Check v-if="check.ok" :size="11" :stroke-width="2.6" />
          <AlertTriangle v-else :size="11" :stroke-width="2.2" />
        </span>
        <div>
          <span class="checks-strip__label">{{ check.label }}</span>
          <span class="checks-strip__detail">{{ check.detail }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sizing-top {
  margin-bottom: 18px;
  align-items: start;
}

.fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 13px 14px;
  margin-top: 12px;
}

.section-gap {
  margin-top: 22px;
}

.currents {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  background: var(--line-soft);
  border: 1px solid var(--line-soft);
}

.currents > div {
  background: var(--surface-2);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.currents span {
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted-2);
}

.currents strong {
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: 13px;
  color: var(--ink);
}

.currents em {
  font-style: normal;
  font-family: var(--font-mono);
  font-size: 8.5px;
  color: var(--muted-2);
}

.outcome__body {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}

.outcome__side {
  flex: 1;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.outcome__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin: 0;
  background: var(--line-soft);
  border: 1px solid var(--line-soft);
}

.outcome__stats > div {
  background: var(--surface);
  padding: 7px 9px;
}

.outcome__stats dt {
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted-2);
}

.outcome__stats dd {
  margin: 2px 0 0;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink);
}

.outcome__select {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
}

.outcome__note {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  padding: 9px 10px;
  border: 1px solid var(--line-soft);
  background: var(--surface-2);
}

.outcome__note.ok {
  color: var(--ink-soft);
}

.outcome__note.ok svg {
  color: var(--teal);
  flex: none;
  margin-top: 1px;
}

.outcome__note.warn svg {
  color: var(--accent);
  flex: none;
  margin-top: 1px;
}

.section-method {
  margin-bottom: 18px;
}

.method-table .term-label {
  white-space: nowrap;
}

.step-rows td {
  border-bottom: 1px solid var(--line-soft);
}

.section-badge {
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 1px solid var(--line-strong);
  border-radius: 2px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--ink);
  margin-right: 8px;
  vertical-align: middle;
}

.section-window {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--ink);
  vertical-align: middle;
}

.term-label {
  color: var(--ink-soft);
  font-size: 11.5px;
}

.term-phase {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  padding: 1px 5px;
  border-radius: 2px;
  border: 1px solid currentColor;
  margin-right: 4px;
}

.term-phase--boc {
  color: var(--accent);
}

.term-phase--cont {
  color: var(--teal);
}

.term-phase--eod {
  color: var(--indigo);
}

.section-total td {
  background: var(--surface-2);
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  font-size: 11.5px;
}

.section-total.governing td {
  background: color-mix(in srgb, var(--teal) 7%, var(--surface));
}

.governing-tag {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--teal);
  border: 1px solid color-mix(in srgb, var(--teal) 40%, transparent);
  border-radius: 100px;
  padding: 1px 7px;
  margin-right: 6px;
}

.method-foot {
  padding: 10px 22px 14px;
  border-top: 1px solid var(--line-soft);
}

.kt-row {
  margin-bottom: 18px;
}

.kt-note {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--line-soft);
  line-height: 1.6;
}

.kt-table-wrap {
  max-height: 268px;
  overflow: auto;
}

.kt-table td {
  padding-top: 3px;
  padding-bottom: 3px;
}

.kt-foot {
  margin-top: 8px;
  padding: 8px 4px 0;
  border-top: 1px solid var(--line-soft);
  font-size: 9px;
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.autonomy-foot {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--line-soft);
}

.autonomy-foot p {
  margin-top: 4px;
  font-size: 11px;
}

.checks-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
}

.checks-strip__item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 13px 15px;
  background: var(--surface);
}

.checks-strip__icon {
  flex: none;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid currentColor;
  margin-top: 1px;
}

.checks-strip__label {
  display: block;
  font-size: 11px;
  color: var(--ink);
}

.checks-strip__detail {
  display: block;
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--muted-2);
  margin-top: 1px;
}

@media (max-width: 900px) {
  .checks-strip {
    grid-template-columns: minmax(0, 1fr);
  }
  .autonomy-foot {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
}

@media (max-width: 620px) {
  .fields,
  .outcome__select {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
