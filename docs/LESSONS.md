# Lessons Learned — ScheduleSQU (Fall 2026)

This project rebuilt the SQU schedule builder from a single-college Arts prototype (253 courses) into a bilingual, 10-college system (1290 courses, 2923 sections, 67 departments) with on-device PDF generation. The notes below are what actually mattered, not what we guessed.

## 1. Data is the product — treat Excel as an API
- **Source is messy:** `ExportToExcel.xls` and `allcollegesarabic.xls` are the same 6702 rows but with reversed column order and Arabic headers (`رمز المقرر` vs `Course Code`, `القسم` vs `Department`). Header detection must handle both languages and leading spaces (`" القاعة"`). Hardcoding column indices breaks the moment SIS exports RTL.
- **Section is the key, not time:** `CourseCode + SectionNumber` is the only stable key. Two rows with the same section number are one section with two meetings (e.g., `ACCT3111 01` SUN+TUE), not two sections. `convert-data.js:158` dedupes `time` via `!sect.times.includes(time)`.
- **Bilingual is a merge, not a second import:** English and Arabic files have the same 1290 codes. We read English as primary and Arabic as a patch (`courseMap[code].nameAr` / `collegeAr` / `departmentAr` / `instructorAr`). Concatenating rows would double-count.
- **Category is cross-reference:** `unielectives.xls` (24 codes) and `unirequirements.xls` (6 codes) are not courses to add — they are tag sets (`ueSet`/`urSet`) applied after consolidation. If you add them as rows, you get 30 duplicate courses.
- **Empty columns are normal:** 5728 exams, 0 with `Exam Building/Hall` (`ExportToExcel.xls:20`). Don’t show “TBA” rooms or warn “rooms may still change” — just omit it. The footnotes that said “rooms may still change” were removed for accuracy.
- **Lesson:** Always inspect the raw file with `XLSX.readFile` + `sheet_to_json(header:1)` and print the header row before mapping. Don’t trust the spec sheet.

## 2. Bilingual isn’t translation — it’s two independent copies
- **Copy:** English `One place to build your schedule` → Arabic `صمم جدولك بكل سهوله` was first a literal translation and read stiff. Rewriting Arabic from meaning (verb-initial, `و` linking, `،`/`؟`, no implied pronouns, warm `ـك`) fixed it. The skill’s rule 1 (“draft each language separately”) is the only one that matters.
- **Data:** Course names, colleges, departments, instructors all have `En`/`Ar` variants. Store both (`name`/`nameAr`/`nameEn`), display via `lang === 'ar' && course.nameAr ? course.nameAr : course.nameEn`. Never fall back to `course.nameAr || course.name` without a null check — `course` itself can be `null` from stale `localStorage` (see crash below).
- **UI:** `collegeArMap` / `departmentArMap` derived from the data, not hardcoded. Filter `<select>` values stay English (stable keys) while display text switches via `displayCollege()` / `displayDepartment()`.
- **PDF:** `jsPDF`’s Helvetica has no Arabic glyphs. Embedding `Amiri` (431k TTF → 574k base64) fixes it but blows the chunk to 574k and needs `setR2L(true)`. For print fidelity we reverted PDFs to English-only — no more boxes. If you need Arabic PDFs later, lazy-load the font only when `lang==='ar'` and `doc.addFont` per-doc.

## 3. Mobile is not a smaller desktop — it’s a different interaction
- **100vh is a lie on iOS:** `height:100vh` leaves a gap under the address bar and makes the whole page scroll. Fix was `height:100dvh` + `html,body,#root: height:100%` + `.app: height:100dvh; overflow:hidden` so only `.selector-content` scrolls. Changing to `min-height` broke it again — revert was the fix.
- **Drawer vs bottom-sheet:** Side drawer (`86vw` from left) needs a stretch to the top to be thumb-reachable. Bottom-sheet (`min(85dvh,680px)`, `translateY(105%)`, `sheet-handle`, `safe-area-inset-bottom`) wins for one-handed use. The `mobile-controls` button was `width:auto` so it hugged the left — fixed to `width:100%`.
- **Keyboard stays up:** Tapping a `course-item` blurs the `search-input` (mobile hides the keyboard). Fix: `inputRef` + `keepFocus()` on `requestAnimationFrame` + `onMouseDown: preventDefault()` on the row. Without it you tap, the keyboard drops, you tap the box again — jank.
- **Touch targets:** `28px` grid cells → `36px` on `<900px`, `filter-select` `44px`, `filter-action-btn` `44px`, `mobile-controls` `44px`. Below 44px misses are real.
- **Long-press:** `520ms` with `setPointerCapture` + move `>10px` cancels, peek at `300ms`, `vibrate(18)` — feels discoverable, not hidden.

## 4. Visual calm is about what you remove
- **Counted 173 `border` hits → 42 visible lines → kept 12.** Outer shells (course-selector, filter-panel, main-content, modals) need `1px #CBE6F0` because `bg` and `card` are both `#FFFFFF` on light — shadow alone is invisible. Inner cards (`course-item`, `chip`, `time-grid` cells, `schedule-grid` 90 inner borders, `welcome-tip` dashed) were box-in-box noise. Fix: `course-item` → `border:1px solid transparent` (gap does separation, only `selected` shows accent), `chip` → transparent, `schedule-grid` → `gap:1px` on `card-border` background (one line, not 90), `welcome-tip/contact` → `border:none` with left accent or `bg-soft`.
- **2px radius is sharp, not soft:** It doesn’t soften, so borders read as technical lines. That’s intentional for a flat, carbon style — don’t add larger radius to “fix” it, just remove the extra borders.
- **Top alignment:** `app-main` was `align-items:stretch` (equal height) but `gap:1rem` + `min-height` made tops drift by 1px. `align-items:start` + `align-self:start` + `min-height:520px` levels the tops; equal height isn’t needed when the content heights differ (course list scrolls, schedule empty is centered).

## 5. Performance is not about less code — it’s about less work on the main thread
- **Data:** `data.json` was pretty-printed `2.87M` → minified `1.87M` (save 1M) via `separators=(',',':')`. Gzipped it’s ~300k, fine, but the parse is still 1290 objects. Keep it minified.
- **Search:** Filtering 1290 courses on every keystroke with `sort` inside `useMemo` was `O(n log n)` each time. Fix: pre-sort once `sortedCourses = useMemo(() => courses.filter(Boolean).slice().sort(...), [courses])` then filter without sort. Add `useDeferredValue` (140ms debounce + deferred) so typing stays 60fps.
- **Schedule generation:** `generateSchedules` is exponential (6 courses × 4 sections). Offloaded to `schedulerWorker.js:1` (1.63k) via `new Worker(new URL(...), {type:'module'})` + `startViewTransition` for the swap. Fallback to main thread if worker fails.
- **Rendering:** `course-list` 50 cards → `content-visibility:auto` + `contain: layout paint` + `contain-intrinsic-size:0 72px` + `will-change:transform` on `course-item`. `MiniWeekStrip` was 50 tiny divs recomputed on every `blockedSlots` change — memoize the grid.
- **Bundle:** `jspdf` 385k + `html2canvas` 201k are lazy (`import('jspdf')` only on export), `collegePdf` 5k lazy, `amiriFont` 574k removed again (was lazy but still large). Main stays `~250k` gzipped `80k`.

## 6. Crashes are often stale state, not logic
- **The `nameAr` crash (`index-Ck-cGDmY.js:11`):** `CoursePreviewModal` computed `displayName` *before* `if (!open||!course) return null`, so when `previewCourse` was `null` (initial render) it read `course.nameAr` of `null`. Fix: move `displayName` after the guard and use `course?.nameAr`. Same for `SelectedCourses` map where `selectedCourses` from `localStorage` could contain `null` after a bad write — add `filter(Boolean)` and `if (!course) return null` in `CourseRow`.
- **Lesson:** Every `useMemo`/`useEffect` must be before any early return — React counts hooks. `ExamModal` had `useEffect` → early return → `useMemo`, which is `hook #1` vs `hook #2` mismatch (React #310). Fix: move all hooks before `if (!open) return null`.

## 7. Process that worked
- **Plan before code, but keep plans in `.opencode/plans/`** — `mobile-polish.md` and `ux-redesign-*.md` were approved before building, prevented rewrites.
- **Ship via `app/dist` → `repo root` (no CI):** `vite build` + `node ship.js` + `git add -A` + `git commit -m "Deploy: …"` + `git push`. The `app/` is gitignored, so the source never pollutes the Pages branch.
- **Version both data and code:** `DATA_VERSION` (`app_version` in localStorage) wipes stale selections when the shape changes (`v3.2` for bilingual), while `data.json:version` (timestamp) clears `selectedCourses` in `dataLoader`.
- **One thing per commit:** `fix week density`, `remove @ SQU`, `department filter`, `keyboard keep-up` — each as a separate `vite build` + `ship` so a hard refresh always gets a new `index-*.js` hash.

## 8. What we’d do differently
- Don’t add `MiniWeekStrip` at all — it was “a shit ton of columns” even after fixing to 5, and was ultimately scrapped. The header `Selected (4) • 14 sections` was also scrapped for being janky.
- Don’t try to make PDFs bilingual with embedded fonts until you have a proper subset and RTL shaping test — English for print is calmer and 500k lighter.
- Keep the two-button bar (`Time Filters` + `Exams` disabled until `schedules.length>0`) as modals from the start, not as inline collapsibles that later become modals.

---
*Saved 2026-08-14 — for the next session, start from `app/src/components/CourseSelector.jsx:70` (college/department filter) and `app/src/utils/collegePdf.js:37` (portrait, department-grouped, English-only).*
