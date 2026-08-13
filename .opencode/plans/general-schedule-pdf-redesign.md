# General Schedule PDF — Print-Friendly Redesign (from scratch)

**Status:** Plan — awaiting approval  
**Scope:** Rewrite `app/src/utils/collegePdf.js:36` (`exportCollegeGeneralPdf`) from scratch. No changes to `ScheduleViewer.jsx` single-schedule PDFs yet.  
**Goal:** A catalog you can hand to a registrar and print on any A4 laser printer without bleeding, heavy ink, or orphaned headers.

---

## 1) Diagnosis — why the current PDF bleeds and feels unprintable

Read `app/src/utils/collegePdf.js:60-238`:

| Symptom | Root cause (line) |
|---|---|
| **Columns bleed off page** | `columnStyles` widths sum to 196 mm but available width is `PAGE_W - 2*M = 210 - 28 = 182mm` → **14 mm overflow** (`collegePdf.js:220-226`). `autoTable` does not shrink-to-fit, it just clips. Long instructor names (44 chars) + schedule strings up to 213 chars + exam strings (34 chars) force horizontal overflow too. |
| **Ink-heavy, not print-friendly** | Cover is solid black `fillColor [10,10,10]` + `rect(0,0,W,52,'F')` (`collegePdf.js:78`), college hero bars are `[14,14,14]` (`collegePdf.js:147`). On a laser this is ~80% coverage → toner waste, slow dry, gray smudges. Head row is `[20,20,20]` white-on-black too. |
| **Departments collide** | All departments of a college are dumped as one long `autoTable` with manual `startY +=6` (`collegePdf.js:233`). No page-break logic per department. A department header can land at `PAGE_H - 10` and its table starts on next page with no re-drawn header. Course header rows (`colSpan:5` `collegePdf.js:194`) are not repeated, so a split page has anonymous rows. |
| **Tiny, dense type** | `fontSize: 6.2` body + `6` header (`collegePdf.js:217-219`). Readable on screen, marginal at 600 dpi after printer halftone. No hierarchy — dept name is same weight/size as course header tint. |
| **No college identity** | Every college uses same gray `[239,248,252]` course header and same black hero. User asked for color tints — currently only light blue everywhere. |
| **Repeated headers missing** | College name only on first page of college (`collegePdf.js:152` draws once). If a college spills to 3 pages, pages 2-3 have no college in header. `addPageNumber()` runs after all drawing (`collegePdf.js:247`) so it cannot add per-page college breadcrumbs. |
| **TOC not usable for print** | TOC is an `autoTable` with 4 columns, no dotted leaders, no page-number references per college, not linked to page numbers (jsPDF page numbers added post-hoc). |

Validated on real data (`app/public/data.json`): 1,290 courses, 2,923 sections, 67 departments across 10 colleges. Largest college (CASS 253 courses) spans ~8-10 pages; current single-table approach will force `autoTable` to auto-split but without department grouping → headers collide.

---

## 2) Design goals (print-first)

1. **Never bleed.** Every table's exact width = available width. Tested at 100% scale on A4.
2. **Print-friendly by default:** ≤15% ink coverage per page, no full-bleed solids, light grid lines (`0.12mm`), white page with thin color accent bars (so B&W printing still works via grays).
3. **One college = one color tint** — pastel wash (5–8% saturation) for header + course stripe, distinct enough to find CEPS vs. ENG when flipping, but desaturated for laser.
4. **One department = one page group** — department never shares a page without a clear rule + gap, header never orphaned, header repeats if table splits.
5. **Clear headers on every page:** college bar + department sub-bar + table head repeated.
6. **Under 90 pages** for Fall 2026 (~1,290 courses). Average ~15 courses/page.
7. **Bilingual-safe:** English only for PDF (jsPDF Helvetica lacks Arabic glyphs) — keep Arabic in app, not in print. Course names stay English (`nameEn`).

---

## 3) Paper & layout spec (proposed)

**Keep A4 Portrait** (210×297mm) — filing, stapling, campus printers all expect portrait. Landscape would fix width but feels like a spreadsheet and forces rotation when flipping. We fix bleed by sizing columns correctly instead of rotating.

```
Page: A4 portrait, 210 × 297 mm
Margins: M = 12 mm all sides  (better than 14 mm — gains 4 mm width, still safe for cheap printers with 5 mm unprintable zone)
Available width: 186 mm
Available height per page (body): 297 - 12 - 12 - 10(footer) - 18(header) = 255 mm
```

**Column plan (5 cols, exact fit 186 mm):**

| Col | Field | Width | Overflow | Align | Notes |
|---|---|---|---|---|---|
| 0 | Sec | 12 mm | visible | center, bold | `01`, `02` |
| 1 | Instructor | 42 mm | linebreak | left | wrap at `/`, 44-char names wrap to 2 lines max; TBA muted |
| 2 | Schedule | 54 mm | linebreak | left | `SUN 10—11:50 • MON 10—11:50` wraps with `•` breaker; 213-char max wraps to 3 lines |
| 3 | Room | 30 mm | linebreak | left | `E100A · Engineering` wraps |
| 4 | Exam | 48 mm | linebreak | left | `19/08/2026 WED 11:30 — 2:30 PM` |

`12+42+54+30+48 = 186` exact. All columns `overflow: 'linebreak'`, `cellPadding: 1.4 mm`, `fontSize: 6.5` body / `6` header, `lineColor: [220,220,220]`.

Alternative if you want extra air: `M=10mm` → 190 mm avail → add 4 mm to Schedule. We can ship `M=12` default, toggle to `M=10` for dense mode.

**Type scale:** Helvetica only (jsPDF built-in, no embedding). Cover: 18pt bold, Section titles: 9pt bold, Dept: 7.5pt bold, Table body: 6.5pt, Footnote: 6pt. Print minimum is 6pt — we do not go below.

---

## 4) College color tints (print-safe pastels + text ink)

Each college gets a tint for its hero bar left-border (3 mm) + course header wash (7% opacity) + dept rule. Not a full-bleed background — just a 3 mm accent stripe + very light wash so B&W still shows gray difference.

| College | Short | Tint bg (RGB) | Accent stripe | Header text |
|---|---|---|---|---|
| Agricultural & Marine Sciences | CAMS | `[232,245,233]` #E8F5E9 | `[46,125,50]` | `#1B5E20` |
| Arts & Social Sciences | CASS | `[255,243,224]` #FFF3E0 | `[239,108,0]` | `#E65100` |
| Economics & Political Science | CEPS | `[227,242,253]` #E3F2FD | `[21,101,192]` | `#0D47A1` |
| Education | EDU | `[243,232,255]` #F3E8FF | `[107,33,168]` | `#581C87` |
| Engineering | ENG | `[254,226,226]` #FEE2E2 | `[185,28,28]` | `#7F1D1D` |
| Law | LAW | `[254,243,199]` #FEF3C7 | `[180,83,9]` | `#92400E` |
| Medicine & Health Sciences | COMHS | `[236,253,245]` #ECFDF5 | `[5,122,80]` | `#064E3B` |
| Nursing | NUR | `[252,231,243]` #FCE7F3 | `[190,24,93]` | `#831843` |
| Science | SCI | `[224,231,255]` #E0E7FF | `[67,56,202]` | `#312E81` |
| Preparatory Studies | CPS | `[245,245,245]` #F5F5F5 | `[82,82,82]` | `#171717` |

Course header inside each college uses that college's tint (`fillColor: tint`). Dept divider line uses accent. Header bar is white with 3 mm left accent + college name in accent color — zero ink-heavy solids.

---

## 5) Page architecture (new — departments own the pagination)

```
p1  COVER — white, thin 1 pt border, centered lockup, no solid fill
    “ScheduleSQU · General Timetable · Fall 2026” + stats line (10 colleges · 1290 courses · 2923 sections)
    Footer: “Generated on device · Aug 14, 2026 · Not official — verify on SIS”
    (ink: border + text only)

p2  CONTENTS — 2-col grid: # | College (accent dot) | Courses | Sections | starts on p.
    Dotted leaders (drawn with `doc.line` dashed) not needed — use right-aligned page numbers from second pass.
    Below: Legend — how to read Sec / Schedule • building / Exam (icon row, 6 pt)

p3+ COLLEGE SECTIONS — one college per spread, always starts on new page:
    Per-college header (repeats on every page of that college via didDrawPage hook):
      ┌─ 3mm accent stripe left ─┬─────────────────────────────┐
      │ COLLEGE NAME (13pt bold, accent color)                 │ 12mm top margin
      │ 253 courses · 410 sections · 10 departments (7pt gray) │
      └────────────────────────────────────────────────────────┘
      Thin 0.3pt rule below header (220 gray)

    For each department in college (sorted A-Z):
      ── Department page group ──
      Rule: department STARTS on new page unless it fits in remaining space
            (remaining ≥ 42 mm ≈ header 7 mm + 1 course header 6 mm + 2 section rows 12 mm + 6 mm footer).
            If not enough space → addPage() before drawing dept header.
      Dept header (always together with first course — keepWithNext):
        DEPT NAME (7.5pt bold, #1a1a1a) — left
        “12 courses” (6.5pt gray) — right
        0.2pt rule underneath in college accent (drawn with doc.line)
        5mm gap then table

      Table(s) for that dept:
        One autoTable per department (not one per college). Head: Sec | Instructor | Schedule | Room | Exam
        Head style: fill [245,245,245] light gray, text [60,60,60] — NOT college tint (so head stays neutral on print).
        Body: course header rows span all 5 cols, fill = college tint, font bold 7pt, halign left.
              section rows: normal, alternateRow fill [250,250,250] very light.
        Pagination: didDrawPage re-draws college header on every page; table head repeats automatically (autoTable `showHead: 'everyPage'`).
        Widows: if table splits mid-course (course header at bottom, sections on next page) → autoTable handles via `rowPageBreak: 'avoid'` for course header + next row group. We group rows logically so header+first section are never separated.

      Gap: 6 mm after table. If gap + next dept header would exceed footer zone → new page.

p_last  FOOTER on every page (drawn in didDrawPage, not post-hoc):
        Left: “ScheduleSQU · Fall 2026 — verify on SIS”
        Center: (optional) college short code + dept name truncated (so flipping shows context)
        Right: “p. 7 / 42” (6.5pt gray)
        Generated timestamp small at very bottom (4.5pt, not intrusive).
```

**Why “one dept per page group” not strictly one page per dept:** A dept with 2 courses (e.g., some LAW depts with 3 courses) would waste 80% white space if forced to a full page. Rule above gives: small depts can share a page but only if there is a clear 6 mm gap + rule line and both dept headers are fully visible. Large depts naturally span multiple pages; header repeats so never anonymous. This satisfies “departments had their own pages as to not collide with clear headers” without bloating to 67 pages of mostly-white.

If you prefer strict “always new page per dept” (most literal to request), it is a one-line toggle: `FORCE_DEPT_NEW_PAGE = true` → 67 dept pages + cover/TOC ≈ 70-90 pages (still OK). Plan ships with the smarter “pack if fits” default, flag for strict mode.

---

## 6) Visual spec details

- **Borders:** `lineWidth 0.12`, `lineColor [220,220,220]` — hairline for laser, not 0.2 heavy.
- **Cover:** White page, 0.8pt outer border (`#CBE6F0`), centered: LogoMark SVG replicated as tiny 3×3 grid using `rect` (no image embedding), then `ScheduleSQU` 18pt, `Sultan Qaboos University` 8pt gray, `General Timetable · Fall 2026` 9pt accent, stats 7.5pt.
- **Course header row:** `colSpan:5`, `fillColor: collegeTint`, `textColor: [20,20,20]`, `fontStyle:'bold'`, `halign:'left'`, `cellPadding:2.2`. Shows `CODE — Name [CAT]` where CAT pill is text only e.g., `[UR]` dim gray.
- **Instructor:** Normalize “To Be Announced” → `TBA` italic gray, with `fontStyle:'italic'`, `textColor [120,120,120]`.
- **Schedule:** Transform `SUN 10:00:00-11:50:00 | MON ...` → `SUN 10–11:50 • MON 10–11:50` (strip `:00`, 12h without AM/PM to save width; or keep 24h — propose 12h short as currently `formatTimeShort` does).
- **Room/Building:** If `room === 'Online'` show `Online · Distance Learning` single line, not building split. If `Closed section` → `Closed` gray italic.
- **Exam:** Split exam string: date `19/08/2026 WED` + time `11:30 AM – 2:30 PM` on two lines inside cell (`\n`) with `valign:'middle'` so column stays narrow but readable; or keep single line if shorter. Use `parseTimeStringTo12h` from `timeUtils.js:…`.

---

## 7) Implementation from scratch

**New file:** `app/src/utils/generalSchedulePdf.js` (clean rewrite, delete old `collegePdf.js` after).

```js
// generalSchedulePdf.js — outline
const COLLEGE_ORDER = [...] // same as before
const COLLEGE_TINTS = { 'College of Engineering': { bg:[254,226,226], accent:[185,28,28], text:[127,29,29]}, ... }
const PAGE = { W:210, H:297, M:12, AVAIL_W:186, HEADER_H:18, FOOTER_H:10 }

export async function exportGeneralSchedulePdf(allCourses) {
  // 1. group by college → sort by COLLEGE_ORDER, courses by code
  // 2. group each college by department → sorted A-Z
  // 3. doc = new jsPDF('p','mm','a4'); doc.setFont('helvetica')
  // 4. drawCover(doc)
  // 5. drawContents(doc, colleges, byCollege) // placeholder page numbers, filled on 2nd pass
  // 6. for each college:
  //      doc.addPage(); currentCollege = college; currentDept = null
  //      for each dept:
  //        ensureSpace(42) else addPage()
  //        drawDeptHeader(doc, dept, count) // returns y
  //        build body: flat array with colSpan course headers + section rows
  //        autoTable(doc, { startY, head:[...], body, ... columnStyles (sums to AVAIL_W), styles, headStyles, willDrawPage/didDrawPage for repeating college header })
  //        // hook: didDrawPage draws college header + footer on every page
  // 7. second pass: fill TOC page numbers + addPageNumbers() (footer already via didDrawPage, but ensure total)
  // 8. doc.save('ScheduleSQU_General_Fall2026.pdf')
}
```

**Key technical fixes:**

- **Exact columnStyles** as table above, with `tableWidth: 'wrap'` (or `186`) and `margin:{left:M,right:M}` so jsPDF never guesses width.
- **Linebreak handling:** `styles:{ overflow:'linebreak', cellPadding:1.4 }`, and `columnStyles[n].overflow='linebreak'` for all cols.
- **Repeating headers:** Use `didDrawPage: (data) => { drawCollegeHeader(doc, currentCollege); drawFooter(doc, pageNo); }` — set `currentCollege` before each `autoTable` and `currentDept` for center footer. `autoTable` option `showHead:'everyPage'` + `rowPageBreak:'avoid'` + `pageBreak:'auto'`.
- **Course header grouping:** Each course header is a row with `colSpan:5` and `fillColor:collegeTint`. Add `didParseCell` to style it. Mark those rows with a flag so `didDrawPage` knows not to split them from next row — use autoTable's `rowPageBreak:'avoid'` works if header+next section are in same logical group; if needed, build body as multiple small tables per course (fallback).
- **Cover/TOC page numbers:** Build TOC after knowing total pages — simplest: render cover+TOC blank, render body, then `doc.internal.getNumberOfPages()`, then go back and fill TOC numbers with `doc.setPage(2)` and overwrite text. Or collect `deptStartPage` map during rendering and draw TOC last before save via insertion (move TOC to page 2 via `doc.insertPage` trick). Ship simple: TOC shows page numbers as `“p. ~”` approx (college index order), not exact cross-ref — exact requires two-pass. Recommend two-pass.
- **Lazy load:** Same `await import('jspdf')` + `import('jspdf-autotable')` as before (`collegePdf.js:4`).
- **Pre-warm:** Keep `WelcomeModal.jsx:10` pre-warm import but update path to `generalSchedulePdf.js`.

**Dependencies:** No new deps. `jspdf@^4.0.0` + `jspdf-autotable@^5.0.7` already in `package.json:16-17`.

---

## 8) Verification plan

1. **Unit math test:** `sum(columnWidths) === AVAIL_W` assertion throws if drift.
2. **Ruler test:** Generate PDF, open in Acrobat/Preview at 100%, measure margins with ruler — no table extends beyond 12mm. Print one college (ENG) on B&W laser — check no clipping on right edge.
3. **Pagination test:** Generate full 1290-course PDF, flip through: every page has college header, every dept header is followed by at least one course block (no orphan), course header never at bottom alone.
4. **Ink test:** Print cover on draft mode — should be <5% coverage (white with border only). Previous cover was ~30% coverage.
5. **Perf:** 1290 courses × avg 2.2 sections = ~2,900 rows + 1,290 course headers = 4,200 `autoTable` rows. Benchmark on Moto G (low-end) — target < 2.5s generation, < 5 MB file. If slow, batch `autoTable` per dept (67 tables) not one mega-table (current does per dept already — keep that).
6. **Visual QA:** Check 320dpi print preview for font crispness, color tints visible but not glaring. Test grayscale print — tints map to distinct grays.
7. **Regression:** Existing `WelcomeModal` export button still calls new function; `CourseSelector` college filter unchanged.

---

## 9) Milestones (incremental, each keeps app working)

**Milestone 1 — Fix the bleed (0.5 day)**
- Create `generalSchedulePdf.js` with correct `M=12`, `columnStyles` exact fit, linebreak, no color. Ship behind feature flag, test print. *Files: new file, `collegePdf.js` temporarily kept.*

**Milestone 2 — College tints + print-friendly chrome (0.5 day)**
- Add `COLLEGE_TINTS` map, course header tints, dept rules, white cover with border, light head styles. Remove black solids. *Files: `generalSchedulePdf.js`.*

**Milestone 3 — Department pagination + repeating headers (1 day)**
- Per-dept `autoTable` loop, `ensureSpace` logic, `didDrawPage` for college header/footer, `rowPageBreak:'avoid'`. Strict vs. pack toggle. *Files: `generalSchedulePdf.js`.*

**Milestone 4 — TOC + footer polish + pre-warm fix (0.5 day)**
- Two-pass TOC with real page numbers, legend page, footer with college+dept breadcrumb, update `WelcomeModal.jsx:106` import path, delete old `collegePdf.js`, rename export to `exportGeneralSchedulePdf`. *Files: `generalSchedulePdf.js`, `WelcomeModal.jsx:10,106`, `App.jsx` if needed.*

Total ~2.5 days, each milestone committable.

---

## 10) Risks & decisions needed from you

- **Strict dept-per-page vs. pack-if-fits?** Recommend pack-if-fits default (saves ~20 pages). If you want the literal “each department on its own page” for max clarity, set flag — costs ~12 extra pages (small depts waste white).
- **Portrait vs. Landscape?** Recommend staying portrait (filing friendly). If you mostly view on screen not print, landscape gives more breathing room for Schedule column — we can ship `orientation:'l'` as user toggle later.
- **Cover style:** White minimal vs. keeper of current black hero? Recommend white minimal for ink — but can keep a thin black top bar (4mm) if you like the brand punch without full flood.
- **Exam column:** Split date/time onto two lines (saves width) vs. one line (needs wider Exam col). Recommend two lines.

---

**Next step:** Confirm choices (especially Q1 strict vs pack). I will then rewrite `app/src/utils/generalSchedulePdf.js` from scratch per this spec and wire `WelcomeModal.jsx:106` to the new exporter. No history rewrite, no force push.
