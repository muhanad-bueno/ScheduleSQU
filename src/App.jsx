import { useState, useEffect, useCallback } from 'react';
import { Edit3 } from 'lucide-react';
import { loadCourses } from './utils/dataLoader';
import { generateSchedules } from './utils/scheduler';
import { parseTimeSlots } from './utils/timeUtils';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { LanguageProvider, useLanguage } from './components/LanguageContext';
import ThemeToggle from './components/ThemeToggle';
import LanguageToggle from './components/LanguageToggle';
import LoadingScreen from './components/LoadingScreen';
import CourseSelector from './components/CourseSelector';
import FilterPanel from './components/FilterPanel';
import ScheduleViewer from './components/ScheduleViewer';
import DataSourceBadge from './components/DataSourceBadge';

const DATA_VERSION = 'v2.1'; // Bump to wipe old data

// Check version and wipe if needed
try {
  const currentVersion = localStorage.getItem('app_version');
  if (currentVersion !== DATA_VERSION) {
    localStorage.clear();
    localStorage.setItem('app_version', DATA_VERSION);
  }
} catch (e) {
  // Ignore
}

// LocalStorage helpers
const loadState = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const saveState = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore
  }
};

function AppContent() {
  const { t } = useLanguage();
  const { theme } = useTheme();

  // Data
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // User selections
  const [selectedCourses, setSelectedCourses] = useState(() => loadState('selectedCourses', []));
  const [sectionFilters, setSectionFilters] = useState(() => loadState('sectionFilters', {}));
  const [blockedSlots, setBlockedSlots] = useState(() => loadState('blockedSlots', []));

  // Generated schedules
  const [schedules, setSchedules] = useState([]);
  const [scheduleIndex, setScheduleIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // Load data on mount
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await loadCourses();
        if (mounted) {
          setAllCourses(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  // Persist state
  useEffect(() => { saveState('selectedCourses', selectedCourses); }, [selectedCourses]);
  useEffect(() => { saveState('sectionFilters', sectionFilters); }, [sectionFilters]);
  useEffect(() => { saveState('blockedSlots', blockedSlots); }, [blockedSlots]);

  // Handlers
  const handleToggleCourse = useCallback((course) => {
    setSelectedCourses(prev => {
      const exists = prev.find(c => c.id === course.id);
      return exists ? prev.filter(c => c.id !== course.id) : [...prev, course];
    });
    setSchedules([]);
    setScheduleIndex(0);
  }, []);

  const handleToggleSection = useCallback((courseId, sectionId) => {
    setSectionFilters(prev => {
      const excluded = prev[courseId] || [];
      const isExcluded = excluded.includes(sectionId);
      
      let newExcluded;
      if (isExcluded) {
        // Re-include the section
        newExcluded = excluded.filter(s => s !== sectionId);
      } else {
        // Exclude the section
        newExcluded = [...excluded, sectionId];
      }
      
      // If no sections are excluded, remove the key entirely
      if (newExcluded.length === 0) {
        const copy = { ...prev };
        delete copy[courseId];
        return copy;
      }
      
      return { ...prev, [courseId]: newExcluded };
    });
  }, []);

  const handleToggleDay = useCallback((day) => {
    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    setBlockedSlots(prev => {
      const allBlocked = hours.every(h => prev.includes(`${day}-${h}`));
      if (allBlocked) {
        return prev.filter(key => !key.startsWith(`${day}-`));
      } else {
        const newSlots = [...prev];
        hours.forEach(h => {
          const key = `${day}-${h}`;
          if (!newSlots.includes(key)) newSlots.push(key);
        });
        return newSlots;
      }
    });
  }, []);

  const handleToggleSlot = useCallback((day, hour) => {
    const key = `${day}-${hour}`;
    setBlockedSlots(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }, []);

  const handleGenerate = useCallback(() => {
    if (selectedCourses.length === 0) return;

    setGenerating(true);

    setTimeout(() => {
      const filtered = selectedCourses.map(course => {
        const excludedSections = sectionFilters[course.id] || [];
        const sections = course.sections.filter(section => {
          // Check if section is excluded
          if (excludedSections.includes(section.section)) return false;

          const slots = parseTimeSlots(section.time);
          const hasConflict = slots.some(slot => {
            const startH = Math.floor(slot.start / 60);
            const endH = Math.floor((slot.end - 1) / 60);
            for (let h = startH; h <= endH; h++) {
              if (blockedSlots.includes(`${slot.day}-${h}`)) return true;
            }
            return false;
          });

          return !hasConflict;
        });

        return { ...course, sections };
      });

      const results = generateSchedules(filtered);
      setSchedules(results);
      setScheduleIndex(0);
      setGenerating(false);

      if (results.length === 0) {
        alert(t.noSchedulesFound);
      }
    }, 50);
  }, [selectedCourses, sectionFilters, blockedSlots, t]);

  const handleClearCourses = useCallback(() => {
    if (window.confirm(t.confirmClearCourses)) {
      setSelectedCourses([]);
      setSchedules([]);
      setScheduleIndex(0);
      setSectionFilters({});
    }
  }, [t]);

  const handleResetFilters = useCallback(() => {
    if (window.confirm(t.confirmResetFilters)) {
      setBlockedSlots([]);
    }
  }, [t]);

  if (loading) {
    return <LoadingScreen message={t.loadingCourses} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="logo">Schedule Maker</h1>
          <span className="made-by">Made by <span className="fancy-name">Muhanad</span> @ SQU</span>
          <DataSourceBadge sourceDate="2026-08-05" />
        </div>
        <div className="header-right">
          <LanguageToggle />
          <ThemeToggle />
          <button
            className="primary-btn"
            onClick={handleGenerate}
            disabled={selectedCourses.length === 0 || generating}
          >
            {generating ? t.processing : `${t.generate} (${selectedCourses.length})`}
          </button>
        </div>
      </header>

      <main className="app-main">
        {/* Mobile Sidebar Toggle */}
        <div className="mobile-controls" onClick={() => setShowSidebar(true)}>
          <div className="mobile-controls-content">
            <span className="mobile-label">{t.manageCourses}</span>
            <span className="mobile-count">{selectedCourses.length}</span>
          </div>
          <button className="mobile-edit-btn">
            <Edit3 size={18} />
          </button>
        </div>

        <aside className={`sidebar ${showSidebar ? 'active' : ''}`}>
          <div className="sidebar-mobile-header">
            <h3>{t.manageCourses}</h3>
            <button onClick={() => setShowSidebar(false)} className="close-sidebar-btn">
              {t.close}
            </button>
          </div>
          <CourseSelector
            courses={allCourses}
            selectedCourses={selectedCourses}
            onToggleCourse={handleToggleCourse}
            sectionFilters={sectionFilters}
            onToggleSection={handleToggleSection}
            onClearAll={handleClearCourses}
            t={t}
          />
          <FilterPanel
            blockedSlots={blockedSlots}
            onToggleSlot={handleToggleSlot}
            onToggleDay={handleToggleDay}
            onReset={handleResetFilters}
            t={t}
          />
        </aside>

        {showSidebar && (
          <div className="sidebar-overlay" onClick={() => setShowSidebar(false)} />
        )}

        <section className="main-content">
          <ScheduleViewer
            schedule={schedules[scheduleIndex]}
            allSchedules={schedules}
            scheduleIndex={scheduleIndex}
            totalSchedules={schedules.length}
            onNext={() => setScheduleIndex(i => Math.min(schedules.length - 1, i + 1))}
            onPrev={() => setScheduleIndex(i => Math.max(0, i - 1))}
            theme={theme}
            t={t}
          />
        </section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </LanguageProvider>
  );
}
