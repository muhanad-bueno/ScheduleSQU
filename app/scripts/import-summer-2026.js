import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT = path.join(__dirname, '../../college_arts_summer_2026_timetable.json');
const OUTPUT_PUBLIC = path.join(__dirname, '../public/data.json');
const OUTPUT_SRC = path.join(__dirname, '../src/data/courses.json');

const raw = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

const CATEGORIES = {
  'ARAB1060': 'UR',
  'HIST1010': 'UR',
  'TOUR1055': 'UE',
  'TOUR1062': 'UE',
  'ARAB2032': 'CR',
  'GEOG1200': 'CE',
  'ENGL4562': 'DE',
  'ENGL4573': 'DE',
  'ENGL4576': 'DE',
};

const courses = raw.map(course => ({
  id: course.code,
  code: course.code,
  name: course.name,
  category: CATEGORIES[course.code] || null,
  sections: course.sections.map(s => {
    const slots = (s.meetings || []).map(m => ({
      time: `${m.day} ${m.start_time}-${m.end_time}`,
      room: m.room || s.room || '',
      building: m.building || s.building || ''
    }));

    return {
      section: s.section,
      instructor: s.instructor || 'To Be Announced',
      time: s.time,
      room: s.room || '',
      building: s.building || '',
      slots,
      exam: s.exam || 'N/A'
    };
  })
}));

const output = {
  version: Date.now().toString(),
  courses
};

fs.writeFileSync(OUTPUT_PUBLIC, JSON.stringify(output, null, 2));
fs.writeFileSync(OUTPUT_SRC, JSON.stringify(courses, null, 2));

console.log(`Done. ${courses.length} courses, ${courses.reduce((a, c) => a + c.sections.length, 0)} sections.`);
console.log(`Version: ${output.version}`);
