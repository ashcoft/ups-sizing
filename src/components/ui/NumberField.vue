<script setup lang="ts">
import { toNumber } from '@/lib/format'

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

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  if (target.value.trim() === '') {
    emit('update:modelValue', props.min ?? 0)
    return
  }
  emit('update:modelValue', toNumber(target.value, props.modelValue))
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
        :value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        @input="onInput"
      />
      <span v-if="unit" class="field__suffix">{{ unit }}</span>
    </span>
    <span v-if="hint" class="tiny dim">{{ hint }}</span>
  </label>
</template>
