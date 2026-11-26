export function fmt(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

export function fmtWatts(watts: number, digits = 2): string {
  const value = fmt(watts, digits)
  return `${value} W`
}

export function fmtKw(watts: number, digits = 2): string {
  return `${fmt(watts / 1000, digits)} kW`
}

export function fmtA(amps: number, digits = 2): string {
  return `${fmt(amps, digits)} A`
}

export function fmtAh(ah: number, digits = 1): string {
  return `${fmt(ah, digits)} Ah`
}

export function fmtPct(value: number, digits = 1): string {
  return `${fmt(value, digits)}%`
}

export function fmtMinutes(minutes: number): string {
  if (!Number.isFinite(minutes)) return '—'
  const whole = Math.round(minutes)
  if (whole < 60) return `${whole} min`
  const hours = Math.floor(whole / 60)
  const rest = whole % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')} min`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function toNumber(value: string | number, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function download(filename: string, content: string, type = 'application/json'): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function csvCell(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}
