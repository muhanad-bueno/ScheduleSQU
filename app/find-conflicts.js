import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('./src/data/courses.json', 'utf8'));

const examsByDate = {};

data.forEach(course => {
    course.sections.forEach(section => {
        if (section.exam && section.exam !== 'TBA') {
            const dateMatch = section.exam.match(/^(\d{2}\/\d{2}\/\d{4}\s+\w+)/);
            const date = dateMatch ? dateMatch[1] : section.exam;
            if (!examsByDate[date]) examsByDate[date] = [];
            examsByDate[date].push(course.code);
        }
    });
});

const conflicts = Object.entries(examsByDate)
    .filter(([_, codes]) => codes.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);

console.log('=== EXAM CONFLICTS ===\n');
conflicts.slice(0, 15).forEach(([date, codes]) => {
    const unique = [...new Set(codes)];
    console.log(`${date}: ${unique.length} courses`);
    console.log(`  ${unique.join(', ')}\n`);
});
