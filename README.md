# ScheduleSQU

A bilingual (English / Arabic) schedule builder for Sultan Qaboos University. Pick your courses across all colleges and get every timetable that actually works, no spreadsheet juggling.

**Live:** https://muhanad-bueno.github.io/ScheduleSQU/

## What it does

- All 10 colleges in one place — Official Fall 2026 timetables as of August 14, 2026 (1290 courses, 2923 sections)
- Conflict-free generation across every section combination
- Search by code or name, long-press any course to preview its sections
- Per-day time blocking and per-section exclusion
- Exam conflict detection
- English / Arabic UI with full RTL support
- Light (Desert Dusk) and dark (Neon Night) themes
- Export your favorite schedule, or all schedules, to PDF
- Selections persist locally

## Tech stack

React 19, Vite, `xlsx` for data ingestion, `jspdf` + `jspdf-autotable` for export. No backend — course data is a static `data.json` fetched at runtime.

## Repository layout

This repo's root is the **deployed site** — GitHub Pages serves it directly from `main`, no build step in CI. Source lives in `app/` and is kept on disk locally, built and shipped manually.

```
/                repo root — built static site (tracked, what Pages serves)
  index.html
  assets/
  data.json
  favicon.svg
app/             source (gitignored, local only)
  src/
  public/
  raw-data/      source Excel files for course data
  scripts/       convert-data.js — Excel -> data.json
```

## Local development

```bash
cd app
npm install
npm run dev
```

## Updating course data

1. Drop the new term's Excel export into `app/raw-data/` (replaces the old file)
2. `cd app && npm run process-data` — regenerates `app/public/data.json`
3. Bump `DATA_VERSION` and `WELCOME_KEY` in `app/src/App.jsx` if old selections should be cleared or the welcome modal should reappear
4. Ship it (see below)

## Deploying

No CI build — you build locally and commit the output.

```bash
cd app
npm run deploy      # vite build + copy dist/ into repo root
cd ..
git add -A
git commit -m "Deploy: <what changed>"
git push
```

GitHub Pages is set to serve from branch `main`, root folder — once pushed, it's live.

## Contact

Found a missing course or wrong time? Email **s139955@student.squ.edu.om** and it will be fixed.

---

Made by Muhanad @ SQU
