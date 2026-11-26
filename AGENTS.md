# Agent notes — DC UPS Sizing Studio

Single-page Vue 3 + TypeScript + Vite app. It turns the EMAS DC UPS calculation workbook
(`EMAS-EPCC-EXE-CHRM-66-ELE-CAL-1007-Attachment 1.xlsx`) into a live load-list and battery-sizing
model. Read `README.md` for the calculation method and data provenance.

## Commands

```bash
npm run dev       # Vite on 0.0.0.0:12000; set VITE_ALLOWED_HOSTS for a proxy domain
npm run build     # vue-tsc --noEmit && vite build
npm run verify    # bundles scripts/verify.ts with esbuild and asserts workbook values
```

There is no test runner. `scripts/verify.ts` is the regression harness for the sizing engine —
extend it when changing `src/lib/sizing.ts` or `src/data/workbook.ts`.

## Architecture

- `src/types.ts` — `Project`, `LoadSystem`, `LoadSection`, `LoadItem` (`active` holds the number of
  units drawing in each phase), `SizingConfig`.
- `src/store.ts` — module-level reactive singleton: project ref, computed totals/sizing/checks,
  persistence to `localStorage` (`dcups.project.v1`), CRUD actions, theme, hash navigation, toasts.
- `src/lib/sizing.ts` — pure functions. `computeTotals`, `activeUnits`, `ktAt` (log–log
  interpolation), `computeSizing` (BOC/CONT/EOD profile → IEEE 485 section method, Kt coverage
  flags), `autonomySweep`, `projectChecks` (each check carries `required`). Keep it framework-free.
- `src/lib/normalize.ts` — pure import/localStorage normalisation: id creation, numeric clamping,
  Kt table de-duplication, empty-register preservation. Covered by `scripts/verify.ts`.
- `src/lib/kt.ts` — Kt row edit validation and next-duration selection.
- `src/components/views/*` — overview, load register, battery sizing, calculation report.
- Charts are hand-written SVG with `useSize`; no chart dependency.

## Invariants

- Default dataset must keep phase totals exactly 35.775 W (BOC), 3,464.17 W (CONT), 3,190.15 W
  (EOD) and 75 items. `npm run verify` guards this.
- With default config the governing section is CONT at 148.09 Ah, required 195.5 Ah and the
  selected 280 Ah cell has +43.2% headroom.
- `connectedW` (8,143.97 W) intentionally differs from the workbook's `F118` (8,015.97 W) by 128 W;
  see README for why. Do not "fix" it silently.
- Kt defaults are anchored at 1.30 (1 min) and 4.24 (240 min); phase current uses minimum voltage
  (99 V), not nominal.

## Conventions

- Design tokens live in `src/styles/main.css` (`--paper`, `--surface`, `--ink`, `--accent`, `--teal`,
  `--indigo`, `--chart-*`, fonts). Both light and `[data-theme='dark']` variants must stay legible;
  charts reference CSS variables so the theme switch works without JS.
- Typography: Instrument Serif for display, IBM Plex Sans for prose, IBM Plex Mono (tabular) for
  every number. Keep numbers in mono.
- Table markup must stay valid: `v-for` producing `<tr>` entries belongs on `<template>` inside
  `<tbody>`/`<thead>`; never nest `<tr>` in `<tr>`/`<td>`.
- Editing writes directly into the reactive project; every derived number is a computed. Persistence
  is automatic, so no explicit save button.
- Keep print styles working: report view is the printable surface, `.no-print` hides chrome.

## Deployment

- `Dockerfile` builds with Node 24 and serves `dist/` from `nginxinc/nginx-unprivileged` on port 8080.
  `deploy/nginx.conf` owns caching, gzip, security headers and `/healthz`. Test config changes by
  running the image; there is no local Docker daemon in this workspace.
- `.github/workflows/pages.yml` deploys to https://ashcoft.github.io/ups-sizing/ using
  `vite build --base=/ups-sizing/` (see `npm run build:pages`). Routing is hash-based, so no SPA
  fallback or 404 page is needed on Pages.
- `.github/workflows/docker-publish.yml` pushes multi-arch images to
  `ghcr.io/ashcoft/ups-sizing`. Action versions are pinned to the same SHAs used by
  `ashcoft/psa-tool`, so keep them in sync when bumping.
- Pages must be enabled with `build_type: workflow`; the GHCR package needs a one-time visibility
  change to public if anonymous pulls are expected.
- Verification is the regression gate: 42 assertions cover the workbook baseline, Kt coverage,
  import clamping, active-unit clamping, CSV neutralising and verdict rules.
