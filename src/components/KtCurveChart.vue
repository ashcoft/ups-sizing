<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { KtPoint } from '@/types'
import { ktAt } from '@/lib/sizing'
import { fmt } from '@/lib/format'

const props = withDefaults(
  defineProps<{
    table: KtPoint[]
    markers?: { minutes: number; label: string }[]
    height?: number
  }>(),
  { height: 220, markers: () => [] },
)

const host = ref<HTMLElement | null>(null)
const width = ref(560)
let observer: ResizeObserver | null = null

onMounted(() => {
  const element = host.value
  if (!element) return
  const measure = () => {
    width.value = Math.max(280, Math.round(element.getBoundingClientRect().width))
  }
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure)
    observer.observe(element)
  }
})

onBeforeUnmount(() => observer?.disconnect())

const margin = { top: 18, right: 16, bottom: 28, left: 40 }
const plotWidth = computed(() => Math.max(120, width.value - margin.left - margin.right))
const plotHeight = computed(() => Math.max(90, props.height - margin.top - margin.bottom))

const points = computed(() => [...props.table].sort((a, b) => a.minutes - b.minutes))
const tMin = computed(() => Math.max(points.value[0]?.minutes ?? 1, 1))
const tMax = computed(() => Math.max(points.value[points.value.length - 1]?.minutes ?? 600, tMin.value + 1))

const ktMax = computed(() => Math.max(...points.value.map((point) => point.kt), 1))

const logMin = computed(() => Math.log10(tMin.value))
const logMax = computed(() => Math.log10(tMax.value))

const sx = (minutes: number): number =>
  margin.left + ((Math.log10(Math.max(minutes, tMin.value)) - logMin.value) / Math.max(logMax.value - logMin.value, 1e-6)) * plotWidth.value
const sy = (kt: number): number =>
  margin.top + plotHeight.value - (kt / (ktMax.value * 1.1)) * plotHeight.value

const curve = computed(() => {
  const samples: string[] = []
  const steps = 90
  for (let i = 0; i <= steps; i += 1) {
    const logValue = logMin.value + ((logMax.value - logMin.value) * i) / steps
    const minutes = Math.pow(10, logValue)
    const kt = ktAt(points.value, minutes)
    samples.push(`${i === 0 ? 'M' : 'L'}${sx(minutes).toFixed(2)},${sy(kt).toFixed(2)}`)
  }
  return samples.join(' ')
})

const yTicks = computed(() => {
  const ticks: number[] = []
  const step = ktMax.value > 6 ? 2 : ktMax.value > 3 ? 1 : 0.5
  for (let value = 0; value <= ktMax.value * 1.1; value += step) ticks.push(Number(value.toFixed(2)))
  return ticks
})

const xTicks = computed(() => [1, 2, 5, 10, 30, 60, 120, 240, 480, 600].filter((tick) => tick >= tMin.value && tick <= tMax.value))

const hover = ref<{ minutes: number; kt: number } | null>(null)

function onMove(event: PointerEvent): void {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const localX = event.clientX - rect.left
  const ratio = Math.min(1, Math.max(0, (localX - margin.left) / plotWidth.value))
  const logValue = logMin.value + ratio * (logMax.value - logMin.value)
  const minutes = Math.pow(10, logValue)
  hover.value = { minutes, kt: ktAt(points.value, minutes) }
}

const tipStyle = computed(() => {
  if (!hover.value) return {}
  return {
    left: `${Math.min(Math.max(sx(hover.value.minutes), 70), width.value - 70)}px`,
    top: `${Math.max(sy(hover.value.kt) - 6, 36)}px`,
  }
})
</script>

<template>
  <div ref="host" class="chart kt">
    <svg :width="width" :height="height" role="img" aria-label="Kt discharge characteristic">
      <g>
        <line
          v-for="tick in yTicks"
          :key="`y-${tick}`"
          :x1="margin.left"
          :x2="margin.left + plotWidth"
          :y1="sy(tick)"
          :y2="sy(tick)"
          stroke="var(--line-soft)"
        />
        <text
          v-for="tick in yTicks"
          :key="`yl-${tick}`"
          :x="margin.left - 8"
          :y="sy(tick) + 3.5"
          text-anchor="end"
          font-size="9"
          fill="var(--muted-2)"
        >
          {{ fmt(tick, tick % 1 === 0 ? 0 : 1) }}
        </text>
        <text
          v-for="tick in xTicks"
          :key="`x-${tick}`"
          :x="sx(tick)"
          :y="margin.top + plotHeight + 16"
          text-anchor="middle"
          font-size="8.5"
          fill="var(--muted-2)"
        >
          {{ tick }}
        </text>
        <text :x="margin.left - 8" :y="margin.top - 7" text-anchor="end" font-size="8" letter-spacing="0.1em" fill="var(--muted)">KT</text>
        <text
          :x="margin.left + plotWidth"
          :y="margin.top + plotHeight + 26"
          text-anchor="end"
          font-size="8"
          letter-spacing="0.1em"
          fill="var(--muted)"
        >
          MINUTES · LOG
        </text>
      </g>

      <path :d="curve" fill="none" stroke="var(--teal)" stroke-width="2" stroke-linejoin="round" />

      <circle
        v-for="point in points"
        :key="point.minutes"
        :cx="sx(point.minutes)"
        :cy="sy(point.kt)"
        r="2"
        fill="var(--surface)"
        stroke="var(--teal)"
        stroke-width="1.2"
      />

      <g v-for="marker in markers" :key="marker.label">
        <line
          :x1="sx(marker.minutes)"
          :x2="sx(marker.minutes)"
          :y1="sy(ktAt(points, marker.minutes))"
          :y2="margin.top + plotHeight"
          stroke="var(--accent)"
          stroke-width="1"
          stroke-dasharray="2 3"
          opacity="0.55"
        />
        <circle :cx="sx(marker.minutes)" :cy="sy(ktAt(points, marker.minutes))" r="3.6" fill="var(--accent)" />
        <text
          :x="sx(marker.minutes)"
          :y="sy(ktAt(points, marker.minutes)) - 8"
          text-anchor="middle"
          font-size="8.5"
          fill="var(--accent)"
        >
          {{ marker.label }}
        </text>
      </g>

      <g v-if="hover">
        <line
          :x1="sx(hover.minutes)"
          :x2="sx(hover.minutes)"
          :y1="margin.top"
          :y2="margin.top + plotHeight"
          stroke="var(--ink)"
          stroke-width="1"
          stroke-dasharray="3 3"
          opacity="0.3"
        />
        <circle :cx="sx(hover.minutes)" :cy="sy(hover.kt)" r="3.6" fill="var(--surface)" stroke="var(--teal)" stroke-width="2" />
      </g>

      <rect
        :x="margin.left"
        :y="margin.top"
        :width="plotWidth"
        :height="plotHeight"
        fill="transparent"
        @pointermove="onMove"
        @pointerleave="hover = null"
      />
    </svg>

    <div v-if="hover" class="chart-tip" :style="tipStyle">
      <div class="chart-tip__time">{{ fmt(hover.minutes, 1) }} min</div>
      <div class="chart-tip__value">Kt {{ fmt(hover.kt, 3) }}</div>
    </div>
  </div>
</template>

<style scoped>
.kt {
  min-height: 120px;
}
</style>
