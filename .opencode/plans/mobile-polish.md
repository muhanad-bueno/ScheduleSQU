# Mobile Polish — ScheduleSQU

**Goal:** Fix real mobile pain without redesign, keep flat sharp aesthetic (Desert Dusk / Neon Night), no janky motion.

**Context:** Current build has `1290 courses / 2923 sections`. Shell uses `100vh` + `maximum-scale=no`, two competing breakpoints (830/900), drawer at 85%/320px, grid `28px` taps, modals with `blur 12px`, long-press preview, college PDF export.

---

## Audit findings

**Shell:** `100vh` jumps on iOS, `user-scalable=no` blocks zoom, `made-by` wraps, duplicate breakpoints cause flicker at 834-900px.
**Drawer:** `App.jsx:259` nested interactive (`div onClick` + inner button), 85% too wide on 320px, overlay blur heavy, no `aria-expanded`.
**Search & preview:** `CourseRow` timer without `pointerCapture`, scroll triggers preview, `pressing` state never renders, no affordance, `selector-content` no bottom padding.
**Time grid:** `28px` cells <44px a11y, overflows <375px, no scroll hint. Calendar `overflow:hidden` parent clips `overflow-x:auto`.
**Modals:** `88vh` + `12px blur` heavy on mobile, keyboard covers search, notch not handled (`safe-area-inset`), export card wraps poorly at 360px, `CoursePreviewModal` slots rendered as one `•` string hard to scan.
**Motion:** `blockFadeIn` animates dozens of blocks at once, stutters; collapsibles are now uniform `0fr->1fr` but still need `prefers-reduced-motion` extension.
**Perf:** `isSelected` not memoized, `jspdf` 385k blocks main thread on first export.

---

## Milestones (keep it simple)

### M1 — Shell & viewport (30m)
- `app/index.html:7` → `width=device-width, initial-scale=1, viewport-fit=cover` (remove max-scale).
- `index.css:101` → `html,body,#root {min-height:100%}` + `.app {min-height:100dvh}` fallback `100vh`, `padding: max(1rem, env(safe-area-inset-*))`.
- Consolidate to single `900px` breakpoint, drawer `width:min(86vw,360px)` (88vw <375px), overlay blur 1px. Make `.mobile-controls` a `<button aria-expanded>` remove inner button.
- Files: `app/index.html`, `index.css`, `App.jsx:259` — verify 375×812 / 390×844 via agent-browser.

### M2 — Touch & lists (45m)
- `CourseRow`: useState for `pressing`, `setPointerCapture` + cancel on move >10px, progress ring at 300ms, ghost `Eye 12px` button for desktop affordance, add bottom padding to `selector-content`.
- Time grid: mobile `36px` cells, `gap:6px`, `grid-time-label 0.68rem`, edge fade hint. Calendar: `scrollbar-gutter` + gradient `::after` + `scroll-snap-type:x proximity`.
- Files: `CourseSelector.jsx`, `FilterPanel.jsx`, `ScheduleViewer.jsx`, `index.css:772/1158`.

### M3 — Modals & export (40m)
- Both modals: blur `8px` on <600px, `max-height: min(82dvh,640px)`, `padding-bottom: env(safe-area-inset-bottom)`, shadow `0 12px 32px` on mobile, disable hover transform on `hover:none`.
- `WelcomeModal` export card: <420px `flex-direction:column` + full-width button, pre-warm `collegePdf` chunk on hover/touchstart, reuse `export-overlay` for progress.
- `CoursePreviewModal` slots → vertical pill list, `overscroll-behavior:contain`, `content-visibility:auto`.
- Files: `WelcomeModal.jsx`, `CoursePreviewModal.jsx`, `collegePdf.js`, `index.css:1598/1896`.

### M4 — Perf & QA (30m)
- Memoize `isSelected` (`useCallback`), stabilize `filteredCourses`, `content-visibility:auto` for preview.
- Extend `prefers-reduced-motion` to `blockFadeIn` / `welcomePop`.
- QA: 320/375/390/430 × light/dark × en/ar, generate 5-course schedule check overflow.

---

## What we won't do
No new deps, no radius/color change, keep 2px sharp, carbon-flat.

## Verify
`npm run dev` + agent-browser viewports + axe tap targets ≥44px, no horizontal overflow. Then `npm run build && node ship.js`.

Status: **Approved — awaiting build** (saved 2026-08-14)
