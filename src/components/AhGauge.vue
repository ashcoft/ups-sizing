<script setup lang="ts">
import { computed } from 'vue'
import { fmt, fmtAh, fmtPct } from '@/lib/format'

const props = defineProps<{
  requiredAh: number
  selectedAh: number
}>()

const size = 250
const center = size / 2
const radius = 92
const stroke = 13

const sweepStart = 135
const sweepTotal = 270

const scaleMax = computed(() => Math.max(props.requiredAh, props.selectedAh) * 1.18 || 1)

function polar(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: center + Math.cos(rad) * r, y: center + Math.sin(rad) * r }
}

function arc(fraction: number, r: number): string {
  const clamped = Math.min(Math.max(fraction, 0), 1)
  const start = polar(sweepStart, r)
  const end = polar(sweepStart + sweepTotal * clamped, r)
  const large = sweepTotal * clamped > 180 ? 1 : 0
  return `M${start.x.toFixed(2)},${start.y.toFixed(2)} A${r},${r} 0 ${large} 1 ${end.x.toFixed(2)},${end.y.toFixed(2)}`
}

const requiredFraction = computed(() => props.requiredAh / scaleMax.value)
const selectedFraction = computed(() => props.selectedAh / scaleMax.value)

const ticks = computed(() =>
  [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const inner = polar(sweepStart + sweepTotal * fraction, radius - stroke / 2 - 6)
    const outer = polar(sweepStart + sweepTotal * fraction, radius - stroke / 2 - 11)
    return { inner, outer, fraction, label: fmt(scaleMax.value * fraction, 0) }
  }),
)

const headroom = computed(() => (props.selectedAh > 0 && props.requiredAh > 0 ? (props.selectedAh / props.requiredAh - 1) * 100 : 0))
const adequate = computed(() => props.selectedAh >= props.requiredAh)
const gradient = computed(() => (adequate.value ? 'var(--teal)' : 'var(--accent)'))
</script>

<template>
  <div class="gauge">
    <svg :width="size" :height="size - 26" :viewBox="`0 0 ${size} ${size - 20}`" role="img" aria-label="Battery capacity requirement">
      <defs>
        <linearGradient id="gauge-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" :stop-color="gradient" stop-opacity="0.65" />
          <stop offset="100%" :stop-color="gradient" stop-opacity="1" />
        </linearGradient>
      </defs>

      <path :d="arc(1, radius)" fill="none" stroke="var(--line-soft)" :stroke-width="stroke" stroke-linecap="round" />
      <path
        :d="arc(requiredFraction, radius)"
        fill="none"
        stroke="url(#gauge-fill)"
        :stroke-width="stroke"
        stroke-linecap="round"
        class="gauge__fill"
      />

      <g v-for="(tick, index) in ticks" :key="index">
        <line
          :x1="tick.inner.x"
          :y1="tick.inner.y"
          :x2="tick.outer.x"
          :y2="tick.outer.y"
          stroke="var(--line-strong)"
          stroke-width="1"
        />
      </g>

      <!-- selected cell marker -->
      <g>
        <line
          :x1="polar(sweepStart + sweepTotal * selectedFraction, radius - stroke / 2).x"
          :y1="polar(sweepStart + sweepTotal * selectedFraction, radius - stroke / 2).y"
          :x2="polar(sweepStart + sweepTotal * selectedFraction, radius + stroke / 2).x"
          :y2="polar(sweepStart + sweepTotal * selectedFraction, radius + stroke / 2).y"
          stroke="var(--ink)"
          stroke-width="2.5"
        />
      </g>

      <text :x="center" :y="center - 6" text-anchor="middle" font-size="34" font-weight="500" letter-spacing="-0.03em" fill="var(--ink)" class="num">
        {{ fmt(requiredAh, 1) }}
      </text>
      <text :x="center" :y="center + 12" text-anchor="middle" font-size="8.5" letter-spacing="0.18em" fill="var(--muted)">
        AH REQUIRED
      </text>
      <text :x="center" :y="center + 38" text-anchor="middle" font-size="10" fill="var(--ink-soft)" class="num">
        {{ fmt(selectedAh, 0) }} Ah selected
      </text>
      <text :x="center" :y="center + 54" text-anchor="middle" font-size="9" :fill="adequate ? 'var(--teal)' : 'var(--accent)'">
        {{ adequate ? `+${fmtPct(headroom, 1)} headroom` : `${fmtPct(headroom, 1)} shortfall` }}
      </text>

      <text :x="polar(sweepStart, radius + 18).x" :y="polar(sweepStart, radius + 18).y" text-anchor="middle" font-size="8" fill="var(--muted-2)">0</text>
      <text :x="polar(sweepStart + sweepTotal, radius + 18).x" :y="polar(sweepStart + sweepTotal, radius + 18).y" text-anchor="middle" font-size="8" fill="var(--muted-2)">
        {{ fmt(scaleMax, 0) }}
      </text>
    </svg>
    <p class="gauge__caption">{{ fmtAh(requiredAh, 1) }} duty · {{ fmtAh(selectedAh, 0) }} installed</p>
  </div>
</template>

<style scoped>
.gauge {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.gauge__fill {
  transition: stroke-dasharray 0.4s ease;
}

.gauge__caption {
  margin-top: -6px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--muted-2);
  text-align: center;
}
</style>
