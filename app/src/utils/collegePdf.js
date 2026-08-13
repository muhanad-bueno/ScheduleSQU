/* General Schedule PDF — Print-friendly, from scratch
   - A4 portrait, 12mm margins, exact column widths (no bleed)
   - College color tints (pastel wash, low ink)
   - Departments own pagination (no orphan headers, header repeats)
   - Cover white/minimal, TOC with real page numbers, footer on every page
*/

let pdfModules = null;
const loadPdf = async () => {
    if (pdfModules) return pdfModules;
    const [jspdfM, autoM] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    pdfModules = { jsPDF: jspdfM.jsPDF, autoTable: autoM.autoTable || autoM.default };
    return pdfModules;
};

const COLLEGE_ORDER = [
    'College of Agricultural and Marine Sciences',
    'College of Arts and Social Sciences',
    'College of Economics and Political Science',
    'College of Education',
    'College of Engineering',
    'College of Law',
    'College of Medicine and Health Sciences',
    'College of Nursing',
    'College of Science',
    'Center for Preparatory Studies',
];

/* College tint map — bg = very light wash (7% ink), accent = 3mm stripe, text = deep */
const COLLEGE_TINTS = {
    'College of Agricultural and Marine Sciences': { bg: [232, 245, 233], accent: [46, 125, 50], text: [27, 94, 32] },
    'College of Arts and Social Sciences':       { bg: [255, 243, 224], accent: [239, 108, 0], text: [230, 81, 0] },
    'College of Economics and Political Science':{ bg: [227, 242, 253], accent: [21, 101, 192], text: [13, 71, 161] },
    'College of Education':                       { bg: [243, 232, 255], accent: [107, 33, 168], text: [88, 28, 135] },
    'College of Engineering':                     { bg: [254, 226, 226], accent: [185, 28, 28], text: [127, 29, 29] },
    'College of Law':                            { bg: [254, 243, 199], accent: [180, 83, 9], text: [146, 64, 14] },
    'College of Medicine and Health Sciences':   { bg: [236, 253, 245], accent: [5, 122, 80], text: [6, 78, 59] },
    'College of Nursing':                        { bg: [252, 231, 243], accent: [190, 24, 93], text: [131, 24, 67] },
    'College of Science':                        { bg: [224, 231, 255], accent: [67, 56, 202], text: [49, 46, 129] },
    'Center for Preparatory Studies':            { bg: [245, 245, 245], accent: [82, 82, 82], text: [23, 23, 23] },
};
const DEFAULT_TINT = { bg: [239, 248, 252], accent: [100, 100, 100], text: [20, 20, 20] };
const getTint = (college) => COLLEGE_TINTS[college] || DEFAULT_TINT;

const shortCollege = (name) => {
    if (name === 'Center for Preparatory Studies') return 'CPS';
    return name.replace('College of ', '').replace(' and ', ' & ');
};

const formatTimeShort = (timeStr) => {
    if (!timeStr) return '—';
    return timeStr
        .split('|')
        .map((s) => s.trim())
        .map((s) => s.replace(/:00(?=-|:)/g, '').replace(/\s+/g, ' '))
        .join('  •  ');
};

const normalizeInstructor = (name) => {
    if (!name) return 'TBA';
    const u = name.toUpperCase();
    if (u.includes('TO BE') && u.includes('ANNOUNCE')) return 'TBA';
    if (u.trim() === 'TBA' || u.trim() === 'N/A') return 'TBA';
    return name;
};

const formatRoom = (room, building) => {
    if (!room) return '—';
    const r = room.trim();
    if (r.toLowerCase() === 'closed section' || r.toLowerCase() === 'closed') return 'Closed';
    if (r.toLowerCase() === 'online') return 'Online';
    if (r.toLowerCase() === 'dlr' || r.toLowerCase().includes('distance learning')) return 'Online';
    if (building && building !== room && building.toLowerCase() !== 'closed section' && !r.includes(building)) {
        // keep building suffix but short — e.g. "E100 — Engineering"
        // avoid duplicating if room already starts with building prefix
        if (/^[A-Za-z]\d/.test(r)) return r;
        return `${r} · ${building}`;
    }
    return r;
};

const formatExam = (exam) => {
    if (!exam || exam === 'TBA' || exam === 'N/A' || exam === '-') return '—';
    // "19/08/2026 WED 11:30:00 - 14:30:00" -> "19/08/2026 WED\n11:30 AM – 2:30 PM"
    const m = exam.match(/^(\d{2}\/\d{2}\/\d{4}\s*\w*)\s*(\d{2}):(\d{2}):\d+\s*-\s*(\d{2}):(\d{2}):\d+/);
    if (m) {
        const date = m[1].trim();
        const sh = parseInt(m[2], 10), sm = m[3], eh = parseInt(m[4], 10), em = m[5];
        const to12 = (h, mm) => {
            const am = h < 12;
            const hh = h % 12 || 12;
            return `${hh}:${mm} ${am ? 'AM' : 'PM'}`;
        };
        return `${date}\n${to12(sh, sm)} – ${to12(eh, em)}`;
    }
    // fallback — try to at least linebreak long strings
    if (exam.length > 28) return exam.replace(' - ', '\n');
    return exam;
};

// Page geometry — print-safe for cheap lasers (5mm unprintable zone)
const PAGE_W = 210;
const PAGE_H = 297;
const M = 12;
const AVAIL_W = PAGE_W - M * 2; // 186
const FOOTER_H = 8;
const HEADER_H = 18;

// Column widths — sum must === AVAIL_W or autoTable will clip
const COL_W = [12, 42, 54, 30, 48]; // Sec, Instructor, Schedule, Room, Exam = 186
if (COL_W.reduce((a, b) => a + b, 0) !== AVAIL_W) throw new Error('COL_W must sum to AVAIL_W');

export async function exportCollegeGeneralPdf(allCourses) {
    return exportGeneralSchedulePdf(allCourses);
}

export async function exportGeneralSchedulePdf(allCourses) {
    const { jsPDF, autoTable } = await loadPdf();

    // Group by college
    const byCollege = {};
    for (const c of allCourses) {
        const col = c.college || 'Other';
        if (!byCollege[col]) byCollege[col] = [];
        byCollege[col].push(c);
    }
    const colleges = Object.keys(byCollege).sort((a, b) => {
        const ia = COLLEGE_ORDER.indexOf(a), ib = COLLEGE_ORDER.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
    });
    for (const col of colleges) byCollege[col].sort((a, b) => a.code.localeCompare(b.code));

    const totalCourses = allCourses.length;
    const totalSections = allCourses.reduce((a, c) => a + c.sections.length, 0);

    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFont('helvetica', 'normal');

    // Keep state for didDrawPage hooks
    let currentCollege = null;
    let currentDept = null;
    const collegeStartPage = {};

    const drawCollegeHeader = (college) => {
        const tint = getTint(college);
        // White header area — accent stripe left, no flood fill
        // Clear header band first (white)
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, PAGE_W, HEADER_H, 'F');
        // Accent stripe
        doc.setFillColor(...tint.accent);
        doc.rect(0, 0, 3, HEADER_H, 'F');
        // Thin bottom rule
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.25);
        doc.line(0, HEADER_H, PAGE_W, HEADER_H);
        // College name
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.5);
        doc.setTextColor(...tint.text);
        doc.text(college, 7, 8);
        // Stats line
        const colCourses = byCollege[college] || [];
        const secs = colCourses.reduce((a, c) => a + c.sections.length, 0);
        const deptCount = new Set(colCourses.map((c) => c.department || 'General')).size;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(110, 110, 110);
        doc.text(`${colCourses.length} courses  •  ${secs} sections  •  ${deptCount} departments`, 7, 13.5);
        // Page-side short label (right, subtle)
        doc.setFontSize(6);
        doc.setTextColor(160, 160, 160);
        doc.text(shortCollege(college), PAGE_W - M, 8, { align: 'right' });
    };

    const drawFooter = (pageNo, totalPages) => {
        // Clear footer band
        doc.setFillColor(255, 255, 255);
        doc.rect(0, PAGE_H - FOOTER_H, PAGE_W, FOOTER_H, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(M, PAGE_H - FOOTER_H, PAGE_W - M, PAGE_H - FOOTER_H);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(140, 140, 140);
        const totalStr = totalPages ? ` / ${totalPages}` : '';
        doc.text(`ScheduleSQU  •  Fall 2026  •  Verify on SIS`, M, PAGE_H - 3.2);
        doc.text(`${pageNo}${totalStr}`, PAGE_W - M, PAGE_H - 3.2, { align: 'right' });
        if (currentCollege) {
            doc.setFontSize(5.5);
            doc.setTextColor(170, 170, 170);
            const centerLabel = currentDept ? `${shortCollege(currentCollege)} — ${currentDept.slice(0, 36)}` : shortCollege(currentCollege);
            doc.text(centerLabel, PAGE_W / 2, PAGE_H - 3.2, { align: 'center' });
        }
    };

    const drawCover = () => {
        // Outer thin border — print friendly, not a flood
        doc.setDrawColor(203, 230, 240);
        doc.setLineWidth(0.35);
        doc.rect(8, 8, PAGE_W - 16, PAGE_H - 16);
        // Tiny accent top rule
        doc.setFillColor(46, 125, 50);
        doc.rect(8, 8, PAGE_W - 16, 1.2, 'F');
        // Centered lockup — avoid full-bleed black (old covered 52mm black flood)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(20, 20, 20);
        doc.text('ScheduleSQU', PAGE_W / 2, 58, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(110, 110, 110);
        doc.text('Sultan Qaboos University', PAGE_W / 2, 66, { align: 'center' });
        // Accent line under title
        doc.setDrawColor(46, 125, 50);
        doc.setLineWidth(0.4);
        doc.line(PAGE_W / 2 - 18, 70, PAGE_W / 2 + 18, 70);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        doc.text('General Timetable  •  Fall 2026', PAGE_W / 2, 78, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(`Official timetables as of August 14, 2026  •  Generated on device  •  No upload`, PAGE_W / 2, 86, { align: 'center' });
        // Stats pill — light, not dark
        const statsY = 104;
        doc.setFillColor(239, 248, 252);
        doc.setDrawColor(203, 230, 240);
        doc.setLineWidth(0.25);
        const pillW = 110, pillH = 10;
        doc.roundedRect(PAGE_W / 2 - pillW / 2, statsY, pillW, pillH, 1.2, 1.2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(40, 40, 40);
        doc.text(`${colleges.length} colleges  •  ${totalCourses} courses  •  ${totalSections} sections`, PAGE_W / 2, statsY + 6.5, { align: 'center' });
        // Brief how-to
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 100, 100);
        const howto = 'Each course lists its sections: instructor, schedule, room and exam. Use the contents to jump to a college.';
        // wrap manually to 2 lines if needed — jsPDF text handles, but keep centered
        const split = doc.splitTextToSize(howto, 130);
        doc.text(split, PAGE_W / 2, 128, { align: 'center' });
        // Legend mini
        let ly = 148;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(20, 20, 20);
        doc.text('How to read', M + 4, ly);
        ly += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.3);
        doc.setTextColor(90, 90, 90);
        const legend = [
            ['Sec', 'Section number (01, 02 …)'],
            ['Instructor', 'TBA = To Be Announced (italic, gray)'],
            ['Schedule', 'Days + times, “•” separates slots'],
            ['Room', 'Building shown after “·” when known; Closed = gray italic'],
            ['Exam', 'Date + 12-hour time (two lines to save width)'],
        ];
        for (const [k, v] of legend) {
            doc.setFont('helvetica', 'bold');
            doc.text(`${k}:`, M + 8, ly);
            doc.setFont('helvetica', 'normal');
            doc.text(v, M + 28, ly);
            ly += 4.2;
        }
        // Bottom note
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        doc.text('Tip: Print at 100% (not “Fit to page”) on A4 for exact margins.', PAGE_W / 2, PAGE_H - 14, { align: 'center' });
    };

    // === PAGE 1 — COVER ===
    drawCover();
    drawFooter(1, null);

    // === PAGE 2 — CONTENTS (drawn in two passes: header now, table after body so page numbers are real) ===
    doc.addPage();
    const tocPageNo = doc.internal.getNumberOfPages(); // should be 2
    // TOC header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    doc.text('Contents', M, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(110, 110, 110);
    doc.text('Each college starts on a new page. Departments are grouped with clear headers — never orphaned.', M, 21);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.25);
    doc.line(M, 24, PAGE_W - M, 24);
    const tocTableY = 28;
    // Placeholder — real table drawn after body so we know start pages
    // Keep page 2 otherwise empty for now; we'll fill below after body
    drawFooter(tocPageNo, null);

    // === BODY — one college per page start, departments own pagination ===
    // We need a didDrawPage that re-draws college header + footer on overflow pages created by autoTable
    const makeDidDrawPage = () => (data) => {
        const pageNo = data.pageNumber || doc.internal.getNumberOfPages();
        // data is autoTable's hook data; we already draw header/footer for every new page autoTable creates
        // Only for body pages (3+)
        if (pageNo >= 3 && currentCollege) {
            drawCollegeHeader(currentCollege);
            // footer with provisional total (will be corrected in final pass)
            const provisionalTotal = doc.internal.getNumberOfPages();
            drawFooter(pageNo, provisionalTotal);
        }
    };

    for (const college of colleges) {
        doc.addPage();
        currentCollege = college;
        currentDept = null;
        const startPage = doc.internal.getNumberOfPages();
        collegeStartPage[college] = startPage;
        drawCollegeHeader(college);
        drawFooter(startPage, doc.internal.getNumberOfPages());

        const colCourses = byCollege[college];
        const byDept = {};
        for (const course of colCourses) {
            const key = (course.department || 'General').trim() || 'General';
            if (!byDept[key]) byDept[key] = [];
            byDept[key].push(course);
        }
        const depts = Object.keys(byDept).sort((a, b) => a.localeCompare(b));

        let y = HEADER_H + 6; // below college header

        for (const dept of depts) {
            currentDept = dept;
            const deptCourses = byDept[dept];

            // Department pagination rule — if less than ~42mm remains, start fresh page
            // 42mm ≈ dept header (7) + 1 course header (6) + 2 section rows (14) + footer gap
            if (y > PAGE_H - FOOTER_H - 42) {
                doc.addPage();
                drawCollegeHeader(college);
                const pg = doc.internal.getNumberOfPages();
                collegeStartPage[college] = Math.min(collegeStartPage[college], pg);
                drawFooter(pg, doc.internal.getNumberOfPages());
                y = HEADER_H + 6;
            }

            // Dept header — clear band, accent rule, count on right
            const tint = getTint(college);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(30, 30, 30);
            doc.text(dept, M, y);
            // Right-aligned course count
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.setTextColor(120, 120, 120);
            doc.text(`${deptCourses.length} course${deptCourses.length === 1 ? '' : 's'}`, PAGE_W - M, y, { align: 'right' });
            // Accent rule underneath
            doc.setDrawColor(...tint.accent);
            doc.setLineWidth(0.45);
            doc.line(M, y + 1.4, PAGE_W - M, y + 1.4);
            // Subtle gray secondary line for print hierarchy
            doc.setDrawColor(230, 230, 230);
            doc.setLineWidth(0.12);
            // not needed — keep single accent

            y += 5;

            // Build body for this dept — one autoTable per dept so dept never mixes with next
            const body = [];
            for (const course of deptCourses) {
                const headerText = `${course.code}  —  ${course.name}${course.category ? `   [${course.category}]` : ''}`;
                body.push([
                    {
                        content: headerText,
                        colSpan: 5,
                        styles: {
                            fillColor: [...tint.bg],
                            textColor: [20, 20, 20],
                            fontStyle: 'bold',
                            fontSize: 6.7,
                            halign: 'left',
                            cellPadding: { top: 1.6, bottom: 1.6, left: 2, right: 2 },
                            lineColor: [220, 220, 220],
                            lineWidth: 0.1,
                        },
                    },
                ]);
                for (const sec of course.sections) {
                    const schedule = formatTimeShort(sec.time) || '—';
                    const room = formatRoom(sec.room, sec.building);
                    const instructorRaw = normalizeInstructor(sec.instructor);
                    const exam = formatExam(sec.exam);
                    body.push([sec.section, instructorRaw, schedule, room, exam]);
                }
            }

            autoTable(doc, {
                startY: y,
                head: [['Sec', 'Instructor', 'Schedule', 'Room', 'Exam']],
                body,
                theme: 'grid',
                margin: { left: M, right: M },
                tableWidth: AVAIL_W,
                styles: {
                    fontSize: 6.4,
                    cellPadding: 1.4,
                    lineColor: [218, 218, 218],
                    lineWidth: 0.12,
                    valign: 'middle',
                    overflow: 'linebreak',
                    minCellHeight: 5,
                },
                headStyles: {
                    fillColor: [245, 245, 245],
                    textColor: [60, 60, 60],
                    fontStyle: 'bold',
                    halign: 'center',
                    valign: 'middle',
                    fontSize: 5.8,
                    cellPadding: 1.2,
                    lineColor: [218, 218, 218],
                    lineWidth: 0.12,
                },
                columnStyles: {
                    0: { cellWidth: COL_W[0], halign: 'center', fontStyle: 'bold', valign: 'middle' },
                    1: { cellWidth: COL_W[1], valign: 'middle' },
                    2: { cellWidth: COL_W[2], valign: 'middle' },
                    3: { cellWidth: COL_W[3], valign: 'middle' },
                    4: { cellWidth: COL_W[4], valign: 'middle' },
                },
                alternateRowStyles: { fillColor: [250, 250, 250] },
                showHead: 'everyPage',
                rowPageBreak: 'avoid',
                didDrawPage: makeDidDrawPage(),
                didParseCell: (data) => {
                    // Course header rows — don't let alternateRowStyles override tint
                    if (data.row.raw && data.row.raw.length === 1 && data.row.raw[0].colSpan === 5) return;
                    // TBA styling
                    if (data.column.index === 1 && data.cell.raw === 'TBA') {
                        data.cell.styles.textColor = [140, 140, 140];
                        data.cell.styles.fontStyle = 'italic';
                        data.cell.styles.fontSize = 6.2;
                    }
                    if (data.column.index === 3 && (data.cell.raw === 'Closed' || data.cell.raw === '—')) {
                        data.cell.styles.textColor = [150, 150, 150];
                        data.cell.styles.fontStyle = 'italic';
                    }
                },
                willDrawCell: (data) => {
                    // Ensure course headers keep tint even when alternateRowStyles would apply
                    if (data.row.raw && data.row.raw.length === 1 && data.row.raw[0].colSpan === 5) {
                        data.cell.styles.fillColor = [...tint.bg];
                    }
                },
            });

            y = doc.lastAutoTable.finalY + 7;
            // Small inter-dept gap — if we have room, keep dept headers from crowding footer
            if (y > PAGE_H - FOOTER_H - 12) {
                doc.addPage();
                drawCollegeHeader(college);
                drawFooter(doc.internal.getNumberOfPages(), doc.internal.getNumberOfPages());
                y = HEADER_H + 6;
            } else {
                y += 1;
            }
        }
    }

    // === FILL TOC (page 2) now that we know real start pages ===
    const totalPages = doc.internal.getNumberOfPages();
    doc.setPage(tocPageNo);
    // Clear any provisional footer — will be redrawn in final pass, but ensure TOC page has clean bg
    // Draw TOC table
    const tocBody = colleges.map((col, idx) => {
        const count = byCollege[col].length;
        const secs = byCollege[col].reduce((a, c) => a + c.sections.length, 0);
        const pg = collegeStartPage[col];
        return [`${idx + 1}`, shortCollege(col), `${count}`, `${secs}`, `p. ${pg}`];
    });

    autoTable(doc, {
        startY: tocTableY,
        head: [['#', 'College', 'Courses', 'Sections', 'Page']],
        body: tocBody,
        theme: 'grid',
        margin: { left: M, right: M },
        tableWidth: AVAIL_W,
        styles: { fontSize: 7, cellPadding: 2, lineColor: [220, 220, 220], lineWidth: 0.14, valign: 'middle', overflow: 'linebreak' },
        headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 6.8 },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 92 },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 22, halign: 'center' },
            4: { cellWidth: 42, halign: 'center', fontStyle: 'bold', textColor: [60, 60, 60] },
        },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) {
                // Add subtle tint dot for college identity — we simulate with text color
                const college = colleges[data.row.index];
                const tint = getTint(college);
                data.cell.styles.textColor = [...tint.text];
                data.cell.styles.fontStyle = 'bold';
            }
        },
    });

    // Legend under TOC
    let afterTocY = doc.lastAutoTable.finalY + 6;
    if (afterTocY < PAGE_H - FOOTER_H - 18) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(130, 130, 130);
        doc.text('Print tip: Use 100% scale on A4 (not “Fit to page”) so margins land at 12 mm. Colors are light pastels — B&W safe.', M, afterTocY);
    }

    // === FINAL PASS — correct footers with real total on every page ===
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        // Need currentCollege/currentDept for center label — infer from page
        // For cover (1) and TOC (2) keep no center label
        if (i === 1 || i === tocPageNo) {
            currentCollege = null;
            currentDept = null;
        } else {
            // Find which college this page belongs to (nearest startPage <= i)
            let best = null, bestPg = -1;
            for (const col of colleges) {
                const pg = collegeStartPage[col];
                if (pg <= i && pg > bestPg) { best = col; bestPg = pg; }
            }
            currentCollege = best;
            currentDept = null; // we don't track per-page dept in footer center to keep simple; show college only
        }
        drawFooter(i, totalPages);
        // Re-draw college header on body pages if we overwrote it with footer clear rect — header is at top, safe
        if (i >= 3 && currentCollege) {
            // Ensure header is still there (footer pass may have uncovered? header at top not affected)
            // No-op — header persists
        }
        // Re-draw cover header accent if we are on page 1? Footer pass already kept it
    }
    // Ensure cover's border and accent not overwritten by footer pass — redraw cover's outer border accent top is outside footer band, safe

    doc.save('ScheduleSQU_Fall2026_General_College-by-College.pdf');
}
