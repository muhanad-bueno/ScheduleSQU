/**
 * Data loader - fetches course data with version checking and caching
 */

const DATA_VERSION_KEY = 'squ_data_version';

// Module-level cache to avoid redundant fetches within same session
let cachedCourses = null;

export async function loadCourses() {
    // Return cached data if available
    if (cachedCourses) {
        return cachedCourses;
    }

    const baseUrl = import.meta.env.BASE_URL || '/';
    const url = `${baseUrl}data.json`.replace('//', '/');

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load courses: ${response.status}`);
    }

    const data = await response.json();

    // Check version and clear localStorage if mismatch
    const savedVersion = localStorage.getItem(DATA_VERSION_KEY);
    const currentVersion = data.version;

    if (savedVersion !== currentVersion) {
        console.log(`Data version changed: ${savedVersion} -> ${currentVersion}`);
        console.log('Clearing saved selections to avoid conflicts...');

        // Clear all app-related localStorage
        localStorage.removeItem('selectedCourses');
        localStorage.removeItem('instructorFilters');
        localStorage.removeItem('blockedSlots');

        // Save new version
        localStorage.setItem(DATA_VERSION_KEY, currentVersion);
    }

    // Cache the courses for subsequent calls
    cachedCourses = data.courses;

    // Return just the courses array
    return cachedCourses;
}
