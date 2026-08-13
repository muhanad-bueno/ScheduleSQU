import { useEffect } from 'react';
import { X, Clock3, MapPin, GraduationCap, CalendarDays, UserRound } from 'lucide-react';
import { getSectionScheduleSummary } from '../utils/timeUtils';
import { useLanguage } from './LanguageContext';

export default function CoursePreviewModal({ course, open, onClose }) {
    const { lang, t } = useLanguage();
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

    if (!open || !course) return null;
    const displayName = lang === 'ar' && course?.nameAr ? course.nameAr : (course?.nameEn || course?.name || course?.code || '');
    const displayCollege = lang === 'ar' && course?.collegeAr ? course.collegeAr : (course?.collegeEn || course?.college || '');

    return (
        <div className="preview-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={`${course.code} preview`}>
            <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
                <div className="sheet-handle" aria-hidden="true" />
                <button className="preview-close" onClick={onClose} aria-label="Close">
                    <X size={18} />
                </button>

                <div className="preview-header">
                    <div className="preview-code-row">
                        <span className="preview-code">{course.code}</span>
                        {course.category && <span className={`category-pill cat-${course.category.toLowerCase()}`}>{course.category}</span>}
                    </div>
                    <div className="preview-name">{displayName}</div>
                    {(displayCollege || course.department) && (
                        <div className="preview-college">
                            {displayCollege}
                            {course.department && ` • ${lang === 'ar' && course.departmentAr ? course.departmentAr : course.department}`}
                        </div>
                    )}
                    <div className="preview-meta">
                        <span className="preview-meta-item">
                            <GraduationCap size={13} /> {course.sections.length} {course.sections.length === 1 ? 'section' : 'sections'}
                        </span>
                    </div>
                </div>

                <div className="preview-sections">
                    {course.sections.map((sec) => {
                        const timeSummary = getSectionScheduleSummary(sec);
                        const displayInstructor = lang === 'ar' && sec.instructorAr ? sec.instructorAr : sec.instructor;
                        return (
                            <div key={sec.section} className="preview-section-card">
                                <div className="preview-section-head">
                                    <span className="preview-section-num">Section {sec.section}</span>
                                    <span className="preview-section-exam">
                                        <CalendarDays size={12} /> {sec.exam || 'No exam'}
                                    </span>
                                </div>
                                <div className="preview-section-instructor">
                                    <UserRound size={13} /> {displayInstructor || 'To Be Announced'}
                                </div>
                                <div className="preview-section-time">
                                    <Clock3 size={13} /> <span>{timeSummary || 'Time TBA'}</span>
                                </div>
                                {(sec.slots?.length > 0 || sec.room) && (
                                    <div className="preview-section-room">
                                        <MapPin size={13} />
                                        <span>
                                            {sec.slots?.length > 0
                                                ? sec.slots.map((s) => `${s.room || sec.room} ${s.building ? `· ${s.building}` : ''} · ${s.time}`).join('  •  ')
                                                : `${sec.room || ''} ${sec.building ? `· ${sec.building}` : ''}`.trim()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="preview-foot">
                    {t.previewFoot}
                </div>
            </div>
        </div>
    );
}
