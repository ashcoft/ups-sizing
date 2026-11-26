<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ProfilePeriod } from '@/lib/sizing'
import { fmt, fmtA, fmtMinutes } from '@/lib/format'
import { prefersReducedMotion } from '@/lib/useSize'

const props = withDefaults(
  defineProps<{
    periods: ProfilePeriod[]
    autonomy: number
    mode?: 'power' | 'current'
    height?: number
  }>(),
  { mode: 'power', height: 300 },
)

const host = ref<HTMLElement | null>(null)
const width = ref(760)
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

const margin = { top: 18, right: 18, bottom: 30, left: 52 }

const plotWidth = computed(() => Math.max(120, width.value - margin.left - margin.right))
const plotHeight = computed(() => Math.max(120, props.height - margin.top - margin.bottom))

const valueOf = (period: ProfilePeriod): number =>
  props.mode === 'power' ? period.loadW / 1000 : period.loadA

const unit = computed(() => (props.mode === 'power' ? 'kW' : 'A'))

const maxValue = computed(() => Math.max(...props.periods.map(valueOf), 0.001))

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

const scale = computed(() => niceScale(maxValue.value * 1.08, 4))
const xMax = computed(() => Math.max(props.autonomy, 3))

const sx = (minutes: number): number => margin.left + (minutes / xMax.value) * plotWidth.value
const sy = (value: number): number =>
  margin.top + plotHeight.value - (value / Math.max(scale.value.max, 1e-6)) * plotHeight.value

const xTicks = computed(() => {
  const total = xMax.value
  const raw = [0, total * 0.25, total * 0.5, total * 0.75, total]
  return raw.map((tick) => ({ minutes: tick, x: sx(tick), label: fmt(tick, 0) }))
})

const points = computed(() =>
  props.periods.flatMap((period) => [
    { x: sx(period.startMin), y: sy(valueOf(period)) },
    { x: sx(period.endMin), y: sy(valueOf(period)) },
  ]),
)

const linePath = computed(() =>
  points.value.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' '),
)

const areaPath = computed(() => {
  const list = points.value
  if (list.length === 0) return ''
  const baseline = margin.top + plotHeight.value
  const first = list[0]
  const last = list[list.length - 1]
  return `${linePath.value} L${last.x.toFixed(2)},${baseline} L${first.x.toFixed(2)},${baseline} Z`
})

const drawn = ref(false)
onMounted(() => {
  if (prefersReducedMotion()) {
    drawn.value = true
    return
  }
  window.setTimeout(() => {
    drawn.value = true
  }, 120)
})

const hover = ref<{ minutes: number; period: ProfilePeriod; value: number } | null>(null)

function onMove(event: PointerEvent): void {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const minutes = ratio * xMax.value
  const period =
    props.periods.find((entry) => minutes >= entry.startMin && minutes <= entry.endMin) ??
    props.periods[props.periods.length - 1]
  if (!period) return
  hover.value = { minutes, period, value: valueOf(period) }
}

function clearHover(): void {
  hover.value = null
}

const tipStyle = computed(() => {
  if (!hover.value) return {}
  const x = sx(hover.value.minutes)
  const y = sy(hover.value.value)
  return {
    left: `${Math.min(Math.max(x, 70), width.value - 70)}px`,
    top: `${Math.max(y - 8, 44)}px`,
  }
})

const phaseBands = computed(() =>
  props.periods.map((period) => ({
    period,
    x: sx(period.startMin),
    w: Math.max(sx(period.endMin) - sx(period.startMin), 1),
    color:
      period.phase === 'boc' ? 'var(--accent)' : period.phase === 'cont' ? 'var(--teal)' : 'var(--indigo)',
  })),
)

const annotations = computed(() => {
  const list: { x: number; y: number; text: string; align: 'start' | 'end' }[] = []
  const peak = props.periods.reduce<ProfilePeriod | null>(
    (best, period) => (!best || period.loadW > best.loadW ? period : best),
    null,
  )
  if (peak) {
    const value = valueOf(peak)
    const anchorX = sx((peak.startMin + peak.endMin) / 2)
    list.push({
      x: anchorX,
      y: sy(value) - 10,
      text: `${fmt(value, props.mode === 'power' ? 2 : 1)} ${unit.value}`,
      align: 'start',
    })
  }
  return list
})

watch(
  () => props.periods,
  () => {
    hover.value = null
  },
)
</script>

<template>
  <div ref="host" class="chart profile">
    <svg :width="width" :height="height" role="img" aria-label="Discharge load profile">
      <defs>
        <linearGradient id="profile-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="'var(--teal)'" stop-opacity="0.24" />
          <stop offset="100%" :stop-color="'var(--teal)'" stop-opacity="0.01" />
        </linearGradient>
      </defs>

      <!-- phase bands -->
      <g>
        <rect
          v-for="band in phaseBands"
          :key="band.period.index"
          :x="band.x"
          :y="margin.top - 10"
          :width="band.w"
          height="3"
          :fill="band.color"
          opacity="0.85"
        />
        <rect
          v-for="band in phaseBands"
          :key="`fill-${band.period.index}`"
          :x="band.x"
          :y="margin.top"
          :width="band.w"
          :height="plotHeight"
          :fill="band.color"
          opacity="0.045"
        />
      </g>

      <!-- grid -->
      <g>
        <line
          v-for="tick in scale.ticks"
          :key="`gy-${tick}`"
          :x1="margin.left"
          :x2="margin.left + plotWidth"
          :y1="sy(tick)"
          :y2="sy(tick)"
          stroke="var(--line-soft)"
          stroke-width="1"
        />
        <line
          v-for="tick in xTicks"
          :key="`gx-${tick.minutes}`"
          :x1="tick.x"
          :x2="tick.x"
          :y1="margin.top"
          :y2="margin.top + plotHeight"
          stroke="var(--line-soft)"
          stroke-width="1"
          stroke-dasharray="1 5"
        />
      </g>

      <!-- axes labels -->
      <g>
        <text
          v-for="tick in scale.ticks"
          :key="`ty-${tick}`"
          :x="margin.left - 10"
          :y="sy(tick) + 3.5"
          text-anchor="end"
          font-size="9.5"
          fill="var(--muted-2)"
        >
          {{ fmt(tick, tick % 1 === 0 ? 0 : 1) }}
        </text>
        <text
          v-for="tick in xTicks"
          :key="`tx-${tick.minutes}`"
          :x="tick.x"
          :y="margin.top + plotHeight + 18"
          text-anchor="middle"
          font-size="9.5"
          fill="var(--muted-2)"
        >
          {{ tick.label }}
        </text>
        <text
          :x="margin.left + plotWidth + 12"
          :y="margin.top + 4"
          text-anchor="end"
          font-size="9"
          letter-spacing="0.12em"
          fill="var(--muted)"
        >
          {{ unit }}
        </text>
        <text
          :x="margin.left + plotWidth"
          :y="margin.top + plotHeight + 30"
          text-anchor="end"
          font-size="9"
          letter-spacing="0.12em"
          fill="var(--muted)"
        >
          MINUTES
        </text>
      </g>

      <!-- data -->
      <g>
        <path :d="areaPath" fill="url(#profile-fill)" :opacity="drawn ? 1 : 0" class="area" />
        <path
          :d="linePath"
          fill="none"
          stroke="var(--teal)"
          stroke-width="2"
          stroke-linejoin="round"
          pathLength="1"
          :style="{
            strokeDasharray: 1,
            strokeDashoffset: drawn ? 0 : 1,
            transition: 'stroke-dashoffset 1.1s cubic-bezier(0.2, 0.7, 0.3, 1)',
          }"
        />
        <g v-for="anno in annotations" :key="anno.text">
          <circle :cx="anno.x" :cy="anno.y + 6" r="2.6" fill="var(--teal)" />
          <text
            :x="anno.x + 7"
            :y="anno.y"
            font-size="9.5"
            fill="var(--teal)"
            letter-spacing="0.04em"
          >
            {{ anno.text }}
          </text>
        </g>
      </g>

      <!-- hover layer -->
      <g v-if="hover">
        <line
          :x1="sx(hover.minutes)"
          :x2="sx(hover.minutes)"
          :y1="margin.top"
          :y2="margin.top + plotHeight"
          stroke="var(--ink)"
          stroke-width="1"
          stroke-dasharray="3 3"
          opacity="0.45"
        />
        <circle :cx="sx(hover.minutes)" :cy="sy(hover.value)" r="4" fill="var(--surface)" stroke="var(--teal)" stroke-width="2" />
      </g>

      <rect
        :x="margin.left"
        :y="margin.top"
        :width="plotWidth"
        :height="plotHeight"
        fill="transparent"
        @pointermove="onMove"
        @pointerleave="clearHover"
      />
    </svg>

    <div v-if="hover" class="chart-tip" :style="tipStyle">
      <div class="chart-tip__time">{{ fmtMinutes(hover.minutes) }} into discharge</div>
      <div class="chart-tip__value">
        {{ fmt(hover.value, mode === 'power' ? 3 : 2) }} <span class="tiny">{{ unit }}</span>
      </div>
      <div class="chart-tip__meta">
        {{ fmtA(hover.period.loadA, 2) }} · {{ hover.period.phase.toUpperCase() }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile {
  min-height: 120px;
}

.profile svg {
  cursor: crosshair;
}
</style>
