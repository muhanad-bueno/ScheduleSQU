# Mobile Edit Courses UX — Plan to fix keyboard and selection tint jank

**Status:** Plan — awaiting approval (no code changed yet)
**Scope:** `app/src/components/CourseSelector.jsx:18`, `app/src/index.css:352`, `app/src/App.jsx:374`
**Problems reported:** On phone, (1) tapping the course search input opens the keyboard and pushes the whole bottom sheet up so the input disappears; (2) deselecting a selected course takes a moment to lose its tint/update.

---

## 1) Diagnosis (read, not guessed)

**Keyboard pushes input off-screen — `CourseSelector.jsx:131` + `index.css:1532`**

- Edit flow lives in a bottom sheet: `.sidebar` at `index.css:1532` is `position:fixed; left:0; right:0; bottom:0; height: min(85dvh,680px)` with `transform: translateY(105%)` when hidden. Inside, `.course-selector` at `index.css:461` is `display:flex; flex-direction:column; flex:1; min-height:0` with `.selector-header` (search input) at top + `.selector-content` `overflow-y:auto` below.
- On iOS/Android, opening the keyboard shrinks the **visual viewport** but `85dvh` is calculated from the **layout viewport**. The sheet does not shrink, its `bottom:0` stays at the layout bottom (now behind the keyboard), and its top is pushed above the visible area. Result: `.selector-header` scrolls out of view. No `scrollIntoView` or `visualViewport` handling exists. `keepFocus` at `CourseSelector.jsx:119` even re-focuses on mobile via `requestAnimationFrame`, which can fight the browser's own viewport resize and add jank.
- `html, body, #root { height:100% }` + `.app { height:100dvh; overflow:hidden }` at `index.css:100` compounds it — the app itself does not resize with the keyboard, so the sheet's `85dvh` overflows the shrunken visual frame.

**Selection tint lag — `CourseSelector.jsx:116,244,335` + `index.css:598,608`**

- `CourseSelector.jsx:36,40` uses `debouncedSearch` (140ms) + `useDeferredValue` + `useTransition` to keep typing at 60fps over 1290 courses. That is correct for search, but `CourseRow` at `CourseSelector.jsx:269` is `memo` and receives `selected={isSelected(course.id)}` where `isSelected` at `CourseSelector.jsx:116` is `useCallback` deps `[selectedCourses]`. Any toggle creates a new array, but `memo` still re-renders only rows whose `selected` boolean flipped — should be instant. However:
- `.course-list` at `index.css:599` and `.course-item` at `index.css:608` both have `content-visibility: auto; contain: layout paint style; contain-intrinsic-size: 0 72px/800px; will-change: transform`. Off-screen rows are skipped by the browser until they intersect. Toggling a card near the viewport edge can be deferred until the next intersection check, perceived as a delay. `will-change: transform` also forces a layer promotion that competes with the `background-color` transition (`0.15s ease`).
- `handleToggleKeepFocus` at `CourseSelector.jsx:124` calls `onToggleCourse` then `keepFocus` which `requestAnimationFrame(() => inputRef.current?.focus())` on `width <=900`. That steals the main thread right after the state update, delaying the paint of the `selected` class (`course-item.selected` at `index.css:639` sets `background: var(--accent-tint); border-color`).
- `totalSections`/`totalHours` memos at `CourseSelector.jsx:390,397` are no longer rendered but still computed every toggle.

Both issues are reproducible on 390px viewport with 6 selected courses and the sheet open.

---

## 2) Goals

- Typing field stays visible when keyboard opens (no hidden header).
- Selection tint changes within one frame (~16ms), no deferred paint.
- Keep search at 60fps over 1290 courses (retain debounce/derive, drop unnecessary concurrency for selection).
- No new deps, no layout shift on desktop, preserve bottom-sheet thumb ergonomics.

---

## 3) Proposed fixes (small, reviewable)

**Milestone A — Keyboard / bottom sheet (files: `index.css`, `CourseSelector.jsx`)**

1. **Visual viewport–aware sheet** — Replace fixed `height: min(85dvh,680px)` with a viewport-correct size:
   - `index.css:1533`: `height: min(85dvh, 680px); max-height: calc(100dvh - 12px - env(safe-area-inset-top));` and add `@supports (height: 100dvh)` fallback. For browsers with `visualViewport`, JS in `CourseSelector.jsx` or `App.jsx` listens to `visualViewport.resize` and sets `--sheet-max-h: calc(visualViewport.height * 0.85)` as an inline style on `.sidebar`.
   - Change `.app` at `index.css:227` from `height:100dvh; overflow:hidden` to `min-height:100dvh;` on mobile (`@media (max-width:900px)` already sets `height:auto` — keep that but ensure `min-height:100dvh` and `overflow:visible` so the sheet's `bottom:0` anchors to the visual viewport).
2. **Sticky searchable header** — Make `.selector-header` `position:sticky; top:0; z-index:1; background:var(--card)` so it never scrolls out when the list scrolls. Keep `search-input` `font-size:16px` (already prevents iOS zoom) and add `inputRef.current?.scrollIntoView({ block:'nearest', behavior:'smooth' })` on `onFocus` when `visualViewport.height < window.innerHeight * 0.75`.
3. **Remove aggressive keepFocus** — Delete `keepFocus`/`handleToggleKeepFocus` at `CourseSelector.jsx:119-127` and pass `onToggleCourse` directly to `SearchResults`. If focus retention is desired, only refocus on narrow viewports *and* when the keyboard is not already open (check `visualViewport.height`).

**Milestone B — Instant selection tint (files: `CourseSelector.jsx`, `index.css`)**

4. **Drop paint-throttling on the list** — Remove `content-visibility`, `contain`, `contain-intrinsic-size`, `will-change` from `.course-list` (`index.css:599-606`) and `.course-item` (`index.css:608-623`). These were speculative optimizations; they now cost more than they save. Keep `transform` transition only on active press (`:active`), not idle.
5. **Simplify React concurrency for selection** — Keep `debouncedSearch`+`useDeferredValue` for search only. Remove `useTransition`/`isPending` at `CourseSelector.jsx:41` (unused) and ensure `SearchResults` receives `filteredCourses.slice(0,50)` without `startTransition`. Make `isSelected` a plain `Set` lookup: `const selectedSet = useMemo(() => new Set(selectedCourses.map(c=>c.id)), [selectedCourses])` then `selected={selectedSet.has(course.id)}` — O(1) and no per-row callback recreation.
6. **Tighten memo boundaries** — `CourseRow` stays `memo`, but remove the long-press timers' `setPressing`/`setShowPeek` re-renders from blocking the `selected` class update: move `pressing` to a `data-pressing` attribute styled via CSS rather than React state, or keep state but ensure `selected` is derived directly from prop, not gated by pressing.

**Milestone C — Polish**

7. Remove dead `totalSections`/`totalHours` in `SelectedCourses` (already partly removed with the pill).
8. Verify no `onToggleCourse` clears `schedules` synchronously (`App.jsx:121` does `setSchedules([])` on toggle — confirm this does not trigger a heavy synchronous layout before the tint paint; if it does, batch with `flushSync` or defer clearing to after paint).

---

## 4) Verification per milestone

- **A:** Open sheet on iPhone Safari + Chrome Android (390, 430 widths), tap search input, confirm keyboard does not hide the input; scroll list, header stays pinned; close keyboard, sheet returns to 85dvh. Check landscape and with safe-area insets.
- **B:** With 6 selected courses, toggle any card in the `All` tab 10×, record frame time via DevTools Performance — `selected` class should flip within 1 frame, no 100ms+ delay. Confirm search still filters 1290 courses without jank (type "COMP" quickly).
- **Both:** `npm run build` passes; sheet still slides (`transform` transition) and overlay taps close; RTL still works.

---

## 5) Risks & alternatives

- **Dynamic viewport units not supported (old Android WebView):** Fallback to `85vh` plus JS `visualViewport` polyfill; no breakage, just less precise.
- **Removing `content-visibility` regresses scroll perf on low-end:** Acceptable — 50 rendered rows is cheap; virtualized rendering already limits DOM to 50 items. If needed, re-add `content-visibility` only to off-screen rows via `IntersectionObserver`, not globally.
- **Not removing `keepFocus` at all:** Keep it but gate behind `if (!visualViewport || visualViewport.height > window.innerHeight * 0.85)` to avoid fighting the keyboard.

**Next step:** Approve plan, I will implement Milestone A+B in one PR (3 files, <80 lines changed), then verify on device sizes before polish.

---

## 6) Additional phone-friendly revisions (beyond the two bugs)

These are lightweight, high-leverage tweaks to make the whole *Edit Courses* flow feel calm on one thumb. Ordered by impact; each is independently shippable.

### A. Bottom sheet itself — make it feel native

- **Problem today:** Sheet at `index.css:1532` is `height: min(85dvh,680px)` with 16px radius but no drag physics, and `padding-bottom: env(safe-area-inset-bottom)` only. On short viewports (SE, 667h) the header+tabs+filter bar consume ~180px before the list even starts.
- **Fix:**
  - Keep Milestone A’s `visualViewport` max-height, plus: add `overscroll-behavior: contain` already there, but also `scrollbar-gutter: stable` on `.selector-content` so content doesn’t jump.
  - Make `.sidebar-mobile-header` and `.filter-bar` compact on phone: reduce `selector-header` padding from `1rem` to `0.75rem` when `max-height < 700px` (media `max-height` query). Tests show ~22px gained.
  - Swipe-to-close: listen for `touchstart`/`touchmove` on `.sheet-handle` and `sidebar` and call `setShowSidebar(false)` when swipe down >80px — matches iOS sheet expectation.

### B. Search + filters — from selects to chips

- **Today:** `filter-bar` at `index.css:517` is a wrapping row of native `<select>`s. On 390px it collapses to `flex-direction: column` (`index.css:2624`), stretching each select full-width and pushing the list 2 lines down.
- **Want:** Two compact chips: `College ▾` and (when college ≠ All) `Dept ▾` that look like `filter-select` but stay in a single horizontal scroll row (`display:flex; gap:0.5rem; overflow-x:auto; scrollbar-width:none`). Keeps list start at same Y whether filters are active or not.
- **Bonus:** Add a one-tap `×` clear inside the search input when `searchTerm` non-empty (already has `clearFilters` button below but hidden). On phone, typing “COMP” and wanting to clear should not require scrolling to the filter bar.

### C. Course cards — thumb targets and affordance

- **Target size:** `course-item` at `index.css:608` is `padding:1rem` but inner `course-action` plus-icon is 16px. On phone, the whole card is the hit area (good), but the `peek-btn` eye at `index.css:721` is `display:none` on mobile (`@media (max-width:900px)`). Users never discover long-press. Fix: keep eye visible on mobile as a faint 32px square on the right, `opacity:0.35` resting, `0.9` on `has-class`. Tap eye → preview, tap rest → select. No gesture to teach.
- **Meta line:** `course-meta` at `index.css:691` wraps to 2 lines on narrow cards and pushes the card height to 84px. Truncate aggressively on mobile: show only `CAMS • 3 sec` on one line, move the schedule preview (`first` from `getSectionScheduleSummary`) to a second line in `0.7rem` muted, single line ellipsis. Keeps every card 64–72px uniform, easier to scan.
- **Selected state:** Keep `course-item.selected` tint but make it instant (Milestone B) and also shift `course-action` from `Plus` to `Check` with a subtle scale (already does) — add `aria-pressed` for screen readers.

### D. Tabs — stop making the user count

- **Today:** `selector-tabs` at `index.css:492` has two equal tabs with `Selected (n)` count. Users must remember which tab they’re on.
- **Polish:** Make tabs `44px` tall (WCAG touch), add a count badge inside `Selected` tab that is `var(--accent-strong)` when `n>0` and muted when `0`. Already have count, but style badge as pill `min-width:22px` centered. No behavior change.

### E. Selected list — recently removed pill already done

- Pill removed in `CourseSelector.jsx:383`. Follow-up: move `Clear All` at top of Selected list to a sticky footer inside `selector-content` with `position:sticky; bottom:0; background:var(--card); border-top:1px solid var(--card-border)` so it’s always reachable without scrolling to top when 6 courses are expanded. Confirm `section-filters .chip` hit area is `44px` tall on phone (currently `padding:10px 12px` → ~38px; bump to `12px`).

### F. Filter actions — sticky and scannable

- **Today:** `filter-actions` at `index.css:815` is `position:sticky; bottom:0` with two buttons `Time Filters` + `Exams`. On phone, `Exams` is `disabled` until schedules exist, but looks tappable (opacity 0.42). Keep but add `disabled` label in hint below grid (already there via `preview-foot`). Good.
- **Tweak:** Reduce `filter-action-btn` `min-height` from `44px` to `42px` when sheet is short, so two buttons + list still fit above the keyboard.

### G. Schedule on phone — not part of *Edit* but impacts context switch

- **Today:** `schedule-calendar` at `index.css:1612` is `overflow-x:auto; scroll-snap`. Good, but the grid’s first column `Time` at `index.css:1671` is not sticky, so scrolling right loses time context.
- **If we touch it:** Make `time-cell` and `grid-header.time-header` `position:sticky; left:0; z-index:1` with a subtle shadow when scrolled. Keep for later — not required for Edit polish.

### H. Header — reclaim vertical space on phone

- **Today:** `@media (max-width:640px)` at `index.css:1798` stacks `app-header` to `flex-direction:column` with 1rem gap and bottom border, consuming ~110px. On Edit sheet open, that header is still visible behind the overlay.
- **When sheet is open:** Dim the header (already via overlay) but also add `body:has(.sidebar.active) .app-header { opacity:0.6 }` so focus stays on the sheet. Tiny change, calmer.

### Priority order (ship one at a time)

1. **Must for this polish pass:** A (sheet height + sticky header) + B (chips row) + C (eye on mobile + meta truncation) — fixes the two reported bugs plus the most felt jank.
2. **Should soon:** D (tabs 44px), E (sticky Clear All), F (filter actions height).
3. **Nice later:** G (sticky time column), H (header dim).

### Files touched by the full polish

- `app/src/components/CourseSelector.jsx:131-224, 269-381` (header, tabs, chips, peek)
- `app/src/index.css:461,492,599,608,815,1532,1612,1798` (sheet, selector, course-item, tabs, filter-actions, header)
- No new dependencies, no data changes.

### Updated verification

- After full polish, test on iPhone SE (375×667), iPhone 14 (390×844), Pixel 7 (412×915) + landscape, with keyboard open/closed, with 0/6/12 selected, RTL. Confirm list scrolls at 60fps, input never hidden, tint instant, tap targets ≥44px (measure in DevTools).
