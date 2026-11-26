<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { SectionResult } from '@/lib/sizing'
import { fmt, fmtAh, fmtMinutes } from '@/lib/format'
import { PHASE_COLORS } from '@/lib/palette'

const props = withDefaults(
  defineProps<{
    sections: SectionResult[]
    requiredAh: number
    selectedAh: number
    height?: number
  }>(),
  { height: 290 },
)

const host = ref<HTMLElement | null>(null)
const width = ref(700)
let observer: ResizeObserver | null = null

onMounted(() => {
  const element = host.value
  if (!element) return
  const measure = () => {
    width.value = Math.max(320, Math.round(element.getBoundingClientRect().width))
  }
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure)
    observer.observe(element)
  }
})

onBeforeUnmount(() => observer?.disconnect())

const margin = { top: 22, right: 104, bottom: 48, left: 50 }
const plotWidth = computed(() => Math.max(160, width.value - margin.left - margin.right))
const plotHeight = computed(() => Math.max(120, props.height - margin.top - margin.bottom))

const maxAh = computed(() =>
  Math.max(
    props.selectedAh,
    props.requiredAh,
    ...props.sections.map((section) => section.ah),
    1,
  ),
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

const scale = computed(() => niceScale(maxAh.value * 1.12, 4))
const sy = (value: number): number =>
  margin.top + plotHeight.value - (value / Math.max(scale.value.max, 1e-6)) * plotHeight.value

const slot = computed(() => plotWidth.value / Math.max(props.sections.length, 1))
const barWidth = computed(() => Math.min(74, slot.value * 0.5))

const bars = computed(() =>
  props.sections.map((section, index) => {
    const centerX = margin.left + slot.value * (index + 0.5)
    let cumulative = 0
    const segments = section.terms.map((term) => {
      const from = cumulative
      cumulative += term.ah
      const isNegative = term.ah < 0
      return {
        label: term.label,
        phase: term.phase,
        ah: term.ah,
        x: centerX - barWidth.value / 2,
        y: sy(Math.max(from, cumulative)),
        height: Math.abs(sy(from) - sy(cumulative)),
        negative: isNegative,
      }
    })
    return {
      index,
      section,
      centerX,
      width: barWidth.value,
      segments,
      top: sy(section.ah),
      label: fmtMinutes(section.endMin),
      phase: section.phase,
    }
  }),
)

const hover = ref<number | null>(null)

const requiredY = computed(() => sy(props.requiredAh))
const selectedY = computed(() => sy(props.selectedAh))
</script>

<template>
  <div ref="host" class="chart section-chart">
    <svg :width="width" :height="height" role="img" aria-label="Section capacity accumulation">
      <defs>
        <pattern id="negative-hatch" width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="5" stroke="var(--accent)" stroke-width="1.4" opacity="0.5" />
        </pattern>
      </defs>

      <!-- grid -->
      <g>
        <line
          v-for="tick in scale.ticks"
          :key="tick"
          :x1="margin.left"
          :x2="margin.left + plotWidth"
          :y1="sy(tick)"
          :y2="sy(tick)"
          stroke="var(--line-soft)"
          stroke-width="1"
        />
        <text
          v-for="tick in scale.ticks"
          :key="`label-${tick}`"
          :x="margin.left - 10"
          :y="sy(tick) + 3.5"
          text-anchor="end"
          font-size="9.5"
          fill="var(--muted-2)"
        >
          {{ fmt(tick, tick % 1 === 0 ? 0 : 1) }}
        </text>
        <text :x="margin.left - 10" :y="margin.top - 8" text-anchor="end" font-size="8.5" letter-spacing="0.12em" fill="var(--muted)">
          AH
        </text>
      </g>

      <!-- bars -->
      <g v-for="bar in bars" :key="bar.index">
        <rect
          v-for="(segment, segmentIndex) in bar.segments"
          :key="segmentIndex"
          :x="segment.x"
          :y="segment.y"
          :width="bar.width"
          :height="Math.max(segment.height, 0.8)"
          :fill="segment.negative ? 'url(#negative-hatch)' : PHASE_COLORS[segment.phase]"
          :opacity="hover === null || hover === bar.index ? 0.86 : 0.38"
          class="segment"
          @pointerenter="hover = bar.index"
          @pointerleave="hover = null"
        >
          <title>{{ segment.label }} · {{ fmtAh(segment.ah, 2) }}</title>
        </rect>
        <rect
          :x="bar.centerX - bar.width / 2 - 5"
          :y="margin.top"
          :width="bar.width + 10"
          :height="plotHeight"
          fill="transparent"
          @pointerenter="hover = bar.index"
          @pointerleave="hover = null"
        />
        <text
          :x="bar.centerX"
          :y="bar.top - 9"
          text-anchor="middle"
          font-size="11"
          font-weight="500"
          fill="var(--ink)"
        >
          {{ fmt(bar.section.ah, 1) }}
        </text>
        <text :x="bar.centerX" :y="margin.top + plotHeight + 18" text-anchor="middle" font-size="9" letter-spacing="0.08em" fill="var(--muted)">
          {{ bar.phase.toUpperCase() }}
        </text>
        <text :x="bar.centerX" :y="margin.top + plotHeight + 31" text-anchor="middle" font-size="8.5" fill="var(--muted-2)">
          t = {{ bar.label }}
        </text>
      </g>

      <!-- reference lines -->
      <g>
        <line
          :x1="margin.left"
          :x2="margin.left + plotWidth"
          :y1="selectedY"
          :y2="selectedY"
          stroke="var(--ink)"
          stroke-width="1"
          stroke-dasharray="5 4"
          opacity="0.55"
        />
        <text :x="margin.left + plotWidth + 8" :y="selectedY + 3.5" font-size="8.5" letter-spacing="0.08em" fill="var(--ink-soft)">
          SELECTED {{ fmt(selectedAh, 0) }} Ah
        </text>
        <line
          :x1="margin.left"
          :x2="margin.left + plotWidth"
          :y1="requiredY"
          :y2="requiredY"
          stroke="var(--accent)"
          stroke-width="1"
          stroke-dasharray="2 3"
        />
        <text :x="margin.left + plotWidth + 8" :y="requiredY + 3.5" font-size="8.5" letter-spacing="0.08em" fill="var(--accent)">
          REQUIRED {{ fmt(requiredAh, 1) }} Ah
        </text>
      </g>
    </svg>

    <div class="section-chart__foot">
      <div class="legend">
        <span class="legend__item" style="color: var(--accent)">
          <span class="legend__swatch" /> BOC contribution
        </span>
        <span class="legend__item" style="color: var(--teal)">
          <span class="legend__swatch" /> Continuous contribution
        </span>
        <span class="legend__item" style="color: var(--indigo)">
          <span class="legend__swatch" /> EOD contribution
        </span>
      </div>
      <p class="tiny dim section-chart__hint">
        Governing section: <strong class="mono">{{ fmt(Math.max(...sections.map((s) => s.ah)), 1) }} Ah</strong>
      </p>
    </div>
  </div>
</template>

<style scoped>
.section-chart {
  min-height: 160px;
}

.segment {
  transition: opacity 0.18s ease;
}

.section-chart__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 4px 6px 0 50px;
}

.section-chart__hint {
  margin: 0;
}
</style>
