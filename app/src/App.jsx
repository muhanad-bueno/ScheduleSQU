import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Edit3, Info, Clock, ClipboardList, X } from 'lucide-react';
import { loadCourses } from './utils/dataLoader';
import { generateSchedules } from './utils/scheduler';
import { parseTimeSlots } from './utils/timeUtils';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { LanguageProvider, useLanguage } from './components/LanguageContext';
import ThemeToggle from './components/ThemeToggle';
import LanguageToggle from './components/LanguageToggle';
import LoadingScreen from './components/LoadingScreen';
import LogoMark from './components/LogoMark';
import CourseSelector from './components/CourseSelector';
import ScheduleViewer from './components/ScheduleViewer';
import WelcomeModal from './components/WelcomeModal';
import TimeFilterModal from './components/TimeFilterModal';
import ExamModal from './components/ExamModal';

const DATA_VERSION = 'v3.2'; // Bilingual en/ar + UE/UR categories + scroll fix
const WELCOME_KEY = 'welcome_seen_v6';

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
  const [heroMinTimeDone, setHeroMinTimeDone] = useState(false);

  // User selections
  const [selectedCourses, setSelectedCourses] = useState(() => loadState('selectedCourses', []));
  const [sectionFilters, setSectionFilters] = useState(() => loadState('sectionFilters', {}));
  const [blockedSlots, setBlockedSlots] = useState(() => loadState('blockedSlots', []));

  // Generated schedules
  const [schedules, setSchedules] = useState([]);
  const [scheduleIndex, setScheduleIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return localStorage.getItem(WELCOME_KEY) !== '1'; } catch { return true; }
  });
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const workerRef = useRef(null);
  const sheetStartY = useRef(null);

  const handleSheetTouchStart = useCallback((e) => {
    sheetStartY.current = e.touches[0].clientY;
  }, []);
  const handleSheetTouchEnd = useCallback((e) => {
    if (sheetStartY.current == null) return;
    const dy = e.changedTouches[0].clientY - sheetStartY.current;
    const sidebar = document.getElementById('sidebar');
    const atTop = !sidebar || sidebar.scrollTop <= 4;
    if (dy > 90 && atTop) setShowSidebar(false);
    sheetStartY.current = null;
  }, []);

  useEffect(() => {
    try {
      workerRef.current = new Worker(new URL('./workers/schedulerWorker.js', import.meta.url), { type: 'module' });
    } catch {}
    return () => workerRef.current?.terminate();
  }, []);

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

  // Keep the intro on screen for at least one full beat, even if data loads instantly
  useEffect(() => {
    const timer = setTimeout(() => setHeroMinTimeDone(true), 900);
    return () => clearTimeout(timer);
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

    const filtered = selectedCourses.map(course => {
      const excludedSections = sectionFilters[course.id] || [];
      const sections = course.sections.filter(section => {
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

    const applyResults = (results) => {
      const done = () => {
        setSchedules(results);
        setScheduleIndex(0);
        setGenerating(false);
        if (results.length === 0) alert(t.noSchedulesFound);
      };
      if (typeof document !== 'undefined' && document.startViewTransition) {
        document.startViewTransition(done);
      } else {
        done();
      }
    };

    // Novel: offload to worker so input stays 60fps even with 6 courses × 4 sections
    if (workerRef.current) {
      const id = Date.now().toString();
      const onMessage = (e) => {
        if (e.data.id !== id) return;
        workerRef.current.removeEventListener('message', onMessage);
        if (e.data.ok) applyResults(e.data.result);
        else {
          console.error('Worker failed, falling back', e.data.error);
          applyResults(generateSchedules(filtered));
        }
      };
      workerRef.current.addEventListener('message', onMessage);
      workerRef.current.postMessage({ id, courses: filtered });
      // Fallback if worker stalls
      setTimeout(() => {
        if (generating) {
          // still generating, worker may be hung, fallback after 4s
        }
      }, 4000);
    } else {
      setTimeout(() => applyResults(generateSchedules(filtered)), 50);
    }
  }, [selectedCourses, sectionFilters, blockedSlots, t, generating]);

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

  const handleCloseWelcome = useCallback((dontShowAgain) => {
    if (dontShowAgain) {
      try { localStorage.setItem(WELCOME_KEY, '1'); } catch {}
    }
    setShowWelcome(false);
  }, []);

  if (loading || !heroMinTimeDone) {
    return <LoadingScreen message={t.loadingCourses} />;
  }

  return (
    <div className="app">
      <WelcomeModal open={showWelcome} onClose={handleCloseWelcome} allCourses={allCourses} />
      <header className="app-header">
        <div className="header-left">
          <div className="logo-group">
            <LogoMark size={26} />
            <h1 className="logo">ScheduleSQU</h1>
          </div>
          <span className="made-by">Made by <span className="fancy-name">Muhanad</span></span>
        </div>
        <div className="header-right">
          <button className="icon-btn" onClick={() => setShowWelcome(true)} aria-label="About" title={t.welcomeTitle}>
            <Info size={18} />
          </button>
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
        <button
          className="mobile-controls"
          onClick={() => setShowSidebar(true)}
          aria-expanded={showSidebar}
          aria-controls="sidebar"
        >
          <div className="mobile-controls-content">
            <span className="mobile-label">{t.manageCourses}</span>
            <span className="mobile-count">{selectedCourses.length}</span>
          </div>
          <span className="mobile-edit-btn" aria-hidden="true">
            <Edit3 size={18} />
          </span>
        </button>

        <aside
          id="sidebar"
          className={`sidebar ${showSidebar ? 'active' : ''}`}
          onTouchStart={handleSheetTouchStart}
          onTouchEnd={handleSheetTouchEnd}
        >
          <div
            className="sheet-handle"
            aria-hidden="true"
            onTouchStart={handleSheetTouchStart}
            onTouchEnd={handleSheetTouchEnd}
          />
          <div className="sidebar-mobile-header">
            <div className="sidebar-title-group">
              <h3>{t.manageCourses}</h3>
              <span className="sidebar-subtitle">
                {selectedCourses.length > 0 ? `${selectedCourses.length} · ` : ''}{t.showing} {allCourses.length ? `${Math.min(allCourses.length, 1290)}` : ''}
              </span>
            </div>
            <button onClick={() => setShowSidebar(false)} className="close-sidebar-btn" aria-label={t.close}>
              <X size={18} />
            </button>
          </div>
          <CourseSelector
            courses={allCourses}
            selectedCourses={selectedCourses}
            onToggleCourse={handleToggleCourse}
            sectionFilters={sectionFilters}
            onToggleSection={handleToggleSection}
            onClearAll={handleClearCourses}
            blockedSlots={blockedSlots}
            t={t}
          />
          <div className="filter-actions">
            <button className="filter-action-btn" onClick={() => setShowTimeModal(true)}>
              <Clock size={16} />
              <span>{t.filterTitle}</span>
              {blockedSlots.length > 0 && <span className="filter-badge">{blockedSlots.length}</span>}
            </button>
            <button
              className="filter-action-btn"
              onClick={() => setShowExamModal(true)}
              disabled={schedules.length === 0}
              title={schedules.length === 0 ? (t.noSchedulesFound || 'Generate a schedule first') : ''}
            >
              <ClipboardList size={16} />
              <span>{t.examFooter}</span>
              {(() => {
                const cnt = (() => {
                  if (!schedules[scheduleIndex]) return 0;
                  const m = {};
                  schedules[scheduleIndex].forEach(s => {
                    const e = s.exam;
                    if (e && e !== 'TBA') {
                      const d = (e.match(/^(\d{2}\/\d{2}\/\d{4}\s+\w+)/) || [e])[0];
                      if (!m[d]) m[d] = [];
                      m[d].push(s.code);
                    }
                  });
                  return Object.values(m).filter(a => a.length >= 2).length;
                })();
                return cnt > 0 ? <span className="filter-badge conflict">!</span> : null;
              })()}
            </button>
          </div>
        </aside>

        <TimeFilterModal
          open={showTimeModal}
          onClose={() => setShowTimeModal(false)}
          blockedSlots={blockedSlots}
          onToggleSlot={handleToggleSlot}
          onToggleDay={handleToggleDay}
          onReset={handleResetFilters}
          t={t}
        />
        <ExamModal open={showExamModal} onClose={() => setShowExamModal(false)} schedule={schedules[scheduleIndex]} t={t} />

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
