import { useState, useMemo, useEffect, memo } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { getSectionScheduleSummary } from '../utils/timeUtils';

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
  t
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Auto-switch to 'all' tab when user types
  useEffect(() => {
    if (searchTerm.trim() && activeTab === 'selected') {
      setActiveTab('all');
    }
  }, [searchTerm]);

  const filteredCourses = useMemo(() => {
    if (!debouncedSearch.trim()) return [];
    const terms = debouncedSearch.toLowerCase().split(/\s+/).filter(Boolean);
    return courses.filter(c => {
      const code = c.code.toLowerCase();
      const name = c.name.toLowerCase();
      return terms.every(term => code.includes(term) || name.includes(term));
    });
  }, [courses, debouncedSearch]);

  const isSelected = (id) => selectedCourses.some(c => c.id === id);

  return (
    <div className="course-selector">
      <div className="selector-header">
        <input
          type="text"
          className="search-input"
          placeholder={t.searchPlaceholder}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
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

      <div className="selector-content">
        {activeTab === 'all' ? (
          <SearchResults
            searchTerm={debouncedSearch}
            courses={filteredCourses.slice(0, 50)}
            isSelected={isSelected}
            onToggle={onToggleCourse}
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
    </div>
  );
})

const SearchResults = memo(function SearchResults({ searchTerm, courses, isSelected, onToggle, t }) {
  if (!searchTerm.trim()) {
    return <div className="empty-state">{t.emptySearchPrompt}</div>;
  }
  if (courses.length === 0) {
    return <div className="empty-state">{t.noMatchesFound}</div>;
  }
  return (
    <div className="course-list">
      {courses.map(course => (
        <div
          key={course.id}
          className={`course-item ${isSelected(course.id) ? 'selected' : ''}`}
          onClick={() => onToggle(course)}
        >
          <div className="course-info">
            <div className="course-code-row">
              <span className="course-code">{course.code}</span>
              {course.category && <span className={`category-pill cat-${course.category.toLowerCase()}`}>{course.category}</span>}
            </div>
            <div className="course-name">{course.name}</div>
          </div>
          <span className="course-action">
            {isSelected(course.id) ? <Check size={16} /> : <Plus size={16} />}
          </span>
        </div>
      ))}
    </div>
  );
});

const SelectedCourses = memo(function SelectedCourses({ courses, sectionFilters, onToggle, onToggleSection, onClearAll, t }) {
  if (courses.length === 0) {
    return <div className="empty-state">{t.noCoursesSelected}</div>;
  }

  return (
    <div className="course-list">
      {courses.length > 0 && (
        <button className="clear-all-btn" onClick={onClearAll}>
          Clear All
        </button>
      )}

      {courses.map(course => {
        const excludedSections = sectionFilters[course.id] || [];

        return (
          <div key={course.id} className="selected-course-card">
            <div className="card-header">
              <div>
                <div className="course-code-row">
                  <span className="course-code">{course.code}</span>
                  {course.category && <span className={`category-pill cat-${course.category.toLowerCase()}`}>{course.category}</span>}
                </div>
                <div className="course-name">{course.name}</div>
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
                  return (
                    <button
                      key={section.section}
                      className={`chip ${isIncluded ? 'included' : 'excluded'}`}
                      onClick={() => onToggleSection(course.id, section.section)}
                    >
                      <span className="chip-name">
                        Section {section.section} — {normalizeInstructor(section.instructor).replace(/-/g, '\u2011').replace(/\bAL\s+/gi, 'AL\u00A0')}
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
