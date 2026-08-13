/**
 * Schedule Generator - Clean Implementation
 * Uses backtracking to find all non-conflicting schedule combinations
 */

const DAYS_MAP = {
    sun: 0, u: 0, sunday: 0,
    mon: 1, m: 1, monday: 1,
    tue: 2, t: 2, tuesday: 2,
    wed: 3, w: 3, wednesday: 3,
    thu: 4, r: 4, thursday: 4,
    fri: 5, f: 5, friday: 5,
    sat: 6, s: 6, saturday: 6
};

const TIME_REGEX = /(\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*(\d{1,2}:\d{2}(?::\d{2})?)/;

/**
 * Parse "HH:MM" to minutes from midnight
 */
function parseTime(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

/**
 * Parse time string like "SUN 10:00-11:30 | TUE 10:00-11:30"
 * Returns array of { day, start, end, room, building } objects
 * 
 * @param {string} timeString - Combined time string (e.g., "MON 08:00-09:50 | TUE 10:00-11:50")
 * @param {Array} slotsData - Optional array of slot objects with per-slot room/building
 */
export function parseTimeSlots(timeString, slotsData = null) {
    if (!timeString) return [];

    const slots = [];
    const parts = timeString.split('|');

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const lower = part.toLowerCase().trim();
        const timeMatch = lower.match(TIME_REGEX);

        if (timeMatch) {
            const start = parseTime(timeMatch[1]);
            const end = parseTime(timeMatch[2]);

            // Get room/building from corresponding slot data if available
            const slotInfo = slotsData && slotsData[i] ? slotsData[i] : null;
            const room = slotInfo?.room || '';
            const building = slotInfo?.building || '';

            // Find day names in this part
            const tokens = lower.replace(TIME_REGEX, '').split(/[^a-z]+/).filter(Boolean);

            for (const token of tokens) {
                if (token in DAYS_MAP) {
                    slots.push({ day: DAYS_MAP[token], start, end, room, building });
                }
            }
        }
    }

    return slots;
}

/**
 * Check if two time slots overlap
 */
function isOverlapping(slot1, slot2) {
    if (slot1.day !== slot2.day) return false;
    return Math.max(slot1.start, slot2.start) < Math.min(slot1.end, slot2.end);
}

/**
 * Check if a section conflicts with current schedule
 */
function hasConflict(section, currentSchedule) {
    const newSlots = section.parsedSlots || parseTimeSlots(section.time || '');

    for (const scheduled of currentSchedule) {
        const existingSlots = scheduled.parsedSlots || parseTimeSlots(scheduled.time || '');

        for (const s1 of newSlots) {
            for (const s2 of existingSlots) {
                if (isOverlapping(s1, s2)) return true;
            }
        }
    }
    return false;
}

/**
 * Generate all valid schedule combinations
 */
export function generateSchedules(selectedCourses) {
    const results = [];

    // Sort by section count (fewest first for faster pruning)
    const sortedCourses = [...selectedCourses].sort(
        (a, b) => a.sections.length - b.sections.length
    );

    function backtrack(courseIndex, currentSchedule) {
        if (courseIndex === sortedCourses.length) {
            results.push([...currentSchedule]);
            return;
        }

        const course = sortedCourses[courseIndex];

        for (const section of course.sections) {
            // Lazy parse time slots with per-slot room/building data
            if (!section.parsedSlots) {
                section.parsedSlots = parseTimeSlots(section.time || '', section.slots || null);
            }

            if (!hasConflict(section, currentSchedule)) {
                const enriched = {
                    ...section,
                    code: course.code,
                    name: course.name,
                    nameAr: course.nameAr || course.name,
                    nameEn: course.nameEn || course.name,
                    college: course.college,
                    collegeAr: course.collegeAr,
                    collegeEn: course.collegeEn,
                    category: course.category,
                };
                currentSchedule.push(enriched);
                backtrack(courseIndex + 1, currentSchedule);
                currentSchedule.pop();
            }
        }
    }

    backtrack(0, []);
    return results;
}
