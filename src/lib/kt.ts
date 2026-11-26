import type { KtPoint } from '../types'

/** Applies a validated edit to one Kt row. Returns false when the value is rejected. */
export function applyKtEdit(
  table: KtPoint[],
  index: number,
  field: 'minutes' | 'kt',
  value: number,
): boolean {
  const point = table[index]
  if (!point) return false

  if (field === 'minutes') {
    const next = Math.round(value * 10) / 10
    if (!Number.isFinite(next) || next <= 0 || next > 100000) return false
    if (table.some((entry, entryIndex) => entryIndex !== index && Math.abs(entry.minutes - next) < 1e-6)) return false
    point.minutes = next
    return true
  }

  const next = Math.round(value * 1000) / 1000
  if (!Number.isFinite(next) || next <= 0 || next > 100) return false
  point.kt = next
  return true
}

/** Picks an unused standard duration for a new row. */
export function nextKtDuration(table: KtPoint[]): number {
  const taken = new Set(table.map((point) => Math.round(point.minutes)))
  const candidates = [720, 900, 1200, 600, 480, 300, 360, 60, 120, 180, 240]
  return candidates.find((candidate) => !taken.has(candidate)) ?? Math.max(...taken, 0) + 60
}
