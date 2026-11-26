<script setup lang="ts">
import { computed, ref } from 'vue'
import { Copy, FileUp, Plus, Search, Trash2, Download, CornerDownRight } from 'lucide-vue-next'
import {
  addItem,
  addSection,
  addSystem,
  duplicateItem,
  exportProjectCsv,
  importProjectFile,
  itemCount,
  project,
  removeItem,
  removeSection,
  removeSystem,
  totals,
} from '@/store'
import type { LoadItem, LoadSection, LoadSystem, PhaseKey } from '@/types'
import { PHASES } from '@/types'
import { fmt, fmtKw, fmtWatts, clamp, toNumber } from '@/lib/format'

const search = ref('')
const onlyContributing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function emptySum() {
  return { connectedW: 0, bocW: 0, contW: 0, eodW: 0, items: 0 }
}

function sumItems(items: LoadItem[]) {
  const sum = emptySum()
  for (const item of items) {
    sum.connectedW += item.qty * item.watt
    sum.bocW += item.active.boc * item.watt
    sum.contW += item.active.cont * item.watt
    sum.eodW += item.active.eod * item.watt
    sum.items += 1
  }
  return sum
}

const filtering = computed(() => search.value.trim().length > 0 || onlyContributing.value)

function matches(item: LoadItem): boolean {
  if (onlyContributing.value && !(item.active.boc || item.active.cont || item.active.eod)) return false
  const term = search.value.trim().toLowerCase()
  if (!term) return true
  return `${item.code} ${item.description} ${item.remark ?? ''}`.toLowerCase().includes(term)
}

interface Group {
  system: LoadSystem
  items: LoadItem[]
  sections: { section: LoadSection; items: LoadItem[] }[]
  total: ReturnType<typeof sumItems>
}

const groups = computed<Group[]>(() =>
  project.value.systems
    .map((system) => {
      const items = system.items.filter(matches)
      const sections = system.sections
        .map((section) => ({ section, items: section.items.filter(matches) }))
        .filter((entry) => !filtering.value || entry.items.length > 0)
      const all = [...items, ...sections.flatMap((entry) => entry.items)]
      return {
        system,
        items,
        sections,
        total: sumItems(all),
        visible: !filtering.value || all.length > 0,
      }
    })
    .filter((group) => group.visible),
)

const shownItems = computed(() =>
  groups.value.reduce((count, group) => count + group.items.length + group.sections.reduce((n, entry) => n + entry.items.length, 0), 0),
)

function setQty(item: LoadItem, value: number): void {
  item.qty = Math.max(1, Math.round(value))
  for (const phase of PHASES) {
    if (item.active[phase.key] > item.qty) item.active[phase.key] = item.qty
  }
}

function setWatt(item: LoadItem, value: number): void {
  item.watt = Math.max(0, Math.round(value * 1000) / 1000)
}

function setActive(item: LoadItem, phase: PhaseKey, value: number): void {
  item.active[phase] = clamp(Math.round(value), 0, item.qty)
}

function toggleAllPhases(item: LoadItem): void {
  const allOn = PHASES.every((phase) => item.active[phase.key] === item.qty)
  for (const phase of PHASES) item.active[phase.key] = allOn ? 0 : item.qty
}

function onFile(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => importProjectFile(String(reader.result))
  reader.readAsText(file)
  input.value = ''
}

const phaseColor: Record<PhaseKey, string> = {
  boc: 'var(--accent)',
  cont: 'var(--teal)',
  eod: 'var(--indigo)',
}
</script>

<template>
  <div>
    <header class="page-head">
      <div>
        <div class="eyebrow">Register <span class="dot" /> {{ totals.items }} line items</div>
        <h1 class="page-head__title">Load register</h1>
        <p class="page-head__sub">
          Edit panels, watts and active units per discharge window. Connected load is panels × watts; each phase counts
          only the units actually drawing in that window.
        </p>
      </div>
      <div class="page-actions">
        <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="onFile" />
        <button class="btn" type="button" @click="fileInput?.click()">
          <FileUp :size="13" :stroke-width="1.7" /> Import
        </button>
        <button class="btn" type="button" @click="exportProjectCsv">
          <Download :size="13" :stroke-width="1.7" /> CSV
        </button>
        <button class="btn btn--primary" type="button" @click="addSystem">
          <Plus :size="13" :stroke-width="2" /> Add system
        </button>
      </div>
    </header>

    <section class="totals-strip">
      <div class="totals-strip__item">
        <span>Connected</span>
        <strong>{{ fmtKw(totals.connectedW) }}</strong>
      </div>
      <div class="totals-strip__item">
        <span>Beginning</span>
        <strong>{{ fmtWatts(totals.bocW, 1) }}</strong>
      </div>
      <div class="totals-strip__item">
        <span>Continuous</span>
        <strong>{{ fmtKw(totals.contW) }}</strong>
      </div>
      <div class="totals-strip__item">
        <span>End</span>
        <strong>{{ fmtKw(totals.eodW) }}</strong>
      </div>
      <div class="totals-strip__spacer" />
      <div class="totals-strip__legend">
        <span v-for="phase in PHASES" :key="phase.key" class="legend__item" :style="{ color: phaseColor[phase.key] }">
          <span class="legend__swatch" /> {{ phase.short }} <span class="dim">{{ phase.window }}</span>
        </span>
      </div>
    </section>

    <div class="toolbar">
      <label class="search">
        <Search :size="14" :stroke-width="1.7" />
        <input v-model="search" type="search" placeholder="Filter loads by description, code or remark…" />
        <button v-if="search" class="search__clear" type="button" @click="search = ''">clear</button>
      </label>
      <button
        class="btn"
        type="button"
        :class="{ 'btn--primary': onlyContributing }"
        :aria-pressed="onlyContributing"
        @click="onlyContributing = !onlyContributing"
      >
        Contributing only
      </button>
      <span class="tiny dim toolbar__count">
        {{ shownItems }} of {{ itemCount }} shown
      </span>
    </div>

    <div class="card card--flush register">
      <div class="table-wrap tbl-scroll">
        <table class="data register-table">
          <thead>
            <tr>
              <th class="left" style="width: 92px">Item</th>
              <th class="left">Description</th>
              <th style="width: 66px">Panels</th>
              <th style="width: 88px">W / unit</th>
              <th style="width: 96px">Connected</th>
              <th v-for="phase in PHASES" :key="phase.key" :style="{ color: phaseColor[phase.key], width: '66px' }" :title="phase.hint">
                {{ phase.short }}
              </th>
              <th style="width: 56px" />
            </tr>
          </thead>

          <tbody v-for="group in groups" :key="group.system.id">
            <tr class="system-row">
              <td class="left mono">
                <input v-model="group.system.code" class="cell-input cell-input--code" aria-label="System code" style="color: inherit" />
              </td>
              <td class="left" colspan="4">
                <input v-model="group.system.name" class="cell-input cell-input--text" aria-label="System name" style="color: inherit" spellcheck="false" />
              </td>
              <td>{{ fmtWatts(group.total.bocW, 1) }}</td>
              <td>{{ fmtWatts(group.total.contW, 0) }}</td>
              <td>{{ fmtWatts(group.total.eodW, 0) }}</td>
              <td>
                <div class="row-actions">
                  <button class="btn btn--sm btn--ghost" type="button" title="Add section" @click="addSection(group.system.id)">
                    <Plus :size="12" :stroke-width="2" />
                  </button>
                  <button class="btn btn--sm btn--ghost btn--danger" type="button" title="Remove system" @click="removeSystem(group.system.id)">
                    <Trash2 :size="12" :stroke-width="1.8" />
                  </button>
                </div>
              </td>
            </tr>

            <tr v-for="item in group.items" :key="item.id">
              <td class="left">
                <input v-model="item.code" class="cell-input cell-input--code" aria-label="Item code" spellcheck="false" />
              </td>
              <td class="name">
                <input v-model="item.description" class="cell-input cell-input--text" aria-label="Load description" spellcheck="false" />
                <input
                  v-model="item.remark"
                  class="cell-input cell-input--text remark"
                  placeholder="add remark"
                  spellcheck="false"
                />
              </td>
              <td>
                <input
                  class="cell-input cell-input--qty"
                  type="number"
                  min="1"
                  :value="item.qty"
                  @input="setQty(item, toNumber(($event.target as HTMLInputElement).value, item.qty))"
                />
              </td>
              <td>
                <input
                  class="cell-input"
                  type="number"
                  min="0"
                  step="0.1"
                  :value="item.watt"
                  @input="setWatt(item, toNumber(($event.target as HTMLInputElement).value, item.watt))"
                />
              </td>
              <td class="connected">{{ fmt(item.qty * item.watt, item.qty * item.watt % 1 === 0 ? 0 : 2) }}</td>
              <td v-for="phase in PHASES" :key="phase.key">
                <input
                  class="cell-input cell-input--phase"
                  :class="{ on: item.active[phase.key] > 0 }"
                  type="number"
                  min="0"
                  :max="item.qty"
                  :style="{ color: item.active[phase.key] > 0 ? phaseColor[phase.key] : 'var(--muted-2)' }"
                  :title="`${phase.label}: ${fmtWatts(item.active[phase.key] * item.watt, 2)}`"
                  :value="item.active[phase.key]"
                  @input="setActive(item, phase.key, toNumber(($event.target as HTMLInputElement).value, item.active[phase.key]))"
                />
              </td>
              <td>
                <div class="row-actions">
                  <button class="btn btn--sm btn--ghost" type="button" title="Toggle all phases" @click="toggleAllPhases(item)">
                    <CornerDownRight :size="12" :stroke-width="1.8" />
                  </button>
                  <button class="btn btn--sm btn--ghost" type="button" title="Duplicate" @click="duplicateItem(item.id)">
                    <Copy :size="12" :stroke-width="1.8" />
                  </button>
                  <button class="btn btn--sm btn--ghost btn--danger" type="button" title="Remove" @click="removeItem(item.id)">
                    <Trash2 :size="12" :stroke-width="1.8" />
                  </button>
                </div>
              </td>
            </tr>

            <template v-for="entry in group.sections" :key="entry.section.id">
              <tr class="group-row">
                <td class="left">
                  <input v-model="entry.section.code" class="cell-input cell-input--code" aria-label="Section code" spellcheck="false" />
                </td>
                <td class="left" colspan="4">
                  <div class="group-name">
                    <input v-model="entry.section.name" class="cell-input cell-input--text" aria-label="Section name" spellcheck="false" />
                    <span class="tiny dim">{{ entry.items.length }} loads</span>
                  </div>
                </td>
                <td class="mono">{{ fmtWatts(sumItems(entry.items).bocW, 1) }}</td>
                <td class="mono">{{ fmtWatts(sumItems(entry.items).contW, 0) }}</td>
                <td class="mono">{{ fmtWatts(sumItems(entry.items).eodW, 0) }}</td>
                <td>
                  <div class="row-actions">
                    <button class="btn btn--sm btn--ghost" type="button" title="Add load" @click="addItem(group.system.id, entry.section.id)">
                      <Plus :size="12" :stroke-width="2" />
                    </button>
                    <button class="btn btn--sm btn--ghost btn--danger" type="button" title="Remove section" @click="removeSection(group.system.id, entry.section.id)">
                      <Trash2 :size="12" :stroke-width="1.8" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-for="item in entry.items" :key="item.id">
                <td class="left">
                  <input v-model="item.code" class="cell-input cell-input--code" aria-label="Item code" spellcheck="false" />
                </td>
                <td class="name">
                  <input v-model="item.description" class="cell-input cell-input--text" aria-label="Load description" spellcheck="false" />
                  <input v-model="item.remark" class="cell-input cell-input--text remark" aria-label="Remark" placeholder="add remark" spellcheck="false" />
                </td>
                <td>
                  <input
                    class="cell-input cell-input--qty"
                    type="number"
                    min="1"
                    aria-label="Panel quantity"
                    :value="item.qty"
                    @input="setQty(item, toNumber(($event.target as HTMLInputElement).value, item.qty))"
                  />
                </td>
                <td>
                  <input
                    class="cell-input"
                    type="number"
                    min="0"
                    step="0.1"
                    aria-label="Watts per unit"
                    :value="item.watt"
                    @input="setWatt(item, toNumber(($event.target as HTMLInputElement).value, item.watt))"
                  />
                </td>
                <td class="connected">{{ fmt(item.qty * item.watt, item.qty * item.watt % 1 === 0 ? 0 : 2) }}</td>
                <td v-for="phase in PHASES" :key="phase.key">
                  <input
                    class="cell-input cell-input--phase"
                    :class="{ on: item.active[phase.key] > 0 }"
                    type="number"
                    min="0"
                    :max="item.qty"
                    :aria-label="`${phase.label} active units`"
                    :style="{ color: item.active[phase.key] > 0 ? phaseColor[phase.key] : 'var(--muted-2)' }"
                    :title="`${phase.label}: ${fmtWatts(item.active[phase.key] * item.watt, 2)}`"
                    :value="item.active[phase.key]"
                    @input="setActive(item, phase.key, toNumber(($event.target as HTMLInputElement).value, item.active[phase.key]))"
                  />
                </td>
                <td>
                  <div class="row-actions">
                    <button class="btn btn--sm btn--ghost" type="button" title="Toggle all phases" @click="toggleAllPhases(item)">
                      <CornerDownRight :size="12" :stroke-width="1.8" />
                    </button>
                    <button class="btn btn--sm btn--ghost" type="button" title="Duplicate" @click="duplicateItem(item.id)">
                      <Copy :size="12" :stroke-width="1.8" />
                    </button>
                    <button class="btn btn--sm btn--ghost btn--danger" type="button" title="Remove" @click="removeItem(item.id)">
                      <Trash2 :size="12" :stroke-width="1.8" />
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="!entry.items.length" class="empty-row">
                <td colspan="9">
                  No loads in this section.
                  <button class="btn btn--sm" type="button" @click="addItem(group.system.id, entry.section.id)">
                    <Plus :size="11" :stroke-width="2" /> Add load
                  </button>
                </td>
              </tr>
            </template>

            <tr v-if="!group.sections.length" class="add-row">
              <td colspan="9">
                <button class="btn btn--sm btn--ghost" type="button" @click="addItem(group.system.id)">
                  <Plus :size="11" :stroke-width="2" /> Add load
                </button>
                <button class="btn btn--sm btn--ghost" type="button" @click="addSection(group.system.id)">
                  <Plus :size="11" :stroke-width="2" /> Add section
                </button>
              </td>
            </tr>
          </tbody>

          <tfoot>
            <tr class="total-row">
              <td class="left" colspan="2">Total — all listed loads</td>
              <td>{{ totals.items }}</td>
              <td />
              <td>{{ fmt(totals.connectedW, 2) }}</td>
              <td>{{ fmt(totals.bocW, 2) }}</td>
              <td>{{ fmt(totals.contW, 2) }}</td>
              <td>{{ fmt(totals.eodW, 2) }}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <p class="register-note tiny dim">
      Phase cells hold the number of units drawing in that window — not watts. Values are clamped to the panel count.
      Connected load counts every listed item, including devices that only operate on fault and are excluded from the
      discharge profile.
    </p>
  </div>
</template>

<style scoped>
.totals-strip {
  display: flex;
  align-items: center;
  gap: 28px;
  flex-wrap: wrap;
  padding: 14px 18px;
  margin-bottom: 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
}

.totals-strip__item span {
  display: block;
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted-2);
}

.totals-strip__item strong {
  display: block;
  margin-top: 2px;
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.02em;
}

.totals-strip__spacer {
  flex: 1;
}

.totals-strip__legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 240px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--surface);
  color: var(--muted);
}

.search:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 10%, transparent);
}

.search input {
  flex: 1;
  border: 0;
  background: none;
  outline: none;
  font-size: 12.5px;
  color: var(--ink);
}

.search input::placeholder {
  color: var(--muted-2);
}

.search__clear {
  border: 0;
  background: none;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.toolbar__count {
  margin-left: auto;
}

.register {
  overflow: hidden;
}

.register-table td {
  padding-top: 5px;
  padding-bottom: 5px;
}

.register-table .cell-input--text {
  min-width: 220px;
}

.remark {
  font-size: 10px;
  color: var(--muted-2);
  font-style: italic;
}

.remark::placeholder {
  font-style: normal;
  opacity: 0.55;
}

.connected {
  color: var(--ink);
}

.system-row td {
  padding-top: 8px;
  padding-bottom: 8px;
}

.system-row .cell-input {
  font-weight: 500;
}

.group-row td {
  font-size: 11.5px;
}

.group-row .cell-input--text {
  font-weight: 500;
  max-width: 320px;
}

.empty-row {
  padding: 14px 22px !important;
  text-align: left !important;
  font-family: var(--font-sans) !important;
  color: var(--muted) !important;
  font-size: 11.5px;
}

.empty-row .btn {
  margin-left: 12px;
}

.add-row td {
  padding: 6px 22px;
  text-align: left;
}

.register-note {
  margin-top: 12px;
  line-height: 1.6;
}

@media (max-width: 720px) {
  .totals-strip {
    gap: 16px;
  }
  .totals-strip__legend {
    display: none;
  }
}
</style>
