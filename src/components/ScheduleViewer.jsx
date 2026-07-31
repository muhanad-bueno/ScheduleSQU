import React, { useMemo, useState } from 'react';
import { Calendar, FileText, Files, ClipboardList, AlertTriangle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMinutesTo12h, parseTimeStringTo12h } from '../utils/timeUtils';
import { useLanguage } from './LanguageContext';

// Normalize instructor name display
const normalizeInstructor = (name) => {
  if (!name) return 'To Be Announced';
  const upperName = name.toUpperCase();
  // Check if it's a "To Be Announced" variant
  if (upperName.includes('TO BE') && upperName.includes('ANNOUNCE')) {
    return 'To Be Announced';
  }
  return name;
};

// Lazy load PDF libraries (~400KB) - only loaded when user exports
let pdfModules = null;
const loadPdfLibraries = async () => {
  if (!pdfModules) {
    const [jspdfModule, autotableModule] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    pdfModules = {
      jsPDF: jspdfModule.jsPDF,
      autoTable: autotableModule.autoTable
    };
  }
  return pdfModules;
};

// Theme-aware colors for schedule blocks
// Light mode: pastel backgrounds with dark text
// Dark mode: muted deep colors with light text
const COLORS = [
  { light: '#E0E7FF', dark: '#312E81', border: '#6366F1' }, // Indigo
  { light: '#D1FAE5', dark: '#064E3B', border: '#10B981' }, // Emerald
  { light: '#FEF3C7', dark: '#78350F', border: '#F59E0B' }, // Amber
  { light: '#FEE2E2', dark: '#7F1D1D', border: '#EF4444' }, // Red
  { light: '#F3E8FF', dark: '#581C87', border: '#A855F7' }, // Purple
  { light: '#FCE7F3', dark: '#831843', border: '#EC4899' }, // Pink
  { light: '#CFFAFE', dark: '#164E63', border: '#06B6D4' }, // Cyan
  { light: '#ECFCCB', dark: '#365314', border: '#84CC16' }, // Lime
];

// Helper to convert hex to RGB array for jsPDF
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [255, 255, 255];
};

// PDF Styling Constants
const PDF_STYLES = {
  MARGIN: 10,
  SECTION_GAP: 8,
  TITLE_SIZE: 11,
  BODY_SIZE: 8,
  SCHEDULE_FONT_SIZE: 7,
  COLORS: {
    header: [40, 40, 40],       // Dark gray header
    headerText: [255, 255, 255], // White header text
    altRow: [245, 245, 245],     // Light gray alternating rows
    warning: [255, 152, 0],      // Orange warning
    warningBg: [255, 243, 224],  // Light orange background
    warningBorder: [255, 152, 0], // Orange border
  }
};

// English day names for PDF export (jsPDF doesn't support Arabic fonts by default)
const PDF_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

// Helper: Add section title to PDF
const addSectionTitle = (doc, title, y) => {
  doc.setFontSize(PDF_STYLES.TITLE_SIZE);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(title, PDF_STYLES.MARGIN, y);
  return y + 6;
};

// Helper: Parse exam string into date and time parts
const parseExam = (examStr) => {
  if (!examStr || examStr === 'TBA') {
    return { date: 'TBA', time: 'TBA' };
  }
  // Format: "21/05/2026 THU 08:00:00 - 11:00:00"
  const dateMatch = examStr.match(/^(\d{2}\/\d{2}\/\d{4}\s+\w+)/);
  const timeMatch = examStr.match(/(\d{2}:\d{2}:\d{2})\s*-\s*(\d{2}:\d{2}:\d{2})/);
  
  const date = dateMatch ? dateMatch[1] : examStr;
  const time = timeMatch 
    ? `${parseTimeStringTo12h(timeMatch[1])} - ${parseTimeStringTo12h(timeMatch[2])}`
    : 'TBA';
  
  return { date, time };
};

// Helper: Format room with building prefix if needed
const formatRoomWithBuilding = (room, building) => {
  if (!room || room === 'DLR') return room || 'N/A';
  
  // Check if room already has a teaching block letter prefix
  const hasBlockPrefix = /^[A-Za-z]\d/.test(room);
  
  if (hasBlockPrefix || !building) {
    return room;
  }
  
  return `${building}/${room}`;
};

// Helper: Compute exam conflicts for a given schedule
const getExamConflicts = (scheduleData) => {
  if (!scheduleData) return [];
  
  const examsByDate = {};
  scheduleData.forEach(section => {
    const examFull = section.exam;
    if (examFull && examFull !== 'TBA') {
      const dateMatch = examFull.match(/^(\d{2}\/\d{2}\/\d{4}\s+\w+)/);
      const datePart = dateMatch ? dateMatch[1] : examFull;
      const timeMatch = examFull.match(/(\d{2}:\d{2}:\d{2})\s*-\s*(\d{2}:\d{2}:\d{2})/);
      const timePart = timeMatch 
        ? `${parseTimeStringTo12h(timeMatch[1])} - ${parseTimeStringTo12h(timeMatch[2])}`
        : '';

      if (!examsByDate[datePart]) {
        examsByDate[datePart] = [];
      }
      examsByDate[datePart].push({ code: section.code, time: timePart });
    }
  });

  const conflictDates = [];
  Object.entries(examsByDate).forEach(([date, exams]) => {
    if (exams.length >= 2) {
      conflictDates.push({ date, exams });
    }
  });

  return conflictDates;
};

// Generate schedule grid as a jsPDF table (replaces html2canvas)
// Note: Uses PDF_DAYS (English) instead of translated days since jsPDF doesn't support Arabic fonts
const generateScheduleGridTable = (doc, scheduleData, gridData, timeSlots, scheduleNumber, isDarkMode) => {
  const PAGE_WIDTH = 210;
  let y = PDF_STYLES.MARGIN;
  
  // Add schedule header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(`Schedule #${scheduleNumber}`, PDF_STYLES.MARGIN, y + 5);
  y += 10;
  
  // Build table headers (Time + English day names for PDF compatibility)
  const headers = [['Time', ...PDF_DAYS]];
  
  // Build table body - each row is a time slot
  const body = timeSlots.map(slot => {
    const timeCell = `${formatMinutesTo12h(slot.start)} - ${formatMinutesTo12h(slot.end)}`;
    const slotData = gridData[slot.key] || {};
    
    const dayCells = [0, 1, 2, 3, 4].map(dayIdx => {
      const classes = slotData[dayIdx] || [];
      if (classes.length === 0) return '';
      
      // Format each class in the cell
      return classes.map(cls => {
        const slotRoom = cls.room || cls.sectionRoom || '';
        const slotBuilding = cls.building || cls.sectionBuilding || '';
        const roomLabel = formatRoomWithBuilding(slotRoom, slotBuilding);
        return `${cls.code}/${cls.section}\n${normalizeInstructor(cls.instructor)}\n${roomLabel}`;
      }).join('\n---\n');
    });
    
    return [timeCell, ...dayCells];
  });

  // Create the table with colored cells
  pdfModules.autoTable(doc, {
    startY: y,
    head: headers,
    body: body,
    theme: 'grid',
    margin: { left: PDF_STYLES.MARGIN, right: PDF_STYLES.MARGIN },
    styles: {
      fontSize: PDF_STYLES.SCHEDULE_FONT_SIZE,
      cellPadding: 2,
      valign: 'top',
      lineWidth: 0.2,
      lineColor: [200, 200, 200],
    },
    headStyles: {
      fillColor: PDF_STYLES.COLORS.header,
      textColor: PDF_STYLES.COLORS.headerText,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 28, halign: 'center' }, // Time column
      1: { cellWidth: (PAGE_WIDTH - PDF_STYLES.MARGIN * 2 - 28) / 5 },
      2: { cellWidth: (PAGE_WIDTH - PDF_STYLES.MARGIN * 2 - 28) / 5 },
      3: { cellWidth: (PAGE_WIDTH - PDF_STYLES.MARGIN * 2 - 28) / 5 },
      4: { cellWidth: (PAGE_WIDTH - PDF_STYLES.MARGIN * 2 - 28) / 5 },
      5: { cellWidth: (PAGE_WIDTH - PDF_STYLES.MARGIN * 2 - 28) / 5 },
    },
    didParseCell: (data) => {
      // Apply background colors to cells with classes
      if (data.section === 'body' && data.column.index > 0) {
        const slotKey = timeSlots[data.row.index]?.key;
        const dayIdx = data.column.index - 1;
        const slotData = gridData[slotKey] || {};
        const classes = slotData[dayIdx];
        
        if (classes && classes.length > 0) {
          const colorIndex = classes[0].colorIndex % COLORS.length;
          const color = COLORS[colorIndex];
          // Always use light (pastel) variant for PDF - better for printing and aesthetics
          const bgColor = color.light;
          data.cell.styles.fillColor = hexToRgb(bgColor);
          data.cell.styles.textColor = [0, 0, 0]; // Always black text on pastel backgrounds
        }
      }
      
      // Style time column cells
      if (data.section === 'body' && data.column.index === 0) {
        data.cell.styles.fillColor = [250, 250, 250];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.valign = 'middle';
      }
    },
  });
  
  return doc.lastAutoTable?.finalY ?? y;
};

export default function ScheduleViewer({
  schedule,
  allSchedules,
  scheduleIndex,
  totalSchedules,
  onNext,
  onPrev,
  theme,
  t
}) {
  const { lang } = useLanguage();
  const [examsExpanded, setExamsExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const isDarkMode = theme === 'dark';
  const isRtl = lang === 'ar';

  // Add Course Details table using jspdf-autotable
  const addCourseDetailsTable = (doc, scheduleData, startY) => {
    if (!scheduleData || scheduleData.length === 0) return startY;
    
    let y = addSectionTitle(doc, 'COURSE DETAILS', startY);
    
    const tableBody = scheduleData.map(section => [
      section.code,
      section.name || '',
      section.section,
      normalizeInstructor(section.instructor),
      formatRoomWithBuilding(section.room, section.building)
    ]);
    
    pdfModules.autoTable(doc, {
      startY: y,
      head: [['Code', 'Course Name', 'Section', 'Instructor', 'Room']],
      body: tableBody,
      margin: { left: PDF_STYLES.MARGIN, right: PDF_STYLES.MARGIN },
      styles: {
        fontSize: PDF_STYLES.BODY_SIZE,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: PDF_STYLES.COLORS.header,
        textColor: PDF_STYLES.COLORS.headerText,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: PDF_STYLES.COLORS.altRow,
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 55 },
        2: { cellWidth: 15 },
        3: { cellWidth: 70, overflow: 'linebreak' },
        4: { cellWidth: 25 },
      },
    });
    
    return doc.lastAutoTable?.finalY ?? startY;
  };

  // Add exam conflict warning banner to PDF
  const addConflictWarning = (doc, conflicts, startY) => {
    if (!conflicts || conflicts.length === 0) return startY;
    
    const PAGE_WIDTH = 210;
    const boxWidth = PAGE_WIDTH - (PDF_STYLES.MARGIN * 2);
    const lineHeight = 5;
    const padding = 4;
    
    let y = startY;
    y = addSectionTitle(doc, 'EXAM CONFLICTS', y);
    
    conflicts.forEach((conflict) => {
      const headerHeight = lineHeight;
      const coursesHeight = conflict.exams.length * lineHeight;
      const boxHeight = padding * 2 + headerHeight + coursesHeight;
      
      doc.setFillColor(...PDF_STYLES.COLORS.warningBg);
      doc.rect(PDF_STYLES.MARGIN, y, boxWidth, boxHeight, 'F');
      
      doc.setFillColor(...PDF_STYLES.COLORS.warningBorder);
      doc.rect(PDF_STYLES.MARGIN, y, 3, boxHeight, 'F');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 95, 0);
      doc.text(`WARNING: Multiple exams on ${conflict.date}`, PDF_STYLES.MARGIN + 6, y + padding + 4);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 70, 0);
      let detailY = y + padding + headerHeight + 3;
      conflict.exams.forEach((exam) => {
        const timeStr = exam.time ? ` (${exam.time})` : '';
        doc.text(`  - ${exam.code}${timeStr}`, PDF_STYLES.MARGIN + 6, detailY);
        detailY += lineHeight;
      });
      
      y += boxHeight + 4;
    });
    
    return y;
  };

  // Add exam schedule table to PDF
  const addExamScheduleTable = (doc, scheduleData, startY) => {
    if (!scheduleData || scheduleData.length === 0) return startY;
    
    let y = addSectionTitle(doc, 'EXAM SCHEDULE', startY);
    
    const tableBody = scheduleData.map(section => {
      const { date, time } = parseExam(section.exam);
      return [section.code, section.name || '', date, time];
    });
    
    pdfModules.autoTable(doc, {
      startY: y,
      head: [['Code', 'Course Name', 'Date', 'Time']],
      body: tableBody,
      margin: { left: PDF_STYLES.MARGIN, right: PDF_STYLES.MARGIN },
      styles: {
        fontSize: PDF_STYLES.BODY_SIZE,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: PDF_STYLES.COLORS.header,
        textColor: PDF_STYLES.COLORS.headerText,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: PDF_STYLES.COLORS.altRow,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 60 },
        2: { cellWidth: 50 },
        3: { cellWidth: 50 },
      },
    });
    
    return doc.lastAutoTable?.finalY ?? startY;
  };

  // Export single schedule
  const handleExportSingle = async () => {
    setIsExporting(true);

    try {
      const { jsPDF } = await loadPdfLibraries();
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Generate schedule grid table
      let y = generateScheduleGridTable(doc, schedule, gridData, timeSlots, scheduleIndex + 1, isDarkMode);
      
      // Add Course Details table
      y = addCourseDetailsTable(doc, schedule, y + PDF_STYLES.SECTION_GAP);
      
      // Add Exam Conflict Warning (if any)
      const conflicts = getExamConflicts(schedule);
      if (conflicts.length > 0) {
        y = addConflictWarning(doc, conflicts, y + PDF_STYLES.SECTION_GAP);
      }
      
      // Add Exam Schedule table
      y = addExamScheduleTable(doc, schedule, y + PDF_STYLES.SECTION_GAP);
      
      doc.save(`Schedule_${scheduleIndex + 1}.pdf`);
    } catch (err) {
      console.error("Export failed", err);
    }
    
    setIsExporting(false);
  };

  // Export all schedules
  const handleExportAll = async () => {
    if (!allSchedules || allSchedules.length === 0) return;

    setIsExporting(true);
    setExportProgress(1);

    try {
      const { jsPDF } = await loadPdfLibraries();
      const doc = new jsPDF('p', 'mm', 'a4');

      for (let i = 0; i < allSchedules.length; i++) {
        const currentSchedule = allSchedules[i];
        setExportProgress(i + 1);
        
        // Build gridData for this schedule
        const scheduleGridData = buildGridData(currentSchedule);
        const scheduleTimeSlots = buildTimeSlots(currentSchedule);
        
        if (i > 0) doc.addPage();
        
        let y = generateScheduleGridTable(doc, currentSchedule, scheduleGridData, scheduleTimeSlots, i + 1, isDarkMode);
        
        y = addCourseDetailsTable(doc, currentSchedule, y + PDF_STYLES.SECTION_GAP);
        
        const conflicts = getExamConflicts(currentSchedule);
        if (conflicts.length > 0) {
          y = addConflictWarning(doc, conflicts, y + PDF_STYLES.SECTION_GAP);
        }
        
        y = addExamScheduleTable(doc, currentSchedule, y + PDF_STYLES.SECTION_GAP);
      }

      doc.save('All_Schedules.pdf');
    } catch (err) {
      console.error("Batch export failed", err);
    }

    setIsExporting(false);
    setExportProgress(0);
  };

  // Helper: Build gridData for a schedule
  const buildGridData = (scheduleData) => {
    if (!scheduleData) return {};
    
    const data = {};
    scheduleData.forEach((section, sectionIdx) => {
      const parsedSlots = section.parsedSlots || [];
      parsedSlots.forEach(slot => {
        const slotKey = `${slot.start}-${slot.end}`;
        const day = slot.day;
        
        if (!data[slotKey]) data[slotKey] = {};
        if (!data[slotKey][day]) data[slotKey][day] = [];
        
        data[slotKey][day].push({
          ...section,
          sectionRoom: section.room,
          sectionBuilding: section.building,
          ...slot,
          colorIndex: sectionIdx
        });
      });
    });
    return data;
  };

  // Helper: Build timeSlots for a schedule
  const buildTimeSlots = (scheduleData) => {
    if (!scheduleData) return [];
    
    const slots = new Set();
    scheduleData.forEach(section => {
      const parsedSlots = section.parsedSlots || [];
      parsedSlots.forEach(slot => {
        slots.add(`${slot.start}-${slot.end}`);
      });
    });
    
    const slotArray = Array.from(slots).map(slotStr => {
      const [start, end] = slotStr.split('-').map(Number);
      return { start, end, key: slotStr, duration: end - start };
    });
    
    slotArray.sort((a, b) => {
      if (a.start === b.start) return a.duration - b.duration;
      return a.start - b.start;
    });
    
    return slotArray;
  };

  // Calculate unique time slots from all classes
  const timeSlots = useMemo(() => buildTimeSlots(schedule), [schedule]);

  // Organize classes by day and time slot
  const gridData = useMemo(() => buildGridData(schedule), [schedule]);

  // Detect exam conflicts
  const examConflicts = useMemo(() => {
    if (!schedule) return { count: 0, dates: [] };

    const examsByDate = {};
    schedule.forEach(section => {
      const examFull = section.exam;
      if (examFull && examFull !== 'TBA') {
        const dateMatch = examFull.match(/^(\d{2}\/\d{2}\/\d{4}\s+\w+)/);
        const datePart = dateMatch ? dateMatch[1] : examFull;
        const timeMatch = examFull.match(/(\d{2}:\d{2}:\d{2}\s*-\s*\d{2}:\d{2}:\d{2})/);
        const timePart = timeMatch ? timeMatch[1] : '';

        if (!examsByDate[datePart]) examsByDate[datePart] = [];
        examsByDate[datePart].push({ code: section.code, time: timePart });
      }
    });

    const conflictDates = [];
    Object.entries(examsByDate).forEach(([date, exams]) => {
      if (exams.length >= 2) conflictDates.push({ date, exams });
    });

    return { count: conflictDates.length, dates: conflictDates };
  }, [schedule]);

  const days = t.days;

  if (!schedule) {
    return (
      <div className="schedule-viewer">
        <div className="schedule-empty">
          <span className="empty-icon">
            <Calendar size={48} />
          </span>
          <h3>{t.schedule}</h3>
          <p>{t.noSchedules}</p>
        </div>
      </div>
    );
  }

  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  // Get theme-aware color for a block
  // Get theme-appropriate color
  const getBlockColor = (colorIndex, isDark) => {
    const color = COLORS[colorIndex % COLORS.length];
    return {
      bg: isDark ? color.dark : color.light,
      border: color.border
    };
  };

  return (
    <div className="schedule-viewer">
      {/* Overlay for Exporting */}
      {isExporting && (
        <div className="export-overlay">
          <div className="export-spinner"></div>
          <h3>{t.exporting}</h3>
          {exportProgress > 0 && allSchedules && <p>{exportProgress} / {allSchedules.length}</p>}
        </div>
      )}

      {/* Header */}
      <div className="schedule-header">
        <h2>
          {t.schedule} {scheduleIndex + 1}
          <span className="text-dim"> {t.of} {totalSchedules}</span>
        </h2>
        <div className="schedule-controls">
          <div className="nav-controls">
            <button className="nav-btn" onClick={onPrev} disabled={scheduleIndex === 0}>
              <PrevIcon size={18} />
            </button>
            <span className="schedule-counter">{scheduleIndex + 1} / {totalSchedules}</span>
            <button className="nav-btn" onClick={onNext} disabled={scheduleIndex === totalSchedules - 1}>
              <NextIcon size={18} />
            </button>
          </div>

          <div className="export-actions">
            <button className="btn-secondary" onClick={handleExportSingle} title={t.exportSchedule} disabled={isExporting}>
              <FileText size={18} /> {t.exportSchedule}
            </button>
            <button className="btn-secondary" onClick={handleExportAll} title={t.exportAll} disabled={isExporting}>
              <Files size={18} /> {t.exportAll}
            </button>
          </div>
        </div>
      </div>

      {/* Grid Schedule */}
      <div className="schedule-calendar">
        <div className="schedule-grid">
          {/* Header Row */}
          <div className="grid-header time-header">{t.timeDay}</div>
          {days.map((day, idx) => (
            <div key={idx} className="grid-header">{day}</div>
          ))}

          {/* Time Slot Rows */}
          {timeSlots.map(slot => {
            const slotKey = slot.key;
            const slotData = gridData[slotKey] || {};

            return (
              <React.Fragment key={slotKey}>
                {/* Time Cell */}
                <div className="time-cell">
                  {formatMinutesTo12h(slot.start)} - {formatMinutesTo12h(slot.end)}
                </div>

                {/* Day Cells */}
                {[0, 1, 2, 3, 4].map(dayIdx => {
                  const classes = slotData[dayIdx] || [];

                  return (
                    <div key={dayIdx} className={`day-cell ${classes.length > 0 ? 'has-class' : ''}`}>
                      {classes.map((cls, clsIdx) => {
                        const blockColor = getBlockColor(cls.colorIndex, theme === 'dark');
                        const slotRoom = cls.room || cls.sectionRoom || '';
                        const slotBuilding = cls.building || cls.sectionBuilding || '';
                        const roomLabel = formatRoomWithBuilding(slotRoom, slotBuilding);

                        return (
                          <div
                            key={clsIdx}
                            className="class-block"
                            style={{
                              backgroundColor: blockColor.bg,
                              borderLeftColor: blockColor.border
                            }}
                            title={`${cls.code} - ${normalizeInstructor(cls.instructor)} | ${roomLabel}`}
                          >
                            <div className="block-code">{cls.code}/{cls.section}</div>
                            <div className="block-time">
                              {formatMinutesTo12h(cls.start)} - {formatMinutesTo12h(cls.end)}
                            </div>
                            <div className="block-room">
                              {roomLabel}
                            </div>
                            <div className="block-instructor">{normalizeInstructor(cls.instructor)}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Exam Footer - Dropdown */}
      <div className="schedule-footer">
        <div className="footer-toggle" onClick={() => setExamsExpanded(!examsExpanded)}>
          <div className="footer-group">
            <span className="footer-title">
              <ClipboardList size={18} />
              {t.examFooter}
            </span>
            {examConflicts.count > 0 && (
              <span className="conflict-pill">
                {t.conflict}
              </span>
            )}
          </div>
          <span>
            {examsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>

        {examsExpanded && (
          <div className="exam-details-container">
            {/* Conflict warnings */}
            {examConflicts.dates.length > 0 && (
              <div className="exam-conflicts-section">
                {examConflicts.dates.map((conflict, idx) => (
                  <div key={idx} className="exam-conflict-warning">
                    <div className="conflict-header">
                      <AlertTriangle size={18} />
                      {t.multipleExamsOn} {conflict.date}:
                    </div>
                    <div className="conflict-courses">
                      {conflict.exams.map((exam, examIdx) => (
                        <div key={examIdx} className="conflict-course-item">
                          {exam.code} → {exam.time}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="exam-divider"></div>
              </div>
            )}

            {/* All exams */}
            <div className="exam-list">
              {schedule.map((section, idx) => (
                <div
                  key={idx}
                  className="exam-item"
                  style={{ '--exam-color': COLORS[idx % COLORS.length].border }}
                >
                  <span className="exam-code">{section.code}</span>
                  <span className="exam-date">{section.exam || 'TBA'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
