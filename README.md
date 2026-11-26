# DC UPS Sizing Studio

A browser workbench for DC UPS load lists and battery sizing, built from the EMAS
`EMAS-EPCC-EXE-CHRM-66-ELE-CAL-1007` calculation workbook. It replaces the spreadsheet with a
live, typed model: edit any load, allowance or discharge factor and the whole sizing chain —
profile, Kt lookups, section capacity, cell selection and report — updates immediately.

[![CI](https://github.com/ashcoft/ups-sizing/actions/workflows/ci.yml/badge.svg)](https://github.com/ashcoft/ups-sizing/actions/workflows/ci.yml) [![Deploy to GitHub Pages](https://github.com/ashcoft/ups-sizing/actions/workflows/pages.yml/badge.svg)](https://github.com/ashcoft/ups-sizing/actions/workflows/pages.yml) [![Publish container image](https://github.com/ashcoft/ups-sizing/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/ashcoft/ups-sizing/actions/workflows/docker-publish.yml)

**Web:** https://ashcoft.github.io/ups-sizing/ · **Container:** `ghcr.io/ashcoft/ups-sizing:latest`

Vue 3 + TypeScript + Vite. No CSS framework and no chart library; the charts are hand-built SVG.

## Run

```bash
npm install
npm run dev          # http://localhost:12000
npm run build        # type-check + production bundle in dist/
npm run build:pages  # production bundle with the /ups-sizing/ base path
npm run verify       # calculation assertions against the source workbook
```

When the dev server is opened through a proxy domain (remote workspace, tunnel), allow that
host explicitly: `VITE_ALLOWED_HOSTS=.example.dev npm run dev`. Vite's default host check applies
otherwise.

### Container

The image is a two-stage build: Node compiles the site, nginx serves the static bundle as an
unprivileged user on port 8080.

```bash
docker run --rm -p 8080:8080 ghcr.io/ashcoft/ups-sizing:latest
# or, from a checkout:
npm run docker:build && npm run docker:run
docker compose up --build
```

`GET /healthz` returns `200 ok` for probes. Hashed assets are cached for a year; `index.html` is
served `no-cache`.

## Deployment

| Target | Trigger | Result |
| --- | --- | --- |
| GitHub Pages | Push to `main`, or manual dispatch | `https://ashcoft.github.io/ups-sizing/` |
| GHCR | Push to `main` or a `v*` tag, or manual dispatch | `ghcr.io/ashcoft/ups-sizing` (`latest`, `sha-*`, semver) |

- Pages is served from the GitHub Actions artifact (`pages.yml`) with `--base=/ups-sizing/`;
  repository Pages source must be **GitHub Actions**.
- The container workflow builds `linux/amd64` and `linux/arm64` with provenance and SBOM, and uses
  the GitHub Actions cache.
- New GHCR packages are private by default. Set the package visibility to public once
  (package settings → Danger zone → Change visibility) if the image should be pullable anonymously.

## Views

| View | What it does |
| --- | --- |
| **Overview** | Design verdict, KPIs, discharge profile, load share by board, section accumulation, verification checks |
| **Load register** | Editable hierarchy of boards → sections → loads with panels, W/unit and active units per discharge window |
| **Battery sizing** | Design basis inputs, editable Kt table, IEEE 485 section method table, cell selection, autonomy sensitivity |
| **Report** | Print-ready calculation note with design basis, load summary, capacity working, verification, notes, references and sign-off |

## Calculation chain

1. **Load totals** — each load contributes `panels × W/unit` to the connected load, and
   `active units × W/unit` to each of the three profile windows:

   | Window | Range | Meaning |
   | --- | --- | --- |
   | BOC | 0 – 1 min | Inrush / switching at the beginning of discharge |
   | CONT | 1 – 239 min | Steady load for the full autonomy |
   | EOD | 239 – 240 min | Restoration load at the end of autonomy |

2. **Load current** — window load divided by the minimum battery voltage (99 V for the default
   110 V system, i.e. 55 × 2 V cells at 1.80 V/cell end voltage).

3. **Capacity factor** — `Kt` comes from an editable manufacturer table, interpolated in log–log
   space between published durations. The default table is a Peukert-style fit anchored on the
   workbook values: 1.30 at 1 min and 4.24 at 240 min.

4. **Section method (IEEE 485)** — for the section ending at `T`:

   ```
   Ah = Σ (Δload_k × Kt(T − start_k))
   ```

   Negative deltas (load dropping off at end of discharge) reduce the accumulated capacity.

5. **Cell selection** — required capacity is the governing section × aging × future spare ×
   temperature factor. The catalogue selector keeps the selected cell explicit, with headroom and
   the smallest adequate standard size reported separately.

## Default dataset

`src/data/workbook.ts` is transcribed from the source workbook (sheet `EMAS DC UPS`): 75 line
items across five boards, phase totals 35.775 W / 3,464.17 W / 3,190.15 W and 1-minute BOC/EOD
windows. Source typographical errors in item descriptions were corrected; values were not changed.

The connected-load figure includes every listed item, including fault-only lock-out relays that
are excluded from the discharge profile. The source sheet's own connected total omits four such
relay rows with blank total cells, so the sum here (8,143.97 W) is 128 W higher than cell `F118`
(8,015.97 W). Phase totals — which drive the sizing — match the source exactly.

Editing loads never rewrites the source file. Project state is saved to `localStorage`; JSON
export/import and CSV export are available from the register and report views. Deletions and the
workbook reset are undoable from the toast, imported JSON is type-checked and clamped, and CSV
export neutralises spreadsheet formulas in user-entered text.

## Structure

```
src/
  types.ts              project, load and sizing types
  store.ts              reactive project store, persistence, actions, navigation
  lib/sizing.ts         totals, Kt interpolation, section method, checks, autonomy sweep
  lib/format.ts         number/unit formatting, downloads
  data/workbook.ts      transcribed source dataset
  components/
    LoadProfileChart.vue   step-area discharge profile
    CompositionDonut.vue   load share by board
    SectionChart.vue       stacked section accumulation
    AutonomyChart.vue      required Ah vs autonomy
    KtCurveChart.vue       discharge characteristic
    AhGauge.vue            required vs selected capacity
    views/                 overview, load register, sizing, report
scripts/verify.ts       assertions against the workbook baseline
```

## Disclaimer

A calculation aid, not a substitute for engineering review. Verify loads against the latest vendor
documentation and replace the Kt table with the selected cell manufacturer's discharge data before
issue for construction.
