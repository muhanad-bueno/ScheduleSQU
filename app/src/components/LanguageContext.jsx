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
        dataUpdate: 'Fall 2026 — All colleges • Updated Aug 14, 2026',
        conflict: 'Conflict Found!',
        multipleExamsOn: 'Multiple exams on',
        manageCourses: 'Manage Courses',
        close: 'Close',
        timeDay: 'Time/Day',
        distanceLearning: 'Distance Learning',
        exportSchedule: 'Export Schedule',
        exportAll: 'Export All Schedules',
        exporting: 'Exporting...',
        classroom: 'Room',
        welcomeTitle: 'One place to build your schedule.',
        welcomeSubtitle: 'Official Fall 2026 Timetables as of August 14th, 2026 ~ 1290 courses.',
        welcomeStep1Title: 'Find your courses',
        welcomeStep1Desc: 'Search by code or name, from any college, and add what you plan to take.',
        welcomeStep2Title: 'Browse timetables that work',
        welcomeStep2Desc: 'We generate every conflict free option. Compare them and export your favorite to PDF.',
        welcomeCta: 'Start building',
        welcomeContact: 'Spotted a missing course or wrong time? Email me and I will fix it.',
        welcomeDontShow: 'Don\'t show this again',
        welcomeTip: 'Tip: Long-press any course to preview its sections instantly.',
        welcomeExportTitle: 'General Schedule for All Colleges',
        welcomeExportDesc: 'Every college, every section. Print-ready.',
        welcomeExportBtn: 'Download PDF',
        welcomeExporting: 'Generating…',
        welcomeExportHint: '',
        filterAllColleges: 'All Colleges',
        filterAllLevels: 'All Levels',
        showing: 'Showing',
        sections: 'sections',
        section: 'section',
        popular: 'Try these popular courses',
        clearFilters: 'Clear filters',
        previewFoot: 'Tap outside or swipe down to close. Blocked times will be filtered when you generate.',
        departmentFilterLabel: 'All Departments',
        filterFootEmpty: 'Tap hours or day headers to block times you can’t attend. They’ll be excluded when you generate.',
        filterFootBlocked: '{count} time blocks will be excluded from generated schedules.'
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
        dataUpdate: 'خريف 2026 — جميع الكليات • آخر تحديث 14 أغسطس 2026',
        conflict: 'يوجد تعارض!',
        multipleExamsOn: 'عدة اختبارات في',
        manageCourses: 'إدارة المقررات',
        close: 'إغلاق',
        timeDay: 'الوقت/اليوم',
        distanceLearning: 'التعلم عن بعد',
        exportSchedule: 'تصدير هذا الجدول',
        exportAll: 'تصدير جميع الجداول',
        exporting: 'جاري التصدير...',
        classroom: 'القاعة',
        welcomeTitle: 'صمم جدولك بكل سهوله',
        welcomeSubtitle: 'الجداول الرسمية لخريف 2026 ~ أخر تحديث للجداول 14 أغسطس 2026',
        welcomeStep1Title: 'اختر مقرراتك',
        welcomeStep1Desc: 'ابحث عن المقرر باسمه أو رمزه من أي كلية، وأضفه إلى قائمتك بضغطة واحدة.',
        welcomeStep2Title: 'استعرض جداولك الجاهزة بلا تعارض',
        welcomeStep2Desc: 'سيبني لك الموقع كل الجداول الخالية من التعارض مع امكانية تصدير الجداول المولدة بصيغة PDF',
        welcomeCta: 'ابدأ بناء جدولك',
        welcomeContact: 'يرجى التواصل على',
        welcomeContactSuffix: 'عند مواجهة اي مشكلة في استخدام الموقع',
        welcomeDontShow: 'لا تظهر هذه الرسالة مجدداً',
        welcomeTip: 'اضغط مطولاً على أي مقرر لاستعراض الشعب المتوفرة.',
        welcomeExportTitle: 'الجدول العام لكل الكليات',
        welcomeExportDesc: 'كل الكليات والشعب. جاهز للطباعة.',
        welcomeExportBtn: 'حمّل الـ PDF',
        welcomeExporting: 'جاري الإنشاء…',
        welcomeExportHint: '',
        filterAllColleges: 'كل الكليات',
        filterAllLevels: 'كل المستويات',
        showing: 'عرض',
        sections: 'شعبة',
        section: 'شعبة',
        popular: 'جرّب هذه المقررات الرائجة',
        clearFilters: 'مسح الفلاتر',
        previewFoot: 'اسحب للأسفل أو اضغط خارجاً للإغلاق. الأوقات المحجوبة ستُستبعد عند إنشاء الجداول.',
        departmentFilterLabel: 'كل الأقسام',
        filterFootEmpty: 'اضغط على الساعات أو رؤوس الأيام لحجب الأوقات التي لا تناسبك. سيتم استبعادها عند إنشاء الجداول.',
        filterFootBlocked: '{count} فترة محجوبة سيتم استبعادها من الجداول.'
    }
};

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState(() => {
        try {
            return localStorage.getItem('lang') || 'ar';
        } catch {
            return 'ar';
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
