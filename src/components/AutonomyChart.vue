<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { AutonomyPoint } from '@/lib/sizing'
import { fmt, fmtAh, fmtMinutes } from '@/lib/format'

const props = withDefaults(
  defineProps<{
    points: AutonomyPoint[]
    designMinutes: number
    selectedAh: number
    height?: number
  }>(),
  { height: 250 },
)

const emit = defineEmits<{ select: [minutes: number] }>()

const host = ref<HTMLElement | null>(null)
const width = ref(620)
let observer: ResizeObserver | null = null

onMounted(() => {
  const element = host.value
  if (!element) return
  const measure = () => {
    width.value = Math.max(300, Math.round(element.getBoundingClientRect().width))
  }
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure)
    observer.observe(element)
  }
})

onBeforeUnmount(() => observer?.disconnect())

const margin = { top: 20, right: 16, bottom: 30, left: 48 }
const plotWidth = computed(() => Math.max(140, width.value - margin.left - margin.right))
const plotHeight = computed(() => Math.max(100, props.height - margin.top - margin.bottom))

const xMin = computed(() => props.points[0]?.minutes ?? 30)
const xMax = computed(() => props.points[props.points.length - 1]?.minutes ?? 480)

const maxAh = computed(() =>
  Math.max(props.selectedAh, ...props.points.map((point) => point.requiredAh), 1),
)

function niceScale(max: number, count = 4): { max: number; ticks: number[] } {
  const rough = max / count
  const exponent = Math.pow(10, Math.floor(Math.log10(rough)))
  const candidates = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]
  const step = candidates.map((c) => c * exponent).find((c) => c >= rough) ?? 10 * exponent
  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let value = 0; value <= top + step / 2; value += step) ticks.push(Number(value.toFixed(6)))
  return { max: top, ticks }
}

const scale = computed(() => niceScale(maxAh.value * 1.08, 4))

const sx = (minutes: number): number =>
  margin.left + ((minutes - xMin.value) / Math.max(xMax.value - xMin.value, 1)) * plotWidth.value
const sy = (ah: number): number =>
  margin.top + plotHeight.value - (ah / Math.max(scale.value.max, 1e-6)) * plotHeight.value

const linePath = computed(() =>
  props.points.map((point, index) => `${index === 0 ? 'M' : 'L'}${sx(point.minutes).toFixed(2)},${sy(point.requiredAh).toFixed(2)}`).join(' '),
)

const areaPath = computed(() => {
  if (props.points.length === 0) return ''
  const baseline = margin.top + plotHeight.value
  return `${linePath.value} L${sx(xMax.value).toFixed(2)},${baseline} L${sx(xMin.value).toFixed(2)},${baseline} Z`
})

const xTicks = computed(() => {
  const ticks: number[] = []
  for (let minutes = Math.ceil(xMin.value / 60) * 60; minutes <= xMax.value; minutes += 60) ticks.push(minutes)
  return ticks
})

const designPoint = computed(() => {
  const nearest = props.points.reduce((best, point) =>
    Math.abs(point.minutes - props.designMinutes) < Math.abs(best.minutes - props.designMinutes) ? point : best,
  )
  return nearest
})

const hover = ref<AutonomyPoint | null>(null)

function onMove(event: PointerEvent): void {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const localX = event.clientX - rect.left
  const minutes = xMin.value + ((localX - margin.left) / plotWidth.value) * (xMax.value - xMin.value)
  const nearest = props.points.reduce((best, point) =>
    Math.abs(point.minutes - minutes) < Math.abs(best.minutes - minutes) ? point : best,
  )
  hover.value = nearest
}

function onClick(): void {
  if (hover.value) emit('select', hover.value.minutes)
}

const tipStyle = computed(() => {
  if (!hover.value) return {}
  const x = sx(hover.value.minutes)
  const y = sy(hover.value.requiredAh)
  return {
    left: `${Math.min(Math.max(x, 76), width.value - 76)}px`,
    top: `${Math.max(y - 6, 40)}px`,
  }
})
</script>

<template>
  <div ref="host" class="chart autonomy">
    <svg :width="width" :height="height" role="img" aria-label="Required capacity versus autonomy">
      <defs>
        <linearGradient id="autonomy-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.18" />
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.01" />
        </linearGradient>
      </defs>

      <g>
        <line
          v-for="tick in scale.ticks"
          :key="`y-${tick}`"
          :x1="margin.left"
          :x2="margin.left + plotWidth"
          :y1="sy(tick)"
          :y2="sy(tick)"
          stroke="var(--line-soft)"
        />
        <text
          v-for="tick in scale.ticks"
          :key="`yl-${tick}`"
          :x="margin.left - 9"
          :y="sy(tick) + 3.5"
          text-anchor="end"
          font-size="9"
          fill="var(--muted-2)"
        >
          {{ fmt(tick, 0) }}
        </text>
        <text
          v-for="tick in xTicks"
          :key="`x-${tick}`"
          :x="sx(tick)"
          :y="margin.top + plotHeight + 17"
          text-anchor="middle"
          font-size="9"
          fill="var(--muted-2)"
        >
          {{ tick }}
        </text>
        <text :x="margin.left - 9" :y="margin.top - 8" text-anchor="end" font-size="8.5" letter-spacing="0.1em" fill="var(--muted)">AH</text>
        <text
          :x="margin.left + plotWidth"
          :y="margin.top + plotHeight + 29"
          text-anchor="end"
          font-size="8.5"
          letter-spacing="0.1em"
          fill="var(--muted)"
        >
          AUTONOMY · MIN
        </text>
      </g>

      <!-- selected capacity line -->
      <line
        :x1="margin.left"
        :x2="margin.left + plotWidth"
        :y1="sy(selectedAh)"
        :y2="sy(selectedAh)"
        stroke="var(--ink)"
        stroke-width="1"
        stroke-dasharray="5 4"
        opacity="0.5"
      />
      <text
        :x="margin.left + plotWidth"
        :y="sy(selectedAh) - 5"
        text-anchor="end"
        font-size="8.5"
        letter-spacing="0.08em"
        fill="var(--muted)"
      >
        CELL {{ fmt(selectedAh, 0) }} Ah
      </text>

      <path :d="areaPath" fill="url(#autonomy-fill)" />
      <path :d="linePath" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" />

      <!-- design point -->
      <g>
        <line
          :x1="sx(designPoint.minutes)"
          :x2="sx(designPoint.minutes)"
          :y1="margin.top"
          :y2="margin.top + plotHeight"
          stroke="var(--accent)"
          stroke-width="1"
          stroke-dasharray="2 3"
          opacity="0.5"
        />
        <circle
          :cx="sx(designPoint.minutes)"
          :cy="sy(designPoint.requiredAh)"
          r="4.5"
          fill="var(--surface)"
          stroke="var(--accent)"
          stroke-width="2"
        />
        <text
          :x="sx(designPoint.minutes) + 8"
          :y="sy(designPoint.requiredAh) - 8"
          font-size="9.5"
          fill="var(--accent)"
        >
          {{ fmt(designPoint.requiredAh, 1) }} Ah @ {{ fmtMinutes(designPoint.minutes) }}
        </text>
      </g>

      <g v-if="hover">
        <circle :cx="sx(hover.minutes)" :cy="sy(hover.requiredAh)" r="4" fill="var(--accent)" />
      </g>

      <rect
        :x="margin.left"
        :y="margin.top"
        :width="plotWidth"
        :height="plotHeight"
        fill="transparent"
        class="hit"
        @pointermove="onMove"
        @pointerleave="hover = null"
        @click="onClick"
      />
    </svg>

    <div v-if="hover" class="chart-tip" :style="tipStyle">
      <div class="chart-tip__time">{{ fmtMinutes(hover.minutes) }} autonomy</div>
      <div class="chart-tip__value">{{ fmt(hover.requiredAh, 1) }} <span class="tiny">Ah</span></div>
      <div class="chart-tip__meta">click to apply</div>
    </div>
    <p class="tiny dim autonomy__hint">Required capacity recalculated with the section method across the autonomy range.</p>
  </div>
</template>

<style scoped>
.autonomy {
  min-height: 130px;
}

.hit {
  cursor: crosshair;
}

.autonomy__hint {
  margin-top: 4px;
  font-size: 10px;
}
</style>
