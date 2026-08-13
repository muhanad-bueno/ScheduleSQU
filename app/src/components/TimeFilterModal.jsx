import { useEffect, Fragment } from 'react';
import { X, Clock, RotateCcw } from 'lucide-react';
import { useLanguage } from './LanguageContext';

export default function TimeFilterModal({ open, onClose, blockedSlots = [], onToggleSlot, onToggleDay, onReset, t }) {
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

  const days = t?.days || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const isBlocked = (day, hour) => blockedSlots.includes(`${day}-${hour}`);
  const blockedCount = blockedSlots.length;

  return (
    <div className="preview-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={t.filterTitle}>
      <div className="preview-modal preview-modal--wide time-filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <button className="preview-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="preview-header">
          <div className="preview-code-row">
            <span className="preview-code" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={16} /> {t.filterTitle}
            </span>
            {blockedCount > 0 && <span className="category-pill" style={{ background: 'var(--accent-tint)', color: 'var(--accent-strong)', border: '1px solid var(--accent-soft)' }}>{blockedCount} blocked</span>}
          </div>
          <div className="preview-name" style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>{t.filterHint}</div>
        </div>

        <div className="preview-sections time-filter-body">
          <div className="time-grid">
            <div className="grid-corner"></div>
            {days.map((day, idx) => (
              <div
                key={idx}
                className="grid-header clickable"
                onClick={() => onToggleDay(idx)}
                title={`Block/unblock all ${day}`}
              >
                {day}
              </div>
            ))}
            {hours.map(hour => (
              <Fragment key={hour}>
                <div className="grid-time-label">
                  {hour % 12 || 12} {hour < 12 ? 'AM' : 'PM'}
                </div>
                {days.map((_, dayIdx) => (
                  <div
                    key={`${dayIdx}-${hour}`}
                    className={`grid-cell ${isBlocked(dayIdx, hour) ? 'blocked' : ''}`}
                    onClick={() => onToggleSlot(dayIdx, hour)}
                    role="button"
                    aria-pressed={isBlocked(dayIdx, hour)}
                    aria-label={`${days[dayIdx]} ${hour}:00 ${isBlocked(dayIdx, hour) ? 'blocked' : 'available'}`}
                  >
                    {isBlocked(dayIdx, hour) && <X size={14} />}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
          <div className="time-filter-actions">
            <button className="clear-all-btn time-filter-reset" onClick={onReset} disabled={blockedCount === 0}>
              <RotateCcw size={14} /> {t.resetFilters}
            </button>
          </div>
        </div>

        <div className="preview-foot time-filter-foot" dir={t.filterFootEmpty ? (t.filterFootEmpty.includes('اضغط') ? 'rtl' : 'ltr') : undefined}>
          {blockedCount === 0 ? t.filterFootEmpty : t.filterFootBlocked.replace('{count}', blockedCount)}
        </div>
      </div>
    </div>
  );
}
