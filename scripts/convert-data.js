import fs from 'fs';
import path from 'path';
import * as XLSX_Module from 'xlsx';
import { fileURLToPath } from 'url';

const XLSX = XLSX_Module.default || XLSX_Module;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAW_DATA_DIR = path.join(__dirname, '../raw-data');
const OUTPUT_FILE = path.join(__dirname, '../public/data.json');

/**
 * CORRECTED ALGORITHM:
 * 
 * KEY INSIGHT: Section Number is the ONLY unique identifier for a section.
 * 
 * - Each row in Excel = ONE class meeting
 * - Multiple rows with SAME section number = multiple meetings per week for THAT section
 * - Section 01 and Section 02 are ALWAYS different, even if same instructor/time
 * 
 * UNIQUE KEY: CourseCode + SectionNumber
 * 
 * Example:
 *   SOCY1005 Section 01 - Mon 10-11:50 - Instructor A
 *   SOCY1005 Section 02 - Mon 10-11:50 - Instructor A
 *   → These are TWO different sections (user can only pick one)
 * 
 *   EDUC2010 Section 100 - Sun 8-9:50 - Instructor A
 *   EDUC2010 Section 100 - Tue 8-9:50 - Instructor A  
 *   → This is ONE section with 2 meetings per week
 */

function convertData() {
    if (!fs.existsSync(RAW_DATA_DIR)) {
        console.error(`Directory not found: ${RAW_DATA_DIR}`);
        process.exit(1);
    }

    const allFiles = fs.readdirSync(RAW_DATA_DIR);
    const excelFiles = allFiles.filter(file =>
        (file.endsWith('.xls') || file.endsWith('.xlsx')) && !file.startsWith('~$')
    );

    if (excelFiles.length === 0) {
        console.warn('No Excel files found in raw-data directory.');
        return;
    }

    let allRawRows = [];

    excelFiles.forEach(file => {
        const filePath = path.join(RAW_DATA_DIR, file);
        console.log(`Processing: ${file}`);

        const rows = readExcelFile(filePath);
        allRawRows = allRawRows.concat(rows);
    });

    console.log(`Total raw rows extracted: ${allRawRows.length}`);

    const courses = consolidateCourses(allRawRows);

    validateData(courses);

    // Create versioned output with timestamp
    const version = Date.now().toString();
    const output = {
        version: version,
        courses: courses
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`\\nData converted successfully! Saved to ${OUTPUT_FILE}`);
    console.log(`Version: ${version}`);
    console.log(`Total courses: ${courses.length}`);
    console.log(`Total sections: ${courses.reduce((acc, c) => acc + c.sections.length, 0)}`);
}

function readExcelFile(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rows.length === 0) return [];

    let headerRowIndex = -1;
    let columnIndices = {};

    // Find header row
    for (let i = 0; i < Math.min(rows.length, 25); i++) {
        const rowStr = rows[i].map(c => String(c).toLowerCase()).join(' ');
        if (rowStr.includes('course') && (rowStr.includes('code') || rowStr.includes('title') || rowStr.includes('name'))) {
            headerRowIndex = i;

            rows[i].forEach((cell, idx) => {
                const val = String(cell).toLowerCase().trim();

                if (val === 'course code') columnIndices.code = idx;
                else if (val === 'section num' || val === 'section number') columnIndices.section = idx;
                else if (val === 'course name' || val === 'course title') columnIndices.name = idx;
                else if (val === 'instructor') columnIndices.instructor = idx;
                else if (val === 'day') columnIndices.day = idx;
                else if (val === 'from time' || val === 'from') columnIndices.from = idx;
                else if (val === 'to time' || (val === 'to' && idx !== columnIndices.instructor)) columnIndices.to = idx;
                else if (val === 'hall' || val === 'room') columnIndices.room = idx;
                else if (val === 'building') columnIndices.building = idx;
                else if (val.includes('exam date')) columnIndices.exam = idx;
            });

            console.log(`  Headers found at row ${i}:`, columnIndices);
            break;
        }
    }

    if (headerRowIndex === -1) {
        console.warn(`  Could not find header row in ${path.basename(filePath)}`);
        return [];
    }

    const cleanedRows = [];
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const code = row[columnIndices.code];
        if (!code || String(code).toLowerCase().includes('course')) continue;

        const section = String(row[columnIndices.section] || '').trim();
        if (!section) {
            console.warn(`  Row ${i}: Missing section for ${code}, skipping`);
            continue;
        }

        const day = String(row[columnIndices.day] || '').trim();
        const from = String(row[columnIndices.from] || '').trim();
        const to = String(row[columnIndices.to] || '').trim();
        const timeStr = (day && from && to) ? `${day} ${from}-${to}` : '';

        cleanedRows.push({
            code: String(code).trim(),
            name: String(row[columnIndices.name] || '').trim(),
            section: section,
            instructor: String(row[columnIndices.instructor] || 'To Be Announced').trim(),
            time: timeStr,
            room: String(row[columnIndices.room] || '').trim(),
            building: String(row[columnIndices.building] || '').trim(),
            exam: String(row[columnIndices.exam] || '').trim()
        });
    }

    console.log(`  Extracted ${cleanedRows.length} rows`);
    return cleanedRows;
}

function consolidateCourses(rawRows) {
    // Helper: Check if instructor is TBA
    const isTBA = (name) => {
        if (!name) return true;
        const n = name.toUpperCase();
        return n.includes('TO BE') || n.includes('ANNOUNCED') || n.includes('TBA') || n === '';
    };

    // Step 1: Group by Course Code
    const courseMap = {};

    rawRows.forEach(row => {
        const { code, name, section, instructor, time, room, building, exam } = row;

        if (!courseMap[code]) {
            courseMap[code] = {
                id: code,
                code: code,
                name: name,
                sections: {}
            };
        }

        const course = courseMap[code];

        // UNIQUE KEY: Just the section number (not instructor!)
        const sectionKey = section;

        if (!course.sections[sectionKey]) {
            course.sections[sectionKey] = {
                section: section,
                instructor: instructor,
                times: [],
                slots: [],  // Per-slot data with room/building correlation
                room: room,
                building: building,
                exam: exam
            };
        }

        const sect = course.sections[sectionKey];

        // INSTRUCTOR FIX: Prefer real instructor name over TBA
        // If current instructor is TBA but new one isn't, use the new one
        if (isTBA(sect.instructor) && !isTBA(instructor)) {
            sect.instructor = instructor;
        }

        // Add time slot if not already present, with per-slot room/building
        if (time && !sect.times.includes(time)) {
            sect.times.push(time);
            // Store per-slot data for room/building correlation
            sect.slots.push({
                time: time,
                room: room || '',
                building: building || ''
            });
        }

        // Merge room if different (for backward compatibility)
        if (room && !sect.room.includes(room)) {
            sect.room = sect.room ? `${sect.room} / ${room}` : room;
        }

        // Prefer non-empty building (take first valid one)
        if (building && !sect.building) {
            sect.building = building;
        }
    });

    // Step 2: Convert to final structure
    return Object.values(courseMap).map(course => {
        const sections = Object.values(course.sections).map(sect => ({
            section: sect.section,
            instructor: sect.instructor,
            time: sect.times.join(' | '),
            room: sect.room,
            building: sect.building,
            slots: sect.slots,  // Per-slot room/building data
            exam: sect.exam
        }));

        // Sort sections by section number
        sections.sort((a, b) => {
            const numA = parseInt(a.section) || 0;
            const numB = parseInt(b.section) || 0;
            return numA - numB;
        });

        return {
            id: course.id,
            code: course.code,
            name: course.name,
            sections: sections
        };
    });
}

function validateData(courses) {
    console.log('\\n--- Data Validation ---');

    let issueCount = 0;

    courses.forEach(course => {
        const sectionNums = course.sections.map(s => s.section);
        const uniqueSections = new Set(sectionNums);

        if (uniqueSections.size !== sectionNums.length) {
            console.warn(`WARNING: ${course.code} has duplicate section numbers!`);
            issueCount++;
        }

        course.sections.forEach(s => {
            if (!s.time) {
                console.warn(`WARNING: ${course.code} Section ${s.section} has no time!`);
                issueCount++;
            }
        });
    });

    if (issueCount === 0) {
        console.log('✓ No issues found!');
    } else {
        console.log(`Found ${issueCount} potential issues.`);
    }

    console.log('--- End Validation ---');
}

convertData();
