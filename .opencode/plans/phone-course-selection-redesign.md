# Phone Course Selection — Redesign from Scratch (Drawer → Sliding Sheet)

**Status:** Plan — awaiting approval (no code)
**Scope:** `app/src/App.jsx:302` (mobile trigger + sidebar), `app/src/components/CourseSelector.jsx:131` (selector), `app/src/index.css:1674` (bottom sheet)
**Ask:** Replace the janky bottom drawer (“70% of screen, pushes with keyboard, truncated filters”) with a neat, interactive sliding surface. Desktop keeps the 25% rail.

---

## 1) Diagnosis — why the drawer feels like shite

**Structure:**
- Sheet is `fixed bottom:0; height: min(85dvh,680px); transform: translateY(105%)` (`index.css:1770`). Inside, `course-selector` is `flex: column` with `selector-header` sticky, `filter-bar` grid, `selector-content` scroll. On 390px the header (search 44px + `فلترة` chip 32px) + tabs (36px) + expanded filters (110px) + `filter-actions` (56px sticky) consume ~290px before the first `ARAB1358` card. Only 2.5 cards fit above the fold.
- Two competing counts: tab `All Courses 50` + filter bar `40 / 1290` + sheet subtitle `إدارة المقررات · 1`. Same number three times.

**Interaction:**
- No spring, no velocity — `transform 0.34s cubic-bezier` feels linear and heavy. Swipe-down to close only works if `scrollTop <=4` (`App.jsx:77`), otherwise scroll fights the gesture. Keyboard opens → `visualViewport` shrinks to ~45% but sheet stays `85dvh` of layout viewport, so search is pushed behind the keyboard until JS `--sheet-h` catches up (jank).
- Tap targets: `+` circle `28px` is okay, but `eye` was hidden then faint then hidden again; long-press (520ms) for preview is undiscoverable and competes with scroll.

**Visual:**
- After recent squarish pass, the sheet still has `16px` top radius (`146%` feels like a card, not a sheet), `box-shadow: 0 -12px 32px` is soft but the sheet’s `background: var(--card)` on `bg: #F8F9FB` has low contrast, so it bleeds. `filter-chip` was solid hard blue, now baby powder ghost — better, but still sits inline with search, stealing 80px.
- Dark still reads cold despite charcoal fix because schedule blocks use `indigo` dark `COLORS` that clash with charcoal.

---

## 2) Goals for the replacement

- **One thumb, one sheet, one job:** Search → filter (on demand) → pick. No persistent filter bar.
- **List owns the sheet:** ≥4.5 cards visible on SE (667px) without scroll, ≥6 on 844px.
- **Motion is composited only:** `transform`/`opacity`, spring, no layout reflow. Keyboard and sheet move together.
- **No drawer feel:** It should feel like a native sheet (iOS) or a side sheet (trailing edge) — not a drawer that covers 70% and leaves a dimmed schedule peeking.
- **Desktop untouched:** `≥901px` keeps the rail. Phone `<900px` gets the new surface.

---

## 3) Proposed — Trailing Side Sheet (not bottom drawer)

**Why trailing side, not centered modal?**
- Bottom sheet is thumb-friendly but fights the keyboard (vertical space). A **side sheet** slides from the trailing edge (right in LTR, left in RTL) — same thumb reach, but vertical space is 100% (`100dvh`), so keyboard only shrinks width slightly, not height. List stays tall. It also matches the `إدارة المقررات` entry button which sits top (right in RTL) — the sheet slides from that edge, spatial mapping is clear.
- Centered modal would cover the schedule entirely and feel heavy for a frequent action (pick 5 courses). Side sheet at `92vw / max 400px` keeps a sliver of schedule visible as context, but not competing.

**Surface spec:**
- **Frame:** `fixed inset: 0; display: grid; grid-template-columns: 1fr 92vw` (or `92vw 1fr` in RTL). Leading column is `backdrop` (`rgba(0,0,0,0.32) + blur(6px)`), trailing column is sheet `width: min(92vw, 400px); height: 100dvh; background: var(--card); border-inline-start: 1px solid var(--card-border); box-shadow: -8px 0 32px rgba(0,0,0,0.14)`. No top radius — **squarish 2px** inner, `0` outer (sheet is edge-to-edge, bezel is the `1px` border).
- **Handle:** No top `sheet-handle` bar (bottom-sheet idiom). Instead a `28px` drag handle on the **leading edge** (vertical, centered) with `grip` dots — drag trailing edge to close. Tap backdrop closes.
- **Header:** Compact `0.6rem 0.75rem` with `إدارة المقررات` `0.95rem` + subtitle `1 · 40` (`0.68rem` dim) left, `X` icon `32px` right. No `إغلاق` text.
- **Search:** Single row: `input` (`flex:1`, `dir:auto`, `16px`) + `فرز` chip (`2px` squarish, `var(--accent-tint)` when active, no icon/badge). No `×` inside input when RTL — chip is the filter affordance.
- **Tabs:** Pill segment `32px` as before, but now `All` shows `50` muted, `Selected` shows `1` solid — single source.
- **Filters:** Collapsed by default. Chip tap expands an inline panel **inside the sheet header** (not pushing list down with a 3-row grid). Panel is `1fr` single column, `College` full width, `Department` full width (when visible), foot `count` + `مسح` on one centered row. Uses `grid-template-rows: 0fr→1fr` + `opacity/translateY` (already) — but now the panel lives *above* the list, not inside it, so list doesn’t reflow.
- **List:** `selector-content` `flex:1; overflow-y:auto; padding: 0.5rem` with `course-item` `56px`, `meta` single line `CASS • 1 • Sun…`, `+` circle `28px` (inverts when selected). No `eye` on phone — long-press preview stays but `eye` button removed for declutter. Stagger `cardIn 0.22s` `18ms`.
- **Bottom:** No sticky `filter-actions` inside the sheet. Sheet footer is `Generate (n)` primary `10px` squarish, full width, `position: sticky; bottom: 0;` with `border-top`. `Time Filters` / `Exam Dates` move out of the sheet entirely — they become a floating `FAB`-style row on the main schedule (behind the sheet) or a second sheet. For now, keep them where they are (`App.jsx:347`) but make them ghost `36px` pills, not equal fills, so they don’t steal sheet height.

**Motion:**
- Open/close: `transform: translateX(100%)` (or `-100%` in RTL) → `0` with `spring: 320ms, stiffness 320, damping 32` via CSS `cubic-bezier(0.22,1,0.36,1)`. Backdrop `opacity 0→1` `180ms`. No `height` animation.
- Keyboard: No `visualViewport` height hack — side sheet height is `100dvh`, so keyboard (horizontal) only reduces width by ~0px, list stays same height. Search stays visible because sheet is full height and input is `position: sticky; top: 0` inside the sheet.
- Gesture: Horizontal drag on sheet/edge handle or swipe on backdrop. If `dragX > 80px` or `velocity > 0.4`, close. Use `touch-action: pan-y` on list so vertical scroll doesn’t trigger horizontal close.

**A11y:**
- `role="dialog" aria-modal="true" aria-label={t.manageCourses}` on sheet, `focus-trap` on open, `Esc` closes, `inert` on `main` behind. RTL `dir` flips grid columns.

---

## 4) Files & scope

| File | Change |
|---|---|
| `App.jsx:319` | Replace `aside#sidebar` bottom sheet with `SideSheet` portaled `div[role=dialog]` + backdrop. Keep `showSidebar` state, add `sheetRef` + `dragX` + `focus-trap`. Move `CourseSelector` inside. Keep `filter-actions` outside sheet (main). |
| `CourseSelector.jsx:131` | Keep `search-wrap` + `filter-chip` (now `فرز`), but remove `visualViewport` `--sheet-h` hack (side sheet doesn’t need it). Keep `filterOpen` collapsible. |
| `index.css:1770` | Delete bottom-sheet block (`position:fixed bottom:0; height:85dvh; transform:translateY`). Add `.side-sheet`, `.side-sheet-backdrop`, `.side-sheet-panel` grid. Keep `@media (max-width:900px)` but change inside to side-sheet. |
| `index.css:542` | `filter-chip` stays ghost `2px` squarish, baby powder when active — no icon. |
| `ThemeContext.jsx:25` | Keep `html.theme-transition` for smooth dark switch. |

Desktop CSS (`≥901px`) untouched — `.sidebar` and `.main-content` remain grid rail.

---

## 5) Risks & fallback

- **RTL grid flip:** `grid-template-columns: 1fr 92vw` must mirror for `dir="rtl"` (`92vw 1fr`). Use logical `inset-inline` or `data-dir` attribute.
- **Old Android no `visualViewport`:** Not needed for side sheet — fallback is static `100dvh`.
- **Focus trap:** Must return focus to `mobile-controls` button on close.

---

## 6) Verification

- Open on SE (375×667) RTL, tap `إدارة المقررات` → sheet slides from trailing edge `320ms`, backdrop fades, search focused, keyboard opens but sheet stays `100dvh` (no push). Filter chip `فرز` tap → single-column selects expand without reflowing cards below (cards translate, not jump). Select `ARAB1358` → `+` inverts in one frame. Swipe sheet edge or tap backdrop → closes with `translateX` spring. Desktop `≥901px` still shows rail, no sheet.
- Build `vite build` + `ship.js` (for Pages) and `netlify deploy --build` both pass.

**Next:** Approve to replace the drawer with the side sheet in one PR (~120 lines). Or want a centered modal variant instead?
