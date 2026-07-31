import { useState, Fragment, memo } from 'react';
import { Clock, ChevronDown, ChevronUp, X } from 'lucide-react';

export default memo(function FilterPanel({ blockedSlots, onToggleSlot, onToggleDay, onReset, t }) {
  const [expanded, setExpanded] = useState(false);
  const days = t?.days || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

  const isBlocked = (day, hour) => blockedSlots.includes(`${day}-${hour}`);

  return (
    <div className="filter-panel">
      <button className="filter-toggle" onClick={() => setExpanded(!expanded)}>
        <span className="filter-toggle-text">
          <Clock size={18} />
          <span>{t.filterTitle}</span>
        </span>
        <span>{expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</span>
      </button>

      {expanded && (
        <div className="filter-content">
          <div className="filter-header">
            <span className="filter-hint">{t.filterHint}</span>
            <button className="reset-btn" onClick={onReset}>
              {t.resetFilters}
            </button>
          </div>

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
                  >
                    {isBlocked(dayIdx, hour) && <X size={14} />}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
})
