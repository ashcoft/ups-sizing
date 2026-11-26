<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowUpRight, Check, CircleAlert, ShieldCheck } from 'lucide-vue-next'
import { checks, checksPassed, designOk, go, project, requiredAh, sizing, systemRows, totals } from '@/store'
import { PHASES } from '@/types'
import { fmt, fmtA, fmtKw, fmtMinutes, fmtPct, fmtWatts } from '@/lib/format'
import AnimatedNumber from '@/components/ui/AnimatedNumber.vue'
import LoadProfileChart from '@/components/LoadProfileChart.vue'
import CompositionDonut from '@/components/CompositionDonut.vue'
import SectionChart from '@/components/SectionChart.vue'

const mode = ref<'power' | 'current'>('power')

const profileSeries = computed(() => {
  const [boc, cont, eod] = sizing.value.periods
  const values = [0, boc?.loadW ?? 0, cont?.loadW ?? 0, cont?.loadW ?? 0, eod?.loadW ?? 0, 0]
  return mode.value === 'power' ? values.map((watt) => watt / 1000) : values.map((watt) => watt / project.value.sizing.minVoltage)
})

const slices = computed(() =>
  systemRows.value.map((row) => ({
    label: row.system.name,
    value: row.totals.connectedW,
    color: row.color,
  })),
)

const heroMeta = computed(() => [
  { label: 'Document', value: project.value.meta.docNo },
  { label: 'Revision', value: project.value.meta.revision },
  { label: 'Discipline', value: project.value.meta.discipline },
  { label: 'Prepared', value: project.value.meta.preparedBy },
])

const phaseCards = computed(() =>
  sizing.value.periods.map((period) => ({
    key: period.phase,
    label: PHASES.find((phase) => phase.key === period.phase)?.label ?? period.phase,
    value: period.loadW,
    window: `${fmt(period.startMin, 0)} – ${fmt(period.endMin, 0)} min`,
  })),
)

const openRequired = computed(() => checks.value.filter((check) => check.required && !check.ok))

const contShare = computed(() => (totals.value.connectedW > 0 ? (totals.value.contW / totals.value.connectedW) * 100 : 0))
const governing = computed(() => sizing.value.sections[sizing.value.governingIndex])
</script>

<template>
  <div>
    <section class="hero">
      <div class="hero__main">
        <div class="eyebrow">Calculation note <span class="dot" /> DC UPS load list &amp; battery</div>
        <h1 class="hero__title display">DC UPS load list<br /><em>&amp; battery sizing</em></h1>
        <p class="hero__project">{{ project.meta.project }}</p>
        <dl class="hero__meta">
          <div v-for="item in heroMeta" :key="item.label">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>
      </div>

      <aside class="verdict card card--ticked rise">
        <div class="verdict__top">
          <div>
            <div class="eyebrow">Sizing outcome</div>
            <div class="verdict__cell">
              <AnimatedNumber :value="project.sizing.selectedCellAh" />
              <span>Ah</span>
            </div>
            <div class="verdict__model">{{ project.sizing.cellModel }} · {{ project.sizing.redundancy }} strings</div>
          </div>
          <div class="stamp" :class="{ 'stamp--warn': !designOk }">
            <span class="stamp__top">Design</span>
            <span class="stamp__big">{{ designOk ? 'Verified' : 'Review' }}</span>
            <span class="stamp__bottom">Rev {{ project.meta.revision }} · {{ sizing.endCellVoltage.toFixed(2) }} V/cell</span>
          </div>
        </div>

        <div class="verdict__grid">
          <div>
            <span>Duty required</span>
            <strong>{{ fmt(requiredAh, 1) }} Ah</strong>
          </div>
          <div>
            <span>Headroom</span>
            <strong :class="{ warn: sizing.headroomPct < 0 }">{{ sizing.headroomPct >= 0 ? '+' : '' }}{{ fmt(sizing.headroomPct, 1) }}%</strong>
          </div>
          <div>
            <span>Governing section</span>
            <strong>{{ fmt(governing?.ah ?? 0, 1) }} Ah</strong>
          </div>
          <div>
            <span>End of discharge</span>
            <strong>{{ fmtMinutes(sizing.autonomyMin) }}</strong>
          </div>
        </div>

        <ul class="verdict__checks">
          <li v-for="check in checks.filter((entry) => entry.required).slice(0, 3)" :key="check.key">
            <Check v-if="check.ok" :size="12" :stroke-width="2.4" class="ok" />
            <CircleAlert v-else :size="12" :stroke-width="2.2" class="warn" />
            {{ check.label }}
          </li>
        </ul>

        <p v-if="openRequired.length" class="verdict__flag">
          {{ openRequired.length }} required check{{ openRequired.length > 1 ? 's' : '' }} open — verification withheld.
        </p>
      </aside>
    </section>

    <section class="grid grid--4 kpis">
      <article class="kpi rise" style="animation-delay: 40ms">
        <div class="kpi__top">
          <span class="kpi__label">Connected load</span>
          <span class="pill">nameplate</span>
        </div>
        <div class="kpi__value">
          <AnimatedNumber :value="totals.connectedW / 1000" :digits="2" /><small>kW</small>
        </div>
        <div class="kpi__foot">{{ totals.items }} loads across {{ project.systems.length }} boards</div>
        <div class="kpi__share" aria-hidden="true">
          <span
            v-for="row in systemRows"
            :key="row.system.id"
            :style="{ width: `${(row.totals.connectedW / Math.max(totals.connectedW, 1)) * 100}%`, background: row.color }"
          />
        </div>
      </article>

      <article class="kpi rise" style="animation-delay: 80ms">
        <div class="kpi__top">
          <span class="kpi__label">Continuous load</span>
          <span class="pill pill--cont">{{ fmtMinutes(project.sizing.autonomyMin) }}</span>
        </div>
        <div class="kpi__value">
          <AnimatedNumber :value="totals.contW / 1000" :digits="2" /><small>kW</small>
        </div>
        <div class="kpi__foot">{{ fmtPct(contShare, 1) }} of connected · steady state</div>
      </article>

      <article class="kpi rise" style="animation-delay: 120ms">
        <div class="kpi__top">
          <span class="kpi__label">Design current</span>
          <span class="pill">{{ project.sizing.minVoltage }} V min</span>
        </div>
        <div class="kpi__value">
          <AnimatedNumber :value="sizing.designCurrentA" :digits="2" /><small>A</small>
        </div>
        <div class="kpi__foot">{{ fmt(project.sizing.minVoltage / sizing.cellsPerString, 2) }} V/cell · {{ sizing.cellsPerString }} cells</div>
      </article>

      <article class="kpi rise" style="animation-delay: 160ms">
        <div class="kpi__top">
          <span class="kpi__label">Duty required</span>
          <span class="pill" :class="sizing.headroomPct >= 0 ? 'pill--ok' : 'pill--warn'">
            {{ sizing.headroomPct >= 0 ? 'covered' : 'short' }}
          </span>
        </div>
        <div class="kpi__value">
          <AnimatedNumber :value="requiredAh" :digits="1" /><small>Ah</small>
        </div>
        <div class="kpi__foot">max section {{ fmt(sizing.maxSectionAh, 1) }} Ah × {{ fmt(sizing.marginFactor, 2) }}</div>
      </article>
    </section>

    <section class="grid grid--12 charts">
      <article class="card col-8">
        <div class="card__head">
          <div>
            <h2 class="card__title">Discharge load profile</h2>
            <p class="card__sub">
              {{ fmtMinutes(project.sizing.autonomyMin) }} autonomy at {{ project.sizing.minVoltage }} V minimum —
              beginning, continuous and end-of-discharge windows.
            </p>
          </div>
          <div class="segmented" role="group" aria-label="Profile unit">
            <button type="button" :aria-pressed="mode === 'power'" @click="mode = 'power'">kW</button>
            <button type="button" :aria-pressed="mode === 'current'" @click="mode = 'current'">amps</button>
          </div>
        </div>
        <div class="card__body">
          <LoadProfileChart :periods="sizing.periods" :autonomy="project.sizing.autonomyMin" :mode="mode" :height="296" />
          <div class="legend profile-legend">
            <span v-for="phase in phaseCards" :key="phase.key" class="legend__item" :style="{ color: `var(--${phase.key === 'boc' ? 'accent' : phase.key === 'cont' ? 'teal' : 'indigo'})` }">
              <span class="legend__swatch" />
              {{ phase.label }}
              <strong class="mono">{{ fmtKw(phase.value) }}</strong>
              <span class="dim">{{ phase.window }}</span>
            </span>
          </div>
        </div>
      </article>

      <article class="card col-4">
        <div class="card__head">
          <div>
            <h2 class="card__title">Load by board</h2>
            <p class="card__sub">Share of connected nameplate load.</p>
          </div>
        </div>
        <div class="card__body">
          <CompositionDonut :slices="slices" :total="totals.connectedW" unit="kW" center-label="connected" />
          <p class="tiny dim board-note">
            Connected nameplate load per board. Continuous contribution is
            {{ fmtKw(totals.contW) }} of {{ fmtKw(totals.connectedW) }}.
          </p>
        </div>
      </article>

      <article class="card col-7">
        <div class="card__head">
          <div>
            <h2 class="card__title">Section accumulation</h2>
            <p class="card__sub">IEEE 485 section method — capacity required at the end of each window.</p>
          </div>
          <span class="pill">{{ governing?.phase.toUpperCase() }} governs</span>
        </div>
        <div class="card__body">
          <SectionChart
            :sections="sizing.sections"
            :required-ah="requiredAh"
            :selected-ah="project.sizing.selectedCellAh"
            :height="284"
          />
          <p class="tiny dim chart-note">
            Negative deltas at load drop-off reduce the accumulated capacity. Governing section is
            <strong class="mono">{{ governing?.phase.toUpperCase() }}</strong> at
            <strong class="mono">{{ fmt(governing?.ah ?? 0, 1) }} Ah</strong> before aging and spare allowances.
          </p>
        </div>
      </article>

      <article class="card col-5">
        <div class="card__head">
          <div>
            <h2 class="card__title">Design checks</h2>
            <p class="card__sub">{{ checksPassed }} of {{ checks.length }} criteria satisfied.</p>
          </div>
          <ShieldCheck :size="17" :stroke-width="1.5" class="dim" />
        </div>
        <div class="card__body card__body--tight">
          <ul class="checks">
            <li v-for="check in checks" :key="check.key">
              <span class="checks__icon" :class="check.ok ? 'ok' : 'warn'">
                <Check v-if="check.ok" :size="11" :stroke-width="2.6" />
                <CircleAlert v-else :size="11" :stroke-width="2.4" />
              </span>
              <span class="checks__body">
                <span class="checks__label">{{ check.label }}</span>
                <span class="checks__detail">{{ check.detail }}</span>
              </span>
            </li>
          </ul>
          <div class="checks__foot">
            <button class="btn btn--sm" type="button" @click="go('sizing')">
              Open battery sizing
              <ArrowUpRight :size="12" :stroke-width="1.8" />
            </button>
            <button class="btn btn--sm btn--ghost" type="button" @click="go('loads')">Review {{ totals.items }} loads</button>
          </div>
        </div>
      </article>
    </section>

    <section class="basis">
      <div class="basis__item">
        <span class="eyebrow">Duty basis</span>
        <p>
          {{ fmtA(sizing.designCurrentA, 2) }} for {{ fmtMinutes(project.sizing.autonomyMin) }} at
          {{ project.sizing.minVoltage }} V minimum, with {{ fmtPct(project.sizing.agingFactor * 100, 0) }} aging and
          {{ fmtPct(project.sizing.spareFactor * 100, 0) }} future spare applied to the governing section.
        </p>
      </div>
      <div class="basis__item">
        <span class="eyebrow">Stored energy</span>
        <p>{{ fmt(sizing.energyWh / 1000, 2) }} kWh delivered over the autonomy window · average {{ fmtA(sizing.avgCurrentA, 2) }} · {{ fmt(sizing.cRate, 3) }} C on the selected cell.</p>
      </div>
      <div class="basis__item">
        <span class="eyebrow">Profile windows</span>
        <p>
          BOC {{ fmtWatts(totals.bocW, 1) }} for 1 min → CONT {{ fmtWatts(totals.contW, 0) }} for
          {{ fmtMinutes(project.sizing.autonomyMin - 2) }} → EOD {{ fmtWatts(totals.eodW, 1) }} for 1 min.
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(340px, 0.85fr);
  gap: 28px;
  align-items: stretch;
  margin-bottom: 24px;
}

.hero__main {
  padding-top: 4px;
}

.hero__title {
  margin-top: 14px;
  font-size: clamp(36px, 4.4vw, 62px);
  letter-spacing: -0.025em;
}

.hero__title em {
  font-style: italic;
  color: var(--accent);
}

.hero__project {
  margin-top: 14px;
  max-width: 58ch;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.6;
}

.hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 30px;
  margin: 22px 0 0;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.hero__meta dt {
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted-2);
}

.hero__meta dd {
  margin: 3px 0 0;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-soft);
}

.verdict {
  padding: 20px 22px 18px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent) 3%, transparent), transparent 45%),
    var(--surface);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.verdict__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.verdict__cell {
  margin-top: 8px;
  font-family: var(--font-mono);
  font-size: 46px;
  font-weight: 500;
  letter-spacing: -0.05em;
  line-height: 0.95;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.verdict__cell span {
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0;
  color: var(--muted);
}

.verdict__model {
  margin-top: 7px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.stamp--warn {
  --stamp-color: var(--accent);
}

.verdict__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  background: var(--line-soft);
  border: 1px solid var(--line-soft);
}

.verdict__grid > div {
  background: var(--surface);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.verdict__grid span {
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted-2);
}

.verdict__grid strong {
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: 12.5px;
  color: var(--ink);
}

.verdict__grid strong.warn {
  color: var(--accent);
}

.verdict__checks {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.verdict__checks li {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10.5px;
  color: var(--muted);
}

.verdict__flag {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.04em;
  color: var(--accent);
}

.ok {
  color: var(--teal);
}

.warn {
  color: var(--accent);
}

.kpis {
  margin-bottom: 18px;
}

.charts {
  margin-bottom: 18px;
  align-items: start;
}

.profile-legend {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--line-soft);
  gap: 10px 22px;
}

.profile-legend strong {
  color: var(--ink);
  font-size: 10px;
}

.board-note {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line-soft);
  font-size: 9.5px;
  line-height: 1.6;
}

.chart-note {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--line-soft);
  font-size: 10px;
  line-height: 1.6;
}

.checks {
  list-style: none;
  margin: 0;
  padding: 0;
}

.checks li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 8px;
  border-bottom: 1px solid var(--line-soft);
}

.checks li:last-child {
  border-bottom: 0;
}

.checks__icon {
  flex: none;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid currentColor;
  margin-top: 1px;
}

.checks__body {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.checks__label {
  font-size: 11.5px;
  color: var(--ink);
}

.checks__detail {
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--muted-2);
}

.checks__foot {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px 8px 2px;
}

.basis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
  padding: 18px 0 0;
  border-top: 1px solid var(--line);
}

.basis__item p {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--muted);
}

@media (max-width: 1100px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
  }
  .basis {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }
}
</style>
