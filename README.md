# SchedloSQU

A bilingual (English / Arabic) course schedule builder for Sultan Qaboos University students. Pick your courses, block off the times you can't attend, and it generates every conflict-free timetable you can actually take.

**Live:** https://muhanad-bueno.github.io/SchedloSQU/

## Features

- Conflict-free schedule generation across every section combination
- Per-day time blocking (mark out work, prayer, commute, whatever)
- Per-section exclusion filters
- English / Arabic UI with full RTL support
- Light ("Desert Dusk") and dark ("Neon Night") themes
- Export a generated schedule to PDF
- Selections persist locally — refresh without losing your picks

## Tech stack

React 19, Vite, `xlsx` for data ingestion, `jspdf` for export. No backend — course data is a static JSON file fetched at runtime.

## Repository layout

This repo's root is the **deployed site** — GitHub Pages serves it directly from `main`, no build step in CI. The actual source code lives in `app/` and isn't tracked in git; it stays on disk locally and gets built/shipped manually.

```
/                repo root — built static site (tracked in git, what Pages serves)
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

1. Drop the new term's Excel export(s) into `app/raw-data/`
2. `cd app && npm run process-data` — regenerates `app/public/data.json`
3. Bump `DATA_VERSION` in `app/src/App.jsx` if old client-side selections should be cleared
4. Ship it (see below)

## Deploying

There's no CI/Actions build — you build locally and commit the output.

```bash
cd app
npm run deploy      # builds, then copies dist/ into the repo root
cd ..
git add -A
git commit -m "Deploy: <what changed>"
git push
```

GitHub Pages is set to serve from branch `main`, root folder — once pushed, it's live.

---

Made by Muhanad @ SQU
