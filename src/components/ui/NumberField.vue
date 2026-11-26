<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    modelValue: number
    unit?: string
    min?: number
    max?: number
    step?: number
    hint?: string
  }>(),
  { unit: '', min: undefined, max: undefined, step: 1, hint: '' },
)

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const draft = ref<string | null>(null)
const shown = computed(() => draft.value ?? String(props.modelValue))

function clamp(value: number): number {
  const lower = props.min ?? Number.NEGATIVE_INFINITY
  const upper = props.max ?? Number.POSITIVE_INFINITY
  return Math.min(Math.max(value, lower), upper)
}

function onInput(event: Event): void {
  const text = (event.target as HTMLInputElement).value
  draft.value = text
  if (text.trim() === '') return
  const parsed = Number.parseFloat(text)
  if (!Number.isFinite(parsed)) return
  if ((props.min !== undefined && parsed < props.min) || (props.max !== undefined && parsed > props.max)) return
  emit('update:modelValue', parsed)
}

function onBlur(): void {
  const text = draft.value
  draft.value = null
  if (text === null) return
  if (text.trim() === '') {
    emit('update:modelValue', clamp(props.min ?? 0))
    return
  }
  const parsed = Number.parseFloat(text)
  emit('update:modelValue', clamp(Number.isFinite(parsed) ? parsed : props.modelValue))
}
</script>

<template>
  <label class="field">
    <span class="field__label">{{ label }}</span>
    <span class="field__control">
      <input
        class="input"
        :class="{ 'input--suffix': !!unit }"
        type="number"
        :value="shown"
        :min="min"
        :max="max"
        :step="step"
        @input="onInput"
        @blur="onBlur"
      />
      <span v-if="unit" class="field__suffix">{{ unit }}</span>
    </span>
    <span v-if="hint" class="tiny dim">{{ hint }}</span>
  </label>
</template>
