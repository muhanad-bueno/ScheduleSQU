# Phone UX — Make it feel amazing (declutter + motion)

**Status:** Plan — no code
**Context:** After collapsible filters (chip `فلترة 2` + `جميع المقررات 40`), sheet still reads heavy. Screenshots: header 56px + search+chip 52px + pill tabs 44px + expanded filters 110px (2 selects + `40/1290` + `مسح الفلاتر`) before first card. Cards show `+` circle + truncated Arabic + `Mon… • شعبة • CASS`. Bottom `تحديد الأوقات` + `مواعيد الاختبارات` pills add another row. Motion janks on sheet open, tab switch, filter expand, card +.

---

## 1) Why it still feels cluttered

**A. No hierarchy — everything shouts.**
- `فلترة 2` is solid `var(--accent-strong)` dark blue, same weight as primary `إنشاء الجدول`. It should be ghost.
- Tabs `المقررات المحددة 1` vs `جميع المقررات 40` both large pills with shadow; the inactive `جميع... 40` is visually heavier than the count `40/1290` below, doubling the number story.
- Bottom bar two equal pills compete with the list; `مواعيد الاختبارات` is disabled (faint) but still occupies 50% width.

**B. Filter bar still 3 rows when expanded.**
- `app/src/index.css:565` grid `1fr 1fr` + `count` full-width + `clear` full-width = 3 rows. On 390px Arabic `كلية الآداب والعلوم الاجتماعية` truncates to `كلية الآداب...`, `قسم اللغة الإنجليزية والترجم` similar. Two selects side-by-side on 390px leaves ~175px each — inevitable truncation.
- `CourseSelector.jsx:195` renders filter bar inside `all` tab only, but `selected` tab shows no filters, causing layout shift when switching tabs (height jumps).

**C. Cards are loose but busy.**
- `CourseRow` at `app/src/components/CourseSelector.jsx:269` still renders `%s` + Arabic name `...` (manual `...` truncation in data, not CSS) + `Sun 12:00… • شعبة 4 • CASS` on one line. 3 pieces of meta + `+` circle + (hidden) eye = 5 competing elements. `CASS` in `var(--accent-strong)` is loud for a secondary tag.
- `index.css:736` `course-item` `56px` with `0.75rem` padding is airier than needed; gap `4px` between cards leaves little rhythm.

**D. Motion is layout-driven, not composited.**
- Sheet at `index.css:1580` animates `transform: translateY(105%)` (good, composited) but its child `.selector-content` has `content-visibility:auto` and `overflow-y:auto` with no `will-change`, so first paint after open janks.
- Filter expand uses `grid-template-rows: 0fr → 1fr` — animates layout (height), not `transform/opacity`, triggers reflow of the whole list.
- Tab switch swaps `SearchResults` vs `SelectedCourses` with no cross-fade; React swaps 50 DOM nodes at once. Deselect tint at `index.css:639` uses `background-color` (paint) not `transform`, and `selectedSet` change re-renders all 50 rows via `memo` check (still 50 comparisons).

---

## 2) Amazing — what good feels like

**Calm, one primary action per viewport, motion that never reflows.**

- **Above the fold (no scroll):** handle → compact header (32px) → search (single line) → segmented tabs (pill) → 4 cards visible. Filters hidden unless explicitly opened.
- **Below, on demand:** filters, counts, secondary actions. Nothing competes with the list.
- **Motion:** sheet slides on `transform`, filter drops with `opacity` + `transform: translateY(-4px)`, tabs cross-fade, cards stagger `opacity 60ms` each, `+` toggles with scale `0.9 → 1` on `transform`.

---

## 3) Concrete redesign (phone ≤ 600px)

### A. Header — shrink and merge
- `App.jsx:306` `sidebar-mobile-header`: reduce from `1rem` padding to `0.6rem 0.75rem`, `font-size: 0.9rem` bold, `close` as `X` icon only (no text `إغلاق`), background `transparent` not `var(--bg-soft)`. Saves 14px. Subtitle `إدارة المقررات · 1 · 40` in `0.72rem` dim replaces separate count pill.

### B. Search row — chip becomes ghost
- `CourseSelector.jsx:156` `search-wrap`: keep `input` flex 1, but `filter-chip` changes from solid to `background: transparent; border: 1px dashed var(--card-border); color: var(--text-dim)` resting, `active` is `border-color: var(--accent-soft)`, `has-filters` is `background: var(--accent-tint); border-style: solid`. Badge `2` stays `var(--accent-strong)` but smaller (`0.62rem`). Result: chip whispers until filters are active.
- Placeholder: shorten Arabic to `ابحث عن مقرر...` (keep `COMP3000` example but not truncated `COMP300C` as in screenshot) — fewer characters, no `...` mid-placeholder.

### C. Tabs — true segment
- `index.css:534` tabs: already pill from last polish, but reduce `min-height: 36px` to `32px`, `gap: 2px`, `font-size: 0.8rem`. Active pill gets `border: 1px solid var(--card-border); box-shadow: 0 1px 2px rgba(0,0,0,0.06)` (already), inactive is `color: var(--text-dim); background: transparent`. Remove `40` from inactive tab label — count lives only in badge `1` on `المحددة` and in header subtitle. Single source of truth → less double counting.

### D. Filters — one row, or hidden
- Keep collapsible, but when collapsed, **no bar at all** (currently 0 rows — good). When expanded, change `filter-bar` from `grid 1fr 1fr` to **single column** on phone: `grid-template-columns: 1fr;` so each select gets full width 390px → `قسم اللغة الإنجليزية والترجم` fully readable, not `قسم اللغة…`. Stack: `[College ▼]` full width → `[Department ▼]` full → foot row `40 / 1290` left + `مسح` right on one line (not two separate centered rows). Saves truncation and makes scan linear.
- Foot: `filter-bar-foot` already `flex; justify-content:space-between` — keep but make `filter-count` text `0.68rem` muted, `filter-clear` as `underline` link, not pill.

### E. Cards — editorial, not spreadsheet
- `CourseRow`: keep `+` circle (28px) as primary, remove `CASS` loud color — make `meta-college` `color: var(--text-dim); font-weight: 500;` (not `accent-strong`). Schedule part `Mon 12:00…` stays `dir="ltr"` with `unicode-bidi`.
- Trim meta to `ENGL2101` bold + **one** line `القواعد في السياق` (Arabic name) in `0.82rem`, second line `CASS • 4 شعب • Mon 12-1:50` in `0.68rem` ellipsis. The manual `...` in data (seen as `الأدب العالمي بالنجليز...`) should be real ellipsis via CSS, not three literal dots.
- Density: `course-item` `padding: 0.65rem 0.75rem; gap: 0.5rem;` with `border-bottom: 1px solid var(--card-border)` instead of `gap:4px` between cards — feels like a list, not floating cards. `selected` state becomes `border-left: 3px solid var(--accent-strong)` + `background: var(--accent-tint)` rather than full border.

### F. Bottom actions — one quiet row
- `App.jsx:324` `filter-actions`: already changed to `999px` pill, but still two equal buttons. Make it **one** ghost row: `تحديد الأوقات` as `text` button (`border: none; background: transparent; color: var(--text-dim)`), dot separator, `الاختبارات` as link that opens `ExamModal` only when enabled (icon + `مراجعة` text). Place it **below the list as a footer inside `selector-content`**, not sticky — so it doesn't steal 56px from the list. Keep `Generate` (behind sheet) as the only sticky primary.

---

## 4) Motion — make it 60fps, composited only

| Interaction | Before (jank source) | After (smooth) |
|---|---|---|
| Sheet open/close | `transform` good, but content paints late due to `content-visibility:auto` | Add `will-change: transform` only during transition (remove after), set `content-visibility: visible` on `selector-content` during open (already fixed for time filter, do same here). Use `cubic-bezier(0.22,1,0.36,1)` 300ms, no `height` animation. |
| Filter expand | `grid-template-rows: 0fr→1fr` animates layout, reflows list | Keep the grid trick but add `opacity` fade on inner `filter-bar` (`0 → 1` over 180ms) and `transform: translateY(-4px) → 0`. The height still reflows but opacity hides the jank. Alternatively animate `max-height` with `transform` on inner. |
| Tab switch | Instant swap, 50 nodes mount | Wrap `selector-content` in `opacity: 0 → 1` 120ms cross-fade via CSS (`transition: opacity 0.12s`). Keep `selectedSet` memo so only changed rows re-render; already `flex: Set` — good. |
| Card tap `+` | `background-color` paint | Animate `transform: scale(0.92) → 1` 140ms + `opacity` on check icon. Keep `border-left` color transition but duration 100ms. |
| List entrance | All cards fade together | Stagger: `animation: cardIn 0.22s backwards; animation-delay: index * 20ms` (capped at 6). Feels alive without extra JS. |

Add `prefers-reduced-motion` already at `index.css:2370` — keep.

---

## 5) Implementation steps (each <50 lines)

**M1 — Header + search chip + tabs (30 min)**
- `CourseSelector.jsx:156` search-wrap (already has chip, just restyle to ghost)
- `index.css:481` search-wrap/filter-chip, `index.css:534` tabs pill 32px
- `App.jsx:306` compact header 0.6rem

**M2 — Filter single-column (20 min)**
- `index.css:565` `filter-bar` → `grid-template-columns: 1fr` on `max-width:600px` (override), `filter-bar-foot` as flex row, `filter-select:only-of-type` spans auto
- `CourseSelector.jsx:195` keep collapsible, default closed

**M3 — Cards + bottom quiet (30 min)**
- `index.css:670` course-item 56px, meta single line, `peek-btn` hidden, `+` circle
- `App.jsx:324` filter-actions → ghost single row, move inside `selector-content` footer

**M4 — Motion polish (40 min)**
- `index.css:1580` sheet `will-change` toggle via JS `onTransitionStart/End`, `filter-collapsible` add opacity inner, `selector-content` cross-fade, `course-item` stagger via inline `style={{ animationDelay: `${i*20}ms` }}` in `SearchResults`

---

## 6) Verification

- Open sheet on 375×667 SE, 390×844, RTL — search + tabs + 4 cards visible without scroll before filters. Tap `فلترة` → filters slide, no layout jump of cards below (they translate, not reflow). Toggle `ENGL2101` → `+` scales, blue left border appears, no 100ms lag. Switch tabs → 120ms fade, not flash. Bottom `تحديد الأوقات` is quiet, not competing.

**Next:** Approve M1+M2 first (biggest declutter) or go all M1-M4 together (~120 lines) for the full amazing feel.
