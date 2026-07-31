/**
 * Time utilities
 */

import { parseTimeSlots } from './scheduler';

/**
 * Format minutes from midnight to "HH:MM AM/PM"
 * @param {number} minutes - Minutes from midnight (e.g., 480 for 8:00 AM)
 * @returns {string} Formatted time string (e.g., "8:00 AM")
 */
export function formatMinutesTo12h(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Parse 24h time string to 12h format
 * @param {string} timeStr - Time string like "08:00:00" or "08:00"
 * @returns {string} Formatted time string (e.g., "8:00 AM")
 */
export function parseTimeStringTo12h(timeStr) {
  if (!timeStr) return 'TBA';
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return timeStr;
  const hours = parseInt(match[1], 10);
  const mins = match[2];
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${mins} ${period}`;
}

// Backwards compatibility alias
export const formatTime = formatMinutesTo12h;

/**
 * Get summary of a single section's schedule times
 */
export function getSectionScheduleSummary(section) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daySlots = {};

  const slots = parseTimeSlots(section.time);
  for (const slot of slots) {
    const dayName = dayNames[slot.day];
    if (!daySlots[dayName]) daySlots[dayName] = [];

    const timeStr = `${formatMinutesTo12h(slot.start)}-${formatMinutesTo12h(slot.end)}`;
    if (!daySlots[dayName].includes(timeStr)) {
      daySlots[dayName].push(timeStr);
    }
  }

  return Object.entries(daySlots)
    .map(([day, times]) => times.map(time => `${day}: ${time}`).join('\n'))
    .join('\n');
}

// Re-export for convenience
export { parseTimeSlots };
