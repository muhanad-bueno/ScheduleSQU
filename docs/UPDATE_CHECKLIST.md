# Update Checklist — New Term (Do This Every Time)

**When:** SIS publishes new timetables (usually late July / early January). Do this before any code push.

## 1) Bring the 4 files (you need all 4, every time)

Drop them into `app/raw-data/` (overwrite old):

| File (as named on SIS / registrar) | What it is | Repo path |
|---|---|---|
| **GeneralEnglishSchedule.xls** | English master — 6702 rows, all colleges, English headers (`Course Code`, `Department`, …) | `app/raw-data/ExportToExcel.xls` |
| **GeneralArabicSchedule.xls** | Arabic patch — same 6702 rows, Arabic headers (`رمز المقرر`, `القسم`, …) | `app/raw-data/allcollegesarabic.xls` |
| **UniReqs.xls** | 6 Uni Requirements course codes (UR) | `app/raw-data/unirequirements.xls` |
| **UniElectives.xls** | 24 Uni Electives course codes (UE) | `app/raw-data/unielectives.xls` |

> No 5th file. `unirequirements` + `unielectives` are tag sets, not courses — do not add rows.

## 2) Convert

```bash
cd app
npm run process-data   # XLSX → app/public/data.json + app/src/data/courses.json
# check: grep "1290" app/public/data.json should match new total; print first header row
```

## 3) Bump dates (search for `2026` / `Fall` / `August 14`)

There are **6 places**. Update all to the new term/date in one commit:

| Where | File:line | Old value | New value |
|---|---|---|---|
| **PDF footer** | `app/src/utils/collegePdf.js:190` | `Fall 2026` | e.g. `Spring 2027` |
| **PDF cover title** | `app/src/utils/collegePdf.js:224` | `Fall 2026` | same |
| **PDF cover subtitle** | `app/src/utils/collegePdf.js:228` | `August 14, 2026` | e.g. `January 10, 2027` |
| **Welcome subtitle (EN)** | `app/src/components/LanguageContext.jsx:44` | `Fall 2026 … Aug 14th, 2026` | same |
| **Welcome subtitle (AR)** | `app/src/components/LanguageContext.jsx:106` | `خريف 2026 … 14 أغسطس 2026` | same |
| **Data badge (EN/AR)** | `app/src/components/LanguageContext.jsx:32,94` | `Fall 2026 — … Aug 14, 2026` / `خريف 2026 — … 14 أغسطس` | same |

Also `app/public/data.json:version` is auto-set to `Date.now()` by `convert-data.js` — no manual edit. `app/src/App.jsx:18` `DATA_VERSION` (`v3.2`) only if data shape/localStorage changes.

## 4) Ship

```bash
cd app
npm run build          # Vite builds with base /ScheduleSQU/ (no NETLIFY env)
node ship.js           # copies dist/ → repo root
cd ..
git add -A
git commit -m "Update timetables: Spring 2027 — Aug 14 → Jan 10"
git push               # GitHub Pages + Netlify (NETLIFY=true) auto-build with base /
```

## 5) Verify

- Hard-refresh `https://muhanad-bueno.github.io/ScheduleSQU/` and `https://schedulesqu.netlify.app` — check PDF cover date, welcome subtitle, badge.
- Download General PDF → check footer `Fall 2026` → new term, page 2 TOC, `40 / 1290` → new count.

---

*Last updated: Fall 2026 (Aug 14, 2026) — 1290 courses, 2923 sections.*
