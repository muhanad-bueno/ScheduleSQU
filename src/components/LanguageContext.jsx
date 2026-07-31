import { createContext, useContext, useEffect, useState } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

const translations = {
    en: {
        searchPlaceholder: 'Search courses (e.g., COMP3000)...',
        tabs: { all: 'All Courses', selected: 'Selected' },
        emptySearchPrompt: 'Start typing to search for courses...',
        noMatchesFound: 'No courses found.',
        noCoursesSelected: 'No courses selected yet.',
        instructorTimesLabel: 'Instructors',
        remove: 'Remove',
        filterTitle: 'Time Filters',
        resetFilters: 'Reset',
        generate: 'Generate',
        processing: 'Processing...',
        schedule: 'Schedule',
        of: 'of',
        noSchedules: 'No valid schedules found. Try removing some filters or selecting different instructors.',
        saveImage: 'Save as Image',
        examFooter: 'Exam Dates',
        loadingCourses: 'Loading courses...',
        noSchedulesFound: 'No valid schedules found with current filters.',
        confirmClearCourses: 'Clear all selected courses?',
        confirmResetFilters: 'Reset all time filters?',
        days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
        filterHint: 'Click on a day header to block the whole day, or click specific hours to block them.',
        welcomeMessage: 'Welcome! Search for courses on the left to get started.',
        dataUpdate: 'Fall 2026 — Data updated July 31, 2026',
        conflict: 'Conflict Found!',
        multipleExamsOn: 'Multiple exams on',
        manageCourses: 'Manage Courses',
        close: 'Close',
        timeDay: 'Time/Day',
        distanceLearning: 'Distance Learning',
        exportSchedule: 'Export Schedule',
        exportAll: 'Export All Schedules',
        exporting: 'Exporting...',
        classroom: 'Room'
    },
    ar: {
        searchPlaceholder: 'ابحث عن المقررات (مثال: COMP3000)...',
        tabs: { all: 'جميع المقررات', selected: 'المقررات المحددة' },
        emptySearchPrompt: 'ابدأ بكتابة رمز المقرر أو اسمه للبحث...',
        noMatchesFound: 'لا توجد نتائج مطابقة.',
        noCoursesSelected: 'لم يتم اختيار أي مقررات بعد. ابحث وأضف مقررات لإنشاء الجداول.',
        instructorTimesLabel: 'أوقات المدرسين',
        remove: 'إزالة',
        filterTitle: 'تحديد الأوقات غير المناسبة',
        resetFilters: 'إعادة تعيين',
        generate: 'إنشاء الجداول',
        processing: 'جاري إنشاء الجداول...',
        schedule: 'الجدول رقم',
        of: 'من',
        noSchedules: 'لم يتم العثور على جداول مناسبة. يرجى محاولة ازالة بعض تفضيلات الوقت أو المدرسين.',
        saveImage: 'حفظ الجدول كصورة',
        examFooter: 'مواعيد الاختبارات النهائية',
        loadingCourses: 'جاري تحميل بيانات المقررات...',
        noSchedulesFound: 'لا توجد جداول تتوافق مع الفلاتر الحالية.',
        confirmClearCourses: 'هل أنت متأكد من إزالة جميع المقررات؟',
        confirmResetFilters: 'إعادة تعيين جميع الفلاتر؟',
        days: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
        filterHint: 'اضغط على رأس العمود لحظر يوم كامل، أو اضغط على ساعات محددة لحظرها.',
        welcomeMessage: 'مرحباً! ابدأ بالبحث عن المقررات في القائمة الجانبية.',
        dataUpdate: 'خريف 2026 — آخر تحديث: 31 يوليو 2026',
        conflict: 'يوجد تعارض!',
        multipleExamsOn: 'عدة اختبارات في',
        manageCourses: 'إدارة المقررات',
        close: 'إغلاق',
        timeDay: 'الوقت/اليوم',
        distanceLearning: 'التعلم عن بعد',
        exportSchedule: 'تصدير هذا الجدول',
        exportAll: 'تصدير جميع الجداول',
        exporting: 'جاري التصدير...',
        classroom: 'القاعة'
    }
};

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState(() => {
        try {
            return localStorage.getItem('lang') || 'en';
        } catch {
            return 'en';
        }
    });

    useEffect(() => {
        document.body.classList.toggle('rtl', lang === 'ar');
        try {
            localStorage.setItem('lang', lang);
        } catch {
            // Ignore
        }
    }, [lang]);

    const toggleLang = () => {
        setLang(prev => prev === 'en' ? 'ar' : 'en');
    };

    const t = translations[lang];

    return (
        <LanguageContext.Provider value={{ lang, toggleLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
}
