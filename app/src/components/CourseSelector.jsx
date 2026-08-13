import { useState, useMemo, useEffect, useRef, memo, useCallback, useDeferredValue, useTransition } from 'react';
import { Check, Plus, X, Eye } from 'lucide-react';
import { getSectionScheduleSummary } from '../utils/timeUtils';
import { useLanguage } from './LanguageContext';
import CoursePreviewModal from './CoursePreviewModal';

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

export default memo(function CourseSelector({
  courses,
  selectedCourses,
  onToggleCourse,
  sectionFilters,
  onToggleSection,
  onClearAll,
  blockedSlots,
  t
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [collegeFilter, setCollegeFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const { lang } = useLanguage();

  // Debounce + defer search for non-blocking filtering (novel: keeps input 60fps on 1290 courses)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 140);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const deferredSearch = useDeferredValue(debouncedSearch);
  const [isPending] = useTransition();

  // Auto-switch to 'all' tab when user types
  useEffect(() => {
    if (searchTerm.trim() && activeTab === 'selected') {
      setActiveTab('all');
    }
  }, [searchTerm]);

  const colleges = useMemo(() => {
    const set = new Set(courses.filter(Boolean).map(c => c.college).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [courses]);

  // Map English college -> Arabic for display
  const collegeArMap = useMemo(() => {
    const m = {};
    for (const c of courses.filter(Boolean)) {
      if (c.college && c.collegeAr && !m[c.college]) m[c.college] = c.collegeAr;
    }
    return m;
  }, [courses]);

  const displayCollege = (enName) => {
    if (enName === 'All') return lang === 'ar' ? 'كل الكليات' : 'All Colleges';
    if (lang === 'ar' && collegeArMap[enName]) return collegeArMap[enName];
    return enName;
  };

  // Departments for selected college
  const departments = useMemo(() => {
    if (collegeFilter === 'All') return ['All'];
    const set = new Set(
      courses.filter(Boolean).filter(c => c.college === collegeFilter).map(c => c.department).filter(Boolean)
    );
    return ['All', ...Array.from(set).sort()];
  }, [courses, collegeFilter]);

  const departmentArMap = useMemo(() => {
    const m = {};
    for (const c of courses.filter(Boolean)) {
      if (c.department && c.departmentAr && !m[c.department]) m[c.department] = c.departmentAr;
    }
    return m;
  }, [courses]);

  const displayDepartment = (enName) => {
    if (enName === 'All') return lang === 'ar' ? 'كل الأقسام' : 'All Departments';
    if (lang === 'ar' && departmentArMap[enName]) return departmentArMap[enName];
    return enName;
  };

  useEffect(() => {
    setDepartmentFilter('All');
  }, [collegeFilter]);

  const sortedCourses = useMemo(() => {
    return courses.filter(Boolean).slice().sort((a, b) => a.code.localeCompare(b.code));
  }, [courses]);

  const filteredCourses = useMemo(() => {
    let base = sortedCourses;
    if (collegeFilter !== 'All') base = base.filter(c => c && c.college === collegeFilter);
    if (departmentFilter !== 'All') base = base.filter(c => c && c.department === departmentFilter);
    if (!deferredSearch.trim()) return base;
    const terms = deferredSearch.toLowerCase().split(/\s+/).filter(Boolean);
    return base.filter(c => {
      if (!c) return false;
      const code = (c.code || '').toLowerCase();
      const nameEn = (c.name || '').toLowerCase();
      const nameAr = (c.nameAr || '').toLowerCase();
      return terms.every(term => code.includes(term) || nameEn.includes(term) || nameAr.includes(term));
    });
  }, [sortedCourses, deferredSearch, collegeFilter, departmentFilter]);

  const isSelected = useCallback((id) => selectedCourses.some(c => c.id === id), [selectedCourses]);
  const [previewCourse, setPreviewCourse] = useState(null);
  const inputRef = useRef(null);
  const keepFocus = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, []);
  const handleToggleKeepFocus = useCallback((course) => {
    onToggleCourse(course);
    keepFocus();
  }, [onToggleCourse, keepFocus]);

  const closePreview = useCallback(() => setPreviewCourse(null), []);

  return (
    <div className="course-selector">
      <div className="selector-header">
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder={t.searchPlaceholder}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
        />
      </div>

      <div className="selector-tabs">
        <button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          {t.tabs.all}
        </button>
        <button
          className={`tab ${activeTab === 'selected' ? 'active' : ''}`}
          onClick={() => setActiveTab('selected')}
        >
          {t.tabs.selected} ({selectedCourses.length})
        </button>
      </div>

      {activeTab === 'all' && (
        <div className="filter-bar">
          <select
            className="filter-select"
            value={collegeFilter}
            onChange={(e) => setCollegeFilter(e.target.value)}
            aria-label="Filter by college"
          >
            <option value="All">{t.filterAllColleges}</option>
            {colleges.filter(c => c !== 'All').map(col => (
              <option key={col} value={col}>{displayCollege(col)}</option>
            ))}
          </select>
          {collegeFilter !== 'All' && departments.length > 1 && (
            <select
              className="filter-select"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              aria-label="Filter by department"
            >
              <option value="All">{lang === 'ar' ? 'كل الأقسام' : 'All Departments'}</option>
              {departments.filter(d => d !== 'All').map(dept => (
                <option key={dept} value={dept}>{displayDepartment(dept)}</option>
              ))}
            </select>
          )}
          <span className="filter-count">
            {t.showing} {Math.min(filteredCourses.length, 50)} / {courses.length}
          </span>
          {(collegeFilter !== 'All' || departmentFilter !== 'All') && (
            <button className="filter-clear" onClick={() => { setCollegeFilter('All'); setDepartmentFilter('All'); }}>
              {t.clearFilters}
            </button>
          )}
        </div>
      )}

      <div className="selector-content">
        {activeTab === 'all' ? (
          <SearchResults
            searchTerm={deferredSearch}
            courses={filteredCourses.slice(0, 50)}
            isSelected={isSelected}
            onToggle={handleToggleKeepFocus}
            onPreview={setPreviewCourse}
            hasFilters={collegeFilter !== 'All' || departmentFilter !== 'All'}
            t={t}
          />
        ) : (
          <SelectedCourses
            courses={selectedCourses}
            sectionFilters={sectionFilters}
            onToggle={onToggleCourse}
            onToggleSection={onToggleSection}
            onClearAll={onClearAll}
            t={t}
          />
        )}
      </div>

      <CoursePreviewModal course={previewCourse} open={!!previewCourse} onClose={closePreview} />
    </div>
  );
})

const shortCollege = (college) => {
  if (!college || college === 'Other') return '';
  const map = {
    'College of Agricultural and Marine Sciences': 'CAMS',
    'College of Arts and Social Sciences': 'CASS',
    'College of Economics and Political Science': 'CEPS',
    'College of Education': 'EDU',
    'College of Engineering': 'ENG',
    'College of Law': 'LAW',
    'College of Medicine and Health Sciences': 'COMHS',
    'College of Nursing': 'NUR',
    'College of Science': 'SCI',
    'Center for Preparatory Studies': 'CPS',
  };
  return map[college] || college.replace('College of ', '').slice(0, 4).toUpperCase();
};

const SearchResults = memo(function SearchResults({ searchTerm, courses, isSelected, onToggle, onPreview, hasFilters, t }) {
  if (courses.length === 0) {
    return (
      <div className="empty-state">
        <div>{t.noMatchesFound}</div>
        {hasFilters && <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>{t.clearFilters} ↓</div>}
      </div>
    );
  }
  return (
    <div className="course-list">
      {courses.map(course => (
        <CourseRow
          key={course.id}
          course={course}
          selected={isSelected(course.id)}
          onToggle={onToggle}
          onPreview={onPreview}
          t={t}
        />
      ))}
    </div>
  );
});

const CourseRow = memo(function CourseRow({ course, selected, onToggle, onPreview, t }) {
  const { lang } = useLanguage();
  if (!course) return null;
  const displayName = lang === 'ar' && course.nameAr ? course.nameAr : (course.nameEn || course.name);
  const timerRef = useRef(null);
  const longPressedRef = useRef(false);
  const startPosRef = useRef(null);
  const [pressing, setPressing] = useState(false);
  const [showPeek, setShowPeek] = useState(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPressing(false);
    setShowPeek(false);
  }, []);

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    longPressedRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setPressing(true);
    clearTimer();
    // subtle peek hint at 300ms
    const peekTimer = setTimeout(() => setShowPeek(true), 300);
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      setPressing(false);
      setShowPeek(false);
      clearTimeout(peekTimer);
      onPreview(course);
      if (navigator.vibrate) navigator.vibrate(18);
    }, 520);
    // store peek timer to clear together
    timerRef.current._peek = peekTimer;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  };

  const handlePointerMove = (e) => {
    if (!startPosRef.current) return;
    const dx = Math.abs(e.clientX - startPosRef.current.x);
    const dy = Math.abs(e.clientY - startPosRef.current.y);
    if (dx > 10 || dy > 10) clearTimer();
  };

  const handlePointerUp = () => {
    const wasLong = longPressedRef.current;
    const hadTimer = !!timerRef.current;
    if (timerRef.current && timerRef.current._peek) clearTimeout(timerRef.current._peek);
    clearTimer();
    startPosRef.current = null;
    if (wasLong) setTimeout(() => { longPressedRef.current = false; }, 0);
    // if it was a short tap and we had a timer, let click handle toggle
    if (!wasLong && !hadTimer) longPressedRef.current = false;
  };

  const handleClick = () => {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    onToggle(course);
  };

  return (
    <div
      className={`course-item ${selected ? 'selected' : ''} ${pressing ? 'pressing' : ''} ${showPeek ? 'peek' : ''}`}
      onClick={handleClick}
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={clearTimer}
      onPointerCancel={clearTimer}
      onContextMenu={(e) => { if (longPressedRef.current) e.preventDefault(); }}
      style={{ touchAction: 'pan-y' }}
    >
      <div className="course-info">
        <div className="course-code-row">
          <span className="course-code">{course.code}</span>
          {course.category && <span className={`category-pill cat-${course.category.toLowerCase()}`}>{course.category}</span>}
        </div>
        <div className="course-name">{displayName}</div>
        <div className="course-meta">
          {shortCollege(course.college) && <span className="meta-college">{shortCollege(course.college)} • </span>}
          <span>{course.sections.length} {course.sections.length === 1 ? t.section : t.sections}</span>
          {(() => {
            const s = course.sections[0];
            if (!s) return null;
            const sum = getSectionScheduleSummary(s);
            const first = sum.split('\n')[0];
            return first ? <span> • {first}</span> : null;
          })()}
        </div>
      </div>
      <span className="course-action-group">
        <button
          className="peek-btn"
          aria-label="Preview sections"
          tabIndex={-1}
          onClick={(e) => { e.stopPropagation(); onPreview(course); }}
        >
          <Eye size={14} />
        </button>
        <span className="course-action">
          {selected ? <Check size={16} /> : <Plus size={16} />}
        </span>
      </span>
    </div>
  );
});

const SelectedCourses = memo(function SelectedCourses({ courses, sectionFilters, onToggle, onToggleSection, onClearAll, t }) {
  const { lang } = useLanguage();
  if (courses.length === 0) {
    return <div className="empty-state">{t.noCoursesSelected}</div>;
  }

  return (
    <div className="course-list">
      <button className="clear-all-btn" onClick={onClearAll}>
        Clear All
      </button>
      {courses.filter(Boolean).map(course => {
        if (!course || !course.id) return null;
        const excludedSections = sectionFilters[course.id] || [];
        const displayName = lang === 'ar' && course?.nameAr ? course.nameAr : (course?.nameEn || course?.name || course.code);

        return (
          <div key={course.id} className="selected-course-card">
            <div className="card-header">
              <div>
                <div className="course-code-row">
                  <span className="course-code">{course.code}</span>
                  {course.category && <span className={`category-pill cat-${course.category.toLowerCase()}`}>{course.category}</span>}
                </div>
                <div className="course-name">{displayName}</div>
              </div>
              <button className="remove-btn" onClick={() => onToggle(course)}>
                <X size={16} />
              </button>
            </div>

            <div className="section-filters">
              <span className="filter-label">Sections:</span>
              <div className="section-cards">
                {course.sections.map(section => {
                  const isIncluded = !excludedSections.includes(section.section);
                  const timeSummary = getSectionScheduleSummary(section);
                  const displayInstructor = lang === 'ar' && section.instructorAr ? section.instructorAr : section.instructor;
                  return (
                    <button
                      key={section.section}
                      className={`chip ${isIncluded ? 'included' : 'excluded'}`}
                      onClick={() => onToggleSection(course.id, section.section)}
                    >
                      <span className="chip-name">
                        Section {section.section} — {normalizeInstructor(displayInstructor).replace(/-/g, '\u2011').replace(/\bAL\s+/gi, 'AL\u00A0')}
                      </span>
                      <span className="chip-time">{timeSummary}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});


