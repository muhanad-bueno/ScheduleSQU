# Phone Edit Courses — Declutter Plan

**Status:** Plan — no code changed
**Scope:** `app/src/components/CourseSelector.jsx:131` (selector), `app/src/index.css:472` (selector-header/tabs/filter-bar/course-item), `app/src/App.jsx:306` (bottom sheet + filter-actions)
**Screenshot:** Bottom sheet shows ~280px of chrome before the first course: search (44px) + tabs (44px) + filter grid (2 selects 38px + count pill 28px + clear link 24px = 90px) + 8px gaps. On a 667px SE, only ~280px left for the list (≈3 cards). Bottom `filter-actions` (2 buttons) add another 56px, squeezing further. Eye + Plus both on each card compete; Arabic `قسم اللغة الإنجليزية والترجم` is truncated with ellipsis, still 2 lines high.

---

## 1) What feels cluttered (and why)

| Area | Clutter signal | Root |
|---|---|---|
| Search + tabs + filters stacked | 3 separate full-width blocks, same visual weight, same border, no hierarchy | `CourseSelector.jsx:155-229` renders header, tabs, filter-bar all as peers; `index.css:472` gives each a `1px` border, same padding |
| Filter bar | 2 selects side-by-side each `grid-column:1fr`; on 390px Arabic `كلية الآداب والعلوم الاجتماعية` truncates to `كلية الآ…`, count pill `عرض 40 / 1290` centered on its own row, `مسح الفلاتر` on a third row — 3 rows for a secondary control | `index.css:565` grid always `1fr 1fr` + count/clear each `1/-1`; even when only one filter is active it still costs 2 rows |
| Tabs | `All` vs `Selected (1)` look identical except underline; count lives both in tab and in filter bar `عرض 40 / 1290` — double counting | `index.css:539` tabs are `44px` with same weight |
| Cards | Each card `ENGL4235` shows `+` and `eye` (two actions, 28px each) plus 3-line meta (`name` truncated `...`, `Sun 2:15… • 4 شعبة • CASS`). On RTL the actions sit left of truncated text, feels busy | `CourseSelector.jsx:269` `CourseRow` renders both `peek-btn` + `course-action` always; `index.css:736` course-meta wraps |
| Bottom bar | Two side-by-side buttons `تحديد الأوقات…` + `مواعيد الاختبارات…` compete with the primary `إنشاء الجدول (1)` behind the sheet | `App.jsx:324` `filter-actions` is `position:sticky; bottom:0` with equal weight, always visible |

---

## 2) Design intent for phone

**One thumb, one job at a time:**
- **Search is primary** — typing is the fastest way to find a course (1290 items). Keep it sticky and spacious.
- **Filters are secondary** — most users browse `All` with no filter. Progressive disclosure: a single `الفلاتر` chip, expand only on demand.
- **List is hero** — maximize vertical pixels for cards; cards should be 56-62px uniform so 5-6 fit above the fold.
- **Actions are quiet** — `Time Filters` / `Exams` are not equal to `Generate`; make them ghost, single row, or move one to the sheet header.

These keep the Carbon-flat aesthetic (2px radius, no gradients) and RTL correctness.

---

## 3) Proposed layout (phone ≤600px) — before → after

**Before (screenshot):**
```
[handle]
[إدارة المقررات | إغلاق]
[search input]
[All Courses | Selected (1)]
[College ▼] [Department ▼]   ← row 1, truncated
[عرض 40/1290 centered]       ← row 2
[مسح الفلاتر centered]       ← row 3
[cards ×2]
[Time btn] [Exams btn]
```

**After (proposed, 1+2 rows max before list):**
```
[handle]
[إدارة المقررات — 1 selected • 40/1290 | إغلاق]  ← subtitle merges count
[search input with × and الفلاتر chip on its right]
[All | Selected]  ← segmented 44px, count badge inside Selected
[cards — 60% taller viewport for list]
[quiet row: تحديد الأوقات (ghost) · ︙ Exams]  ← single ghost row, sticky bottom
```

**Key moves:**
1. **Filter bar → collapsible chip row inside search header**
   - Replace always-visible grid with: `search-wrap` holds `input` + `الفلاتر ▾` button (shows `•2` badge when college/dept != All). Tap → expand inline `filter-bar` (`College`, `Department` as two 44px selects) with slide-down `grid-template-rows` animation. Default collapsed → saves ~70px.
2. **Merge counts**
   - Remove standalone `عرض 40/1290` pill as a full row. Show it as tiny `40 / 1290` in the sheet subtitle next to `إدارة المقررات` (e.g., `إدارة المقررات · 1 · 40/1290`) and also in the `Selected` tab badge. The filter bar when expanded shows it inline right-aligned, not centered.
3. **Tabs → segmented control**
   - Keep two tabs but style as pill segment: `background: var(--bg-soft); border-radius: 999px; p:2px; gap:2px` with active pill `bg:var(--card); shadow`. Count badge inside `Selected` is `min-width:20px` pill, not `(1)` text.
4. **Cards — 30% denser**
   - Card: `padding: 0.7rem 0.75rem; min-height: 56px` (down from 62-64). `course-meta` single line `CASS • 4 شعب • Sun 2:15PM` with `text-overflow:ellipsis` (hide duplicated Arabic name truncation `...` — show full name in one line, 0.82rem). Eye button hidden on phone by default, appears on card `press` or long-press only; primary action is whole-card tap (Plus→Check). Saves ~12px per card and removes `+ eye` competition.
5. **Bottom bar — demote**
   - Change `filter-actions` from 2 equal buttons to one ghost row: `تحديد الأوقات` as text button (no fill) with `Clock` 14px, ` • ` separator, `الاختبارات` as link. Or keep one button `تحديد الأوقات` and move `الاختبارات` to sheet header as icon. Frees ~28px.

Net gain: ~90px vertical for the list on SE (≈1.5 extra cards visible).

---

## 4) Implementation — 3 small milestones

**M1 — Filter disclosure (largest win)**
- Files: `CourseSelector.jsx:195` (extract `FilterBar` into collapsible), `index.css:565` (filter-bar → `grid-template-rows: 0fr` collapsed, `1fr` expanded, no always-grid)
- Add state `filterOpen` (default false), button `الفلاتر` with badge `collegeFilter !== 'All' ? 1 :0 + dept`. When open, show selects + inline count (`Showing 40/1290`) right-aligned + `مسح` link. Default closed → one row saved.

**M2 — Header + tabs polish**
- Files: `CourseSelector.jsx:131` (merge subtitle), `index.css:472` (search-wrap holds chip), `index.css:539` (segmented tabs)
- Move count from standalone pill into sheet header subtitle and tab badge; style tabs as pill. Keep RTL via logical properties.

**M3 — Cards & bottom bar quiet**
- Files: `CourseSelector.jsx:269` (hide eye on mobile unless pressed, keep Plus/Check), `index.css:662` (card 56px, meta single line), `App.jsx:324` + `index.css:815` (filter-actions → ghost row, `gap:0.75rem`, `min-height:36px`, no equal fill)
- Verify `dir="auto"` on search stays, `selectedSet` instant tint still holds.

Each milestone ships independently, `npm run build` passes, no data changes.

---

## 5) What we will not do

- No new filter types (level/category) — adds rows.
- No virtualized list rewrite — 50 rows is cheap, current `slice(0,50)` is enough.
- No change to desktop — desktop keeps current grid filter bar (2 columns) where width is ample.

---

## 6) Verification

- **Visual:** Open sheet on 375×667 SE and 390×844 iPhone, RTL Arabic, `All` tab with `كلية العلوم الاجتماعية` + long department — no truncation `College of…`? Actually Arabic full visible in expanded filter, count centered, no `Clea` cut. Search focused with keyboard → header + search + tabs still visible (from prior visualViewport fix).
- **Interaction:** Tap `الفلاتر` → expands, tap outside or `مسح` → collapses. Tap card → `Check` flips in one frame (no content-visibility delay).
- **Accessibility:** Chip `aria-expanded`, tabs `44px`, cards `56px` still ≥44px target, `dir="auto"` on search.

---

**Next step:** Approve which milestone to start (recommend M1 alone first — ~40 lines, biggest declutter), or ship M1+M2 together for the full calm.
