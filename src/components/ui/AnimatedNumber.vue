<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { fmt } from '@/lib/format'
import { prefersReducedMotion } from '@/lib/useSize'

const props = withDefaults(defineProps<{ value: number; digits?: number }>(), { digits: 0 })

const display = ref(0)
let raf = 0

function animate(from: number, to: number): void {
  cancelAnimationFrame(raf)
  if (prefersReducedMotion() || from === to) {
    display.value = to
    return
  }
  const started = performance.now()
  const duration = 720
  const tick = (now: number) => {
    const progress = Math.min(1, (now - started) / duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    display.value = from + (to - from) * eased
    if (progress < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}

onMounted(() => animate(0, props.value))
watch(
  () => props.value,
  (next, previous) => animate(Number(previous) || 0, next),
)
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <span class="num">{{ fmt(display, digits) }}</span>
</template>
