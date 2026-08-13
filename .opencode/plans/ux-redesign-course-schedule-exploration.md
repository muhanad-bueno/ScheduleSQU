# UX/UI Redesign — Make viewing courses & exploring schedules effortless

**North star:** A first-year can go from “I don’t know what to take” to “I have 3 schedules I love, saved as PDF” in under 90 seconds, without feeling janky or overwhelmed. Keep ScheduleSQU flat, sharp, and calm (no gradients, no gimmicks), but make the layout breathe and the flow obvious.

**Current pain (why it feels hard today):**
- Search is blind: 1290 courses, no college/department/level/credit filter, only code/name substring, capped at 50, no sort. You discover courses by guessing.
- Course cards show code+name only — schedule shape, instructor, exam, seats all hidden until long-press (and even that is a hidden gesture).
- Selected list grows vertically and pushes the time filter below the fold — you scroll past your own picks to block times. No sense of “how full is my week” until you hit Generate.
- Generation is a cliff: you must pick 4–6 courses, then click Generate, then paginate one-by-one. No preview, no comparison, exams hidden behind a collapsed footer. You can’t tell if schedule A is better than B without flipping.
- Grid is honest but dense: `Code/Section` tiny, room codes like `E14` mean nothing, dark mode pastels are pretty but not scannable at a glance.

---

## Design principles (so it doesn’t get complicated)

1. **Show, don’t hide.** The schedule itself is the filter — let people see density before generating.
2. **One primary action per view.** Search → Select → Explore. Don’t make them manage three panels at once.
3. **Calm density.** More whitespace, fewer borders, sticky where it helps, collapsible where it doesn’t. Keep `2px` radius and token colors.
4. **Progressive disclosure.** College/department filters are powerful but secondary — hidden behind a single “Filters” chip, not a sidebar of checkboxes.
5. **Thumb-first, but desktop-proud.** Sidebar is a drawer on mobile, a 320px rail on desktop — same components, no fork.

---

## Proposed layout (desktop: 3 zones, mobile: 1 stack + sheets)

**Desktop (≥900px):**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: ScheduleSQU | Updated Aug 14 | [i] [EN/ع] [○] [Generate (4)] │
├──────────────┬──────────────────────────────────────────────┤
│  LEFT RAIL   │  CENTER STAGE                               │
│  300-340px   │  flex:1                                     │
│              │  ┌─ Schedule Strip (if generated) ─┐       │
│  Search      │  │ [Schedule 1] [2] [3] mini thumbs│       │
│  [⌕ …]       │  │  ← swipe, dot indicator         │       │
│  Filters ▾   │  └─────────────────────────────────┘       │
│  [College▾] [Level▾]           │  ┌─ Main Grid ─┐  ┌─ Details ─┐ │
│  [All (1290) | Selected (4)]   │  │  Time/Day   │  │ Exam     │ │
│  Course list                   │  │  (sticky)   │  │ Conflicts│ │
│  (cards, virtualized)          │  │             │  │ Export   │ │
│  ────────────                   │  └─────────────┘  └──────────┘ │
│  Selected stack (collapsible)  │                               │
│  Time blocks (mini)            │                               │
└──────────────┴──────────────────────────────────────────────┘
```

**Mobile:** Header sticks. `Manage Courses (4)` pill opens a bottom sheet (not a side drawer) with two tabs: Browse / Selected. Time blocking becomes a second sheet. Schedule strip is swipeable full-width, grid is horizontally scrollable with snap. Exam footer becomes a sticky bottom bar that expands as a sheet.

Why this helps: Browsing and exploring are never on the same scroll container. You pick, then you explore — context switch is explicit, not a long page.

---

## Concrete additions (in order of impact)

### 1) Course discovery that actually works
- **Filter bar:** Single row of chips above the tabs — `College ▾` (10 colleges + All), `Level ▾` (1000/2000/3000/4000), `Search` debounced. Keep category pill `UR/UE/CR…` as a filter too. Count badge updates live: `Showing 47 of 1290`.
- **Course card 2.0:** Code + name + `•` + college short (`CEPS`, `ENG`, `SCI`) in `0.7rem` dim, plus one-line schedule preview: `Sun-Tue 8:00–9:50 • 2 sections` and `Seats 12/40` if we have `Max Number` (we do from Excel column 10). Long-press preview stays, but also add a visible `…` micro-button that opens the same `CoursePreviewModal` — no hidden gesture only. Add subtle density: if a course has 6 sections, card is slightly taller; if 1 section, compact. Keep `category-pill` but desaturate.
- **Empty & zero states:** When no search, show `Try: COMP3000 • Popular in your college: [...]` with 3 suggested courses (most sections). When filter yields 0, show `No match — clear College filter` CTA.

### 2) Selected stack that respects attention
- **Collapsible + summary:** Header shows `Selected (4) • 11 sections • ~14 hrs/week`. Body is virtualized — each `SelectedCourseCard` collapsed by default shows `CODE • 2 sections • Dr. Ali` + tiny sparkline of blocked times. Tap to expand section chips (existing behavior). Add `★` favorite pin per course (optional, local) and `×` to remove. Keep `Clear All` but as text link, not button.
- **Live density hint:** Mini week strip (5×3 blocks) under Selected that fills as you add courses — you see “Mon 8–12 is already heavy” before generating. No numbers, just a heat map. Tappable to open time blocker.

### 3) Make time blocking discoverable, not a step
- **Inline on grid:** Instead of a separate grid, let users paint directly on the schedule grid’s empty cells (drag to block). Keep `FilterPanel` time grid as fallback, but sync both. On mobile, blocking via mini week strip is faster than the 5×10 grid.
- **FilterPanel itself:** Keep collapsible, but default closed, with summary chip: `Blocked: Tue 8–10, Thu all day` when active. No empty space when closed (already fixed to flush).

### 4) Schedule exploration — from one-at-a-time to bird’s-eye
- **Strip of minis:** After Generate, show a horizontal strip of 8–12 mini schedule thumbnails (canvas at 120×80, desaturated, no text). Active has accent border. Tap to jump. This replaces prev/next-only. Keep prev/next for keyboard, but add swipe. Strip is `scroll-snap` and fades at edges.
- **Comparison toggle:** `Compare 2` — select two thumbnails, grid splits into 2 columns (or toggles). Very calm: no modal, just side-by-side with shared time axis. Export will still be per-schedule.
- **Details pane (right on desktop, sheet on mobile):** Move exam list out of the collapsible footer into a sticky pane: `Exams` with conflict pill at top, `Course details` table, `Export` buttons. Footer collapsible is removed — info is always visible when a schedule is selected, but pane can be collapsed to `Exams ▾` if user wants space. On mobile, pane is a draggable sheet that snaps to 30%/60%.
- **Grid improvements:** Room codes get tooltip `E Common Teaching — E14` on tap, instructor `To Be Announced` muted with dashed border, `DLR` shows `Distance Learning` icon, not just text. Add `Today`-like highlight for exam conflict days (light orange left border already, but also a top banner `2 exams on 27 Dec`).

### 5) Empty & success states that teach
- **Before selection:** Center stage shows a calm illustration (existing `Calendar` icon but larger, with 3 wireframe grids behind) + `Welcome!` + two CTAs: `Browse courses` (focuses search) and `Load example (4 courses)` to instantly see a demo schedule — removes the “what do I do?” moment.
- **After generation zero:** Don’t `alert()`. Show inline card: `No timetables with those blocks. Try: Remove Tue 8–10 (conflicts with ACCT3111) • Allow another instructor for COMP3000` with one-tap fix chips that actually update filters. Keep tone helpful, not scolding.
- **After generation success:** Confetti is too much — just a subtle `Found 24 schedules` pill that animates count, then strip + grid.

### 6) Persistence & sharing (light)
- **Share link:** Encode selected course IDs + blocked slots + section filters into URL hash (`#c=ACCT3111,COMP3000&b=1-8`) so a friend can open the same set. Copy button in header. No backend.
- **Favorites:** Star a generated schedule (localStorage), show `Favorites (2)` tab in strip. Let user export only favorites as one PDF (existing batch export can take filtered list).

---

## What we will not build (to avoid bloat)

- No drag-to-reorder courses (complex, low value).
- No real-time seat data (we have max but not live).
- No multi-semester or prerequisite graph.
- No account/login — everything stays local and in the URL.

---

## Implementation phases (each ships)

**Phase A — Discovery (1–1.5 days)**
- Add college/level filter state in `CourseSelector`, wire to `allCourses[].college` (already in new `data.json`), update `EmptyState`. Add card preview line + `…` button. Keep `long-press` but add visible affordance. Files: `CourseSelector.jsx`, `LanguageContext.jsx` (new filter keys), `index.css`.

**Phase B — Selected & blocking (1 day)**
- Collapsible selected header with summary + heat strip, inline paint on grid syncing to `blockedSlots`. Keep `FilterPanel` but make it a sheet on mobile. Files: `CourseSelector.jsx` (SelectedCourses), `ScheduleViewer.jsx` (grid paint), `FilterPanel.jsx`.

**Phase C — Exploration strip + details pane (1.5–2 days)**
- Build `ScheduleStrip` component (mini canvases), move exam/footer to `DetailsPane`, add compare toggle, swipe. Keep existing `generateSchedules` untouched. Files: new `ScheduleStrip.jsx`, new `DetailsPane.jsx`, `App.jsx` layout, `index.css` grid.

**Phase D — Polish & empty states (0.5 day)**
- Success/zero-state cards, share link, favorites, header copy button, reduced-motion passes. Files: `App.jsx`, `ScheduleViewer.jsx`, `LanguageContext.jsx`.

**Verification each phase:** Build + ship, test 320/375/390/430 + dark/light + en/ar, check Lighthouse tap targets, ensure `data.json` college field still works for PDF export.

---

## Open questions before build
- Do you want college filter as chips (quick) or dropdown (clean)? Chips win for thumb.
- Keep course category pill filter visible or behind Filters? Suggest behind.
- For the mini heat strip under Selected, do you want actual hours count or just visual density? Visual is calmer.

Status: **Saved — awaiting your go on which phase to start first (recommend A).**
