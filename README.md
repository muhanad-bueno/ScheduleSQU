# Schedule4SQU

A bilingual (English / Arabic) schedule builder for Sultan Qaboos University. Pick your courses across all colleges and get every timetable that actually works, no spreadsheet juggling.

**Live:** https://schedulesqu.netlify.app/ · [GitHub Pages](https://muhanad-bueno.github.io/schedule4squ/)

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

```
/                repo root — built static site for GitHub Pages (tracked)
  index.html
  assets/
  data.json
  favicon.svg
app/             source (tracked, Netlify builds from here)
  src/
  public/
  raw-data/      source Excel files for course data
  scripts/       convert-data.js — Excel -> data.json
netlify.toml     Netlify config (base = app, publish = dist)
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

**GitHub Pages** (https://muhanad-bueno.github.io/schedule4squ/) serves the pre-built root (`index.html` + `assets/`). **Netlify** (https://schedulesqu.netlify.app) builds from `app/` on every push.

Vite base is env-aware: `netlify.toml` + `app/vite.config.js:7` → `base: NETLIFY ? '/' : '/schedule4squ/'`.

```bash
# local dev
cd app && npm run dev

# ship to GitHub Pages (builds with base /schedule4squ/)
cd app
npm run build        # or npm run deploy (build + ship)
node ship.js         # copies dist/ -> repo root
cd ..
git add -A
git commit -m "Deploy: <what changed>"
git push             # triggers both Pages + Netlify auto-build

# manual Netlify deploy (uses same build, but needs NETLIFY=true)
$env:NETLIFY="true"          # PowerShell; or NETLIFY=true on macOS/Linux
npm --prefix app run build
netlify deploy --dir app/dist --prod   # or netlify deploy --build --prod
```

Netlify auto-deploys on `git push` to `main` — no manual step needed after the first `netlify link`.

## Contact

Found a missing course or wrong time? Email **s139955@student.squ.edu.om** and it will be fixed.

---

Made by Muhanad @ SQU
