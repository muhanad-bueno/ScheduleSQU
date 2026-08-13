import { useEffect, useMemo } from 'react';
import { X, ClipboardList, AlertTriangle, CalendarDays } from 'lucide-react';
import { useLanguage } from './LanguageContext';

const COLORS = [
  { border: '#6366F1' },
  { border: '#10B981' },
  { border: '#F59E0B' },
  { border: '#EF4444' },
  { border: '#A855F7' },
  { border: '#EC4899' },
  { border: '#06B6D4' },
  { border: '#84CC16' },
];

export default function ExamModal({ open, onClose, schedule, t }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const hasSchedule = Array.isArray(schedule) && schedule.length > 0;

  const examConflicts = useMemo(() => {
    if (!hasSchedule) return { count: 0, dates: [] };
    const examsByDate = {};
    schedule.forEach(section => {
      const examFull = section.exam;
      if (examFull && examFull !== 'TBA') {
        const dateMatch = examFull.match(/^(\d{2}\/\d{2}\/\d{4}\s+\w+)/);
        const datePart = dateMatch ? dateMatch[1] : examFull;
        if (!examsByDate[datePart]) examsByDate[datePart] = [];
        examsByDate[datePart].push({ code: section.code, time: examFull });
      }
    });
    const dates = Object.entries(examsByDate).filter(([, v]) => v.length >= 2).map(([date, exams]) => ({ date, exams }));
    return { count: dates.length, dates };
  }, [schedule, hasSchedule]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="preview-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={t.examFooter}>
      <div className="preview-modal preview-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <button className="preview-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="preview-header">
          <div className="preview-code-row">
            <span className="preview-code" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <ClipboardList size={16} /> {t.examFooter}
            </span>
            {examConflicts.count > 0 && <span className="category-pill" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>{t.conflict}</span>}
          </div>
          <div className="preview-name" style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            {hasSchedule ? `${schedule.length} courses in this schedule` : t.noSchedules}
          </div>
        </div>

        <div className="preview-sections" style={{ padding: '1rem' }}>
          {!hasSchedule ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <CalendarDays size={32} style={{ opacity: 0.5, margin: '0 auto 0.5rem' }} />
              <p>{t.noSchedules}</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.35rem' }}>Generate a schedule first to see exam dates.</p>
            </div>
          ) : (
            <>
              {examConflicts.dates.length > 0 && (
                <div className="exam-conflicts-section" style={{ marginBottom: '0.85rem' }}>
                  {examConflicts.dates.map((conflict, idx) => (
                    <div key={idx} className="exam-conflict-warning">
                      <div className="conflict-header">
                        <AlertTriangle size={16} />
                        {t.multipleExamsOn} {conflict.date}:
                      </div>
                      <div className="conflict-courses">
                        {conflict.exams.map((exam, i) => (
                          <div key={i} className="conflict-course-item">
                            {exam.code} → {exam.time}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="exam-list">
                {schedule.map((section, idx) => {
                  const displayName = isAr && section.nameAr ? section.nameAr : (section.nameEn || section.name || '');
                  return (
                    <div
                      key={idx}
                      className="exam-item"
                      style={{ '--exam-color': COLORS[idx % COLORS.length].border }}
                    >
                      <div className="exam-item-main">
                        <span className="exam-code">{section.code}</span>
                        <span className="exam-name">{displayName}</span>
                      </div>
                      <span className="exam-date">{section.exam || 'TBA'}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="preview-foot" dir={isAr ? 'rtl' : 'ltr'}>
          {isAr ? 'تواريخ الاختبارات من الجدول الرسمي.' : 'Exam dates are from the official timetable.'}
        </div>
      </div>
    </div>
  );
}
