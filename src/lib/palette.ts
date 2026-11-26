export const SYSTEM_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
] as const

export function systemColor(index: number): string {
  return SYSTEM_COLORS[index % SYSTEM_COLORS.length]
}

export const PHASE_COLORS = {
  boc: 'var(--accent)',
  cont: 'var(--teal)',
  eod: 'var(--indigo)',
} as const
