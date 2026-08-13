import { useEffect, useState } from 'react';
import { X, Search, Sparkles, Mail, Info, Eye, FileText, Download, Loader2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export default function WelcomeModal({ open, onClose, allCourses = [] }) {
    const { lang, t } = useLanguage();
    const [exporting, setExporting] = useState(false);

    // Pre-warm general PDF chunk so first tap feels instant on mobile
    useEffect(() => {
        if (!open || allCourses.length === 0) return;
        const id = setTimeout(() => { import('../utils/collegePdf.js').catch(() => {}); }, 600);
        return () => clearTimeout(id);
    }, [open, allCourses.length]);

    // Lock scroll + Esc handling
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e) => { if (e.key === 'Escape') onClose(false); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
    }, [open, onClose]);

    if (!open) return null;

    const isAr = lang === 'ar';

    return (
        <div className="welcome-overlay" onClick={() => onClose(false)} role="dialog" aria-modal="true" aria-label={t.welcomeTitle}>
            <div
                className="welcome-modal"
                onClick={(e) => e.stopPropagation()}
                dir={isAr ? 'rtl' : 'ltr'}
            >
                <button className="welcome-close" onClick={() => onClose(false)} aria-label="Close">
                    <X size={18} />
                </button>

                {/* Header — subtitle now the hero, 2 lines, big like the removed title */}
                <div className="welcome-top">
                    <h2 className="welcome-title">
                        {t.welcomeSubtitle.split(' ~ ').map((line, i) => (
                            <span key={i} className={i === 0 ? 'welcome-title-line' : 'welcome-title-line welcome-title-line--sub'}>
                                {line}
                            </span>
                        ))}
                    </h2>
                </div>

                {/* Steps — 2 cards, breathing room */}
                <div className="welcome-steps welcome-steps--two">
                    <div className="welcome-step">
                        <div className="welcome-step-icon">
                            <Search size={20} />
                        </div>
                        <div className="welcome-step-body">
                            <div className="welcome-step-num">01</div>
                            <div className="welcome-step-title">{t.welcomeStep1Title}</div>
                            <div className="welcome-step-desc">{t.welcomeStep1Desc}</div>
                        </div>
                    </div>
                    <div className="welcome-step">
                        <div className="welcome-step-icon">
                            <Sparkles size={20} />
                        </div>
                        <div className="welcome-step-body">
                            <div className="welcome-step-num">02</div>
                            <div className="welcome-step-title">{t.welcomeStep2Title}</div>
                            <div className="welcome-step-desc">{t.welcomeStep2Desc}</div>
                        </div>
                    </div>
                </div>

                {/* Tip — long-press hint */}
                <div className="welcome-tip">
                    <div className="welcome-tip-icon">
                        <Eye size={14} />
                    </div>
                    <span>{t.welcomeTip}</span>
                </div>

                {/* Export — college-by-college PDF, generated on device */}
                <div className="welcome-export">
                    <div className="welcome-export-icon">
                        <FileText size={18} />
                    </div>
                    <div className="welcome-export-body">
                        <div className="welcome-export-title">{t.welcomeExportTitle}</div>
                        <div className="welcome-export-desc">{t.welcomeExportDesc}</div>
                    </div>
                    <button
                        className="welcome-export-btn"
                        disabled={exporting || allCourses.length === 0}
                        onMouseEnter={() => { import('../utils/collegePdf.js').catch(() => {}); }}
                        onTouchStart={() => { import('../utils/collegePdf.js').catch(() => {}); }}
                        onClick={async () => {
                            if (exporting) return;
                            setExporting(true);
                            try {
                                const { exportCollegeGeneralPdf } = await import('../utils/collegePdf.js');
                                await exportCollegeGeneralPdf(allCourses);
                            } catch (e) {
                                console.error('General PDF export failed', e);
                            } finally {
                                setExporting(false);
                            }
                        }}
                    >
                        {exporting ? (
                            <>
                                <Loader2 size={14} className="spin" /> {t.welcomeExporting}
                            </>
                        ) : (
                            <>
                                <Download size={14} /> {t.welcomeExportBtn}
                            </>
                        )}
                    </button>
                </div>

                {/* Contact */}
                <div className="welcome-contact">
                    <div className="welcome-contact-icon">
                        <Mail size={14} />
                    </div>
                    <div className="welcome-contact-text">
                        <span>{t.welcomeContact}</span>
                        <a href="mailto:s139955@student.squ.edu.om" className="welcome-email">s139955@student.squ.edu.om</a>
                        {t.welcomeContactSuffix && <span>{t.welcomeContactSuffix}</span>}
                    </div>
                </div>

                {/* Actions */}
                <div className="welcome-actions">
                    <button className="welcome-cta" onClick={() => onClose(false)}>
                        {t.welcomeCta}
                    </button>
                    <button className="welcome-dismiss" onClick={() => onClose(true)}>
                        {t.welcomeDontShow}
                    </button>
                </div>

                <div className="welcome-foot">
                    <Info size={12} />
                    <span>{isAr ? 'سنحدّث الجداول فور صدور أي تحديث في نظام SIS.' : 'We will update these schedules as soon as any changes appear on SIS.'}</span>
                </div>
            </div>
        </div>
    );
}
