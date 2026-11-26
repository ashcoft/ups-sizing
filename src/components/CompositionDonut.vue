<script setup lang="ts">
import { computed, ref } from 'vue'
import { fmt, fmtKw } from '@/lib/format'

interface Slice {
  label: string
  value: number
  color: string
}

const props = withDefaults(
  defineProps<{
    slices: Slice[]
    total: number
    unit?: string
    centerLabel?: string
  }>(),
  { unit: 'kW', centerLabel: 'connected load' },
)

const size = 220
const center = size / 2
const radius = 88
const inner = 62

const hovered = ref<number | null>(null)

const positive = computed(() => props.slices.filter((slice) => slice.value > 0))
const single = computed(() => (positive.value.length === 1 ? positive.value[0] : null))

const arcs = computed(() => {
  const total = positive.value.reduce((sum, slice) => sum + slice.value, 0) || 1
  let angle = -Math.PI / 2
  const gap = positive.value.length > 1 ? 0.022 : 0
  return positive.value.map((slice, index) => {
    const sweep = Math.max((Math.max(slice.value, 0) / total) * Math.PI * 2 - gap, 0.004)
    const start = angle + gap / 2
    const end = start + sweep
    angle += (Math.max(slice.value, 0) / total) * Math.PI * 2
    const mid = (start + end) / 2
    const active = hovered.value === index
    const offset = active ? 4 : 0
    const rOuter = radius + offset
    return {
      index,
      ...slice,
      path: donutSlice(start, end, rOuter, inner),
      mid,
      percent: (Math.max(slice.value, 0) / total) * 100,
    }
  })
})

function polar(angle: number, r: number) {
  return { x: center + Math.cos(angle) * r, y: center + Math.sin(angle) * r }
}

function donutSlice(start: number, end: number, outer: number, innerR: number): string {
  const large = end - start > Math.PI ? 1 : 0
  const p1 = polar(start, outer)
  const p2 = polar(end, outer)
  const p3 = polar(end, innerR)
  const p4 = polar(start, innerR)
  return [
    `M${p1.x.toFixed(2)},${p1.y.toFixed(2)}`,
    `A${outer},${outer} 0 ${large} 1 ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`,
    `L${p3.x.toFixed(2)},${p3.y.toFixed(2)}`,
    `A${innerR},${innerR} 0 ${large} 0 ${p4.x.toFixed(2)},${p4.y.toFixed(2)}`,
    'Z',
  ].join(' ')
}

const activeSlice = computed(() =>
  hovered.value === null ? single.value : (positive.value[hovered.value] ?? null),
)

const centerValue = computed(() =>
  activeSlice.value ? activeSlice.value.value / 1000 : props.total / 1000,
)

const displayUnit = computed(() => (activeSlice.value ? 'kW' : props.unit))
</script>

<template>
  <div class="donut">
    <div class="donut__figure">
      <svg :width="size" :height="size" role="img" aria-label="Connected load by switchboard">
        <circle :cx="center" :cy="center" :r="(radius + inner) / 2" fill="none" stroke="var(--line-soft)" stroke-width="1" />
        <circle
          v-if="single"
          :cx="center"
          :cy="center"
          :r="(radius + inner) / 2"
          fill="none"
          :stroke="single.color"
          :stroke-width="radius - inner"
          class="donut__arc"
        >
          <title>{{ single.label }} — {{ fmtKw(single.value) }}</title>
        </circle>
        <g v-for="arc in arcs" :key="arc.label">
          <path
            :d="arc.path"
            :fill="arc.color"
            :opacity="hovered === null || hovered === arc.index ? 0.92 : 0.32"
            class="donut__arc"
            @pointerenter="hovered = arc.index"
            @pointerleave="hovered = null"
          >
            <title>{{ arc.label }} — {{ fmtKw(arc.value) }}</title>
          </path>
        </g>
        <text :x="center" :y="center - 4" text-anchor="middle" font-size="23" font-weight="500" fill="var(--ink)" class="num">
          {{ fmt(centerValue, centerValue < 10 ? 2 : 1) }}
        </text>
        <text :x="center" :y="center + 14" text-anchor="middle" font-size="8.5" letter-spacing="0.16em" fill="var(--muted)">
          {{ displayUnit.toUpperCase() }}
        </text>
        <text :x="center" :y="center + 32" text-anchor="middle" font-size="8" letter-spacing="0.1em" fill="var(--muted-2)">
          {{ activeSlice ? activeSlice.label.slice(0, 22).toUpperCase() : centerLabel.toUpperCase() }}
        </text>
      </svg>
    </div>

    <ul class="donut__legend">
      <li
        v-for="(arc, index) in arcs"
        :key="arc.label"
        :class="{ 'is-active': hovered === index }"
        @pointerenter="hovered = index"
        @pointerleave="hovered = null"
      >
        <span class="donut__swatch" :style="{ background: arc.color }" />
        <span class="donut__label">{{ arc.label }}</span>
        <span class="donut__value">{{ fmtKw(arc.value) }}</span>
        <span class="donut__pct">{{ fmt(arc.percent, 1) }}%</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.donut {
  display: flex;
  align-items: center;
  gap: 22px;
  flex-wrap: wrap;
}

.donut__figure {
  flex: none;
  margin-left: -6px;
}

.donut__arc {
  transition: opacity 0.18s ease;
  cursor: default;
}

.donut__legend {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  min-width: 170px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.donut__legend li {
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 9px;
  padding: 6px 4px;
  border-bottom: 1px solid var(--line-soft);
  font-size: 11.5px;
  transition: background 0.15s ease;
}

.donut__legend li:last-child {
  border-bottom: 0;
}

.donut__legend li.is-active {
  background: var(--surface-2);
}

.donut__swatch {
  width: 8px;
  height: 8px;
  border-radius: 1px;
}

.donut__label {
  color: var(--ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.donut__value {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink);
}

.donut__pct {
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--muted-2);
  min-width: 34px;
  text-align: right;
}
</style>
