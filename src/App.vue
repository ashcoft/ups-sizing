<script setup lang="ts">
import { computed, type Component } from 'vue'
import {
  BatteryCharging,
  Download,
  FileText,
  LayoutGrid,
  Moon,
  RotateCcw,
  Sun,
  TableProperties,
  Zap,
} from 'lucide-vue-next'
import { exportProjectJson, go, lastSaved, project, resetProject, sizing, theme, toasts, toggleTheme, totals, view } from '@/store'
import { fmtMinutes } from '@/lib/format'
import OverviewView from '@/components/views/OverviewView.vue'
import LoadsView from '@/components/views/LoadsView.vue'
import SizingView from '@/components/views/SizingView.vue'
import ReportView from '@/components/views/ReportView.vue'

const tabs: { key: 'overview' | 'loads' | 'sizing' | 'report'; index: string; label: string; icon: Component }[] = [
  { key: 'overview', index: '01', label: 'Overview', icon: LayoutGrid },
  { key: 'loads', index: '02', label: 'Load register', icon: TableProperties },
  { key: 'sizing', index: '03', label: 'Battery sizing', icon: BatteryCharging },
  { key: 'report', index: '04', label: 'Report', icon: FileText },
]

const viewComponent = computed<Component>(() => {
  switch (view.value) {
    case 'loads':
      return LoadsView
    case 'sizing':
      return SizingView
    case 'report':
      return ReportView
    default:
      return OverviewView
  }
})

const savedLabel = computed(() => {
  if (!lastSaved.value) return 'Auto-save on'
  return `Saved ${new Date(lastSaved.value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
})

const meta = computed(() => [
  { label: 'Autonomy', value: fmtMinutes(project.value.sizing.autonomyMin) },
  { label: 'Min. voltage', value: `${project.value.sizing.minVoltage} V` },
  { label: 'Duty', value: `${sizing.value.requiredAh.toFixed(1)} Ah` },
  { label: 'Cell', value: `${project.value.sizing.selectedCellAh} Ah` },
])
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="wrap">
        <div class="topbar__inner">
          <div class="brand">
            <span class="brand__mark"><Zap :size="17" :stroke-width="1.8" /></span>
            <div class="brand__text">
              <div class="brand__title">DC UPS Sizing Studio</div>
              <div class="brand__sub">{{ project.meta.docNo }} · Rev {{ project.meta.revision }}</div>
            </div>
          </div>

          <div class="topbar__spacer" />

          <div class="topbar__meta">
            <div v-for="item in meta" :key="item.label" class="meta-item">
              <span class="meta-item__label">{{ item.label }}</span>
              <span class="meta-item__value">{{ item.value }}</span>
            </div>
          </div>

          <div class="topbar__actions">
            <button class="btn btn--icon" type="button" title="Export project JSON" aria-label="Export project JSON" @click="exportProjectJson">
              <Download :size="14" :stroke-width="1.6" />
            </button>
            <button class="btn btn--icon" type="button" title="Restore workbook baseline" aria-label="Restore workbook baseline" @click="resetProject">
              <RotateCcw :size="14" :stroke-width="1.6" />
            </button>
            <button
              class="btn btn--icon"
              type="button"
              :title="theme === 'light' ? 'Switch to night draft' : 'Switch to paper'"
              :aria-label="theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'"
              @click="toggleTheme"
            >
              <Moon v-if="theme === 'light'" :size="14" :stroke-width="1.6" />
              <Sun v-else :size="14" :stroke-width="1.6" />
            </button>
          </div>
        </div>
      </div>

      <nav class="nav" aria-label="Sections">
        <div class="nav__inner">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="nav__link"
            type="button"
            :aria-current="view === tab.key ? 'page' : undefined"
            @click="go(tab.key)"
          >
            <span class="idx">{{ tab.index }}</span>
            <component :is="tab.icon" :size="13" :stroke-width="1.6" />
            {{ tab.label }}
          </button>
        </div>
      </nav>
    </header>

    <main class="main">
      <div class="wrap">
        <component :is="viewComponent" />
      </div>
    </main>

    <footer class="footer">
      <div class="wrap footer__inner">
        <p>
          Calculation aid for the EMAS DC UPS package. Verify loads and discharge data against the cell manufacturer’s
          final tables before issue.
        </p>
        <div class="footer__meta">
          <span class="pill">{{ project.systems.length }} boards · {{ totals.items }} loads</span>
          <span class="mono tiny dim">{{ savedLabel }}</span>
        </div>
      </div>
    </footer>

    <div class="toasts" aria-live="polite">
      <TransitionGroup name="toast">
        <div v-for="toast in toasts" :key="toast.id" class="toast">
          <span class="toast__dot" />
          {{ toast.text }}
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.topbar__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.footer {
  border-top: 1px solid var(--line);
  background: var(--paper);
}

.footer__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-top: 18px;
  padding-bottom: 22px;
  flex-wrap: wrap;
}

.footer p {
  max-width: 68ch;
  font-size: 10.5px;
  line-height: 1.6;
  color: var(--muted-2);
}

.footer__meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toasts {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 90;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 13px;
  background: var(--ink);
  color: var(--paper);
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.04em;
  box-shadow: var(--shadow-lg);
}

.toast__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (max-width: 900px) {
  .topbar__meta {
    display: none;
  }
}

@media print {
  .footer,
  .toasts {
    display: none;
  }
}
</style>
