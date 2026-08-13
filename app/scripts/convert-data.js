import fs from 'fs';
import path from 'path';
import * as XLSX_Module from 'xlsx';
import { fileURLToPath } from 'url';

const XLSX = XLSX_Module.default || XLSX_Module;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RAW_DATA_DIR = path.join(__dirname, '../raw-data');
const OUTPUT_FILE = path.join(__dirname, '../public/data.json');

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

    // Separate tag files from main data files
    const tagFiles = excelFiles.filter(f => /elective|requirement/i.test(f));
    const mainFiles = excelFiles.filter(f => !/elective|requirement/i.test(f));

    // Build UE/UR sets from tag files
    const ueSet = new Set();
    const urSet = new Set();
    for (const file of tagFiles) {
        const filePath = path.join(RAW_DATA_DIR, file);
        console.log(`Tag source: ${file}`);
        const codes = extractCodes(filePath);
        const isUE = /elective/i.test(file);
        const target = isUE ? ueSet : urSet;
        for (const c of codes) target.add(c);
        console.log(`  -> ${codes.size} codes as ${isUE ? 'UE' : 'UR'}`);
    }

    let englishRows = [];
    let arabicRows = [];

    for (const file of mainFiles) {
        const filePath = path.join(RAW_DATA_DIR, file);
        console.log(`Processing: ${file}`);
        const { lang, rows } = readExcelFile(filePath);
        console.log(`  -> ${rows.length} rows (${lang})`);
        if (lang === 'ar') arabicRows = arabicRows.concat(rows);
        else englishRows = englishRows.concat(rows);
    }

    console.log(`Total English rows: ${englishRows.length}, Arabic rows: ${arabicRows.length}`);

    const courses = consolidateBilingual(englishRows, arabicRows, ueSet, urSet);

    validateData(courses);

    const version = Date.now().toString();
    const output = { version, courses };
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`\nData converted successfully! Saved to ${OUTPUT_FILE}`);
    console.log(`Version: ${version}`);
    console.log(`Total courses: ${courses.length}`);
    console.log(`Total sections: ${courses.reduce((acc, c) => acc + c.sections.length, 0)}`);
    console.log(`UE: ${courses.filter(c => c.category === 'UE').length}, UR: ${courses.filter(c => c.category === 'UR').length}`);
    if (arabicRows.length > 0) {
        const withAr = courses.filter(c => c.nameAr).length;
        console.log(`Bilingual: ${withAr}/${courses.length} courses have Arabic names`);
    }
}

function extractCodes(filePath) {
    try {
        const wb = XLSX.readFile(filePath);
        const sh = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sh, { header: 1 });
        let headerIdx = -1;
        let codeIdx = -1;
        for (let i = 0; i < Math.min(rows.length, 25); i++) {
            const row = rows[i];
            if (!row) continue;
            const rowStr = row.map(c => String(c).toLowerCase()).join(' ');
            const hasCode = rowStr.includes('course code') || rowStr.includes('رمز المقرر');
            if (hasCode) {
                headerIdx = i;
                row.forEach((cell, idx) => {
                    const v = String(cell).trim();
                    const lv = v.toLowerCase();
                    if (lv === 'course code' || v.includes('رمز المقرر')) codeIdx = idx;
                });
                break;
            }
        }
        if (headerIdx === -1 || codeIdx === -1) return new Set();
        const set = new Set();
        for (let i = headerIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row) continue;
            const code = String(row[codeIdx] || '').trim();
            if (code && !code.toLowerCase().includes('course')) set.add(code);
        }
        return set;
    } catch (e) {
        console.warn(`  Failed to extract codes from ${path.basename(filePath)}: ${e.message}`);
        return new Set();
    }
}

function readExcelFile(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rows.length === 0) return { lang: 'en', rows: [] };

    let headerRowIndex = -1;
    let columnIndices = {};
    let lang = 'en';

    for (let i = 0; i < Math.min(rows.length, 25); i++) {
        const row = rows[i];
        if (!row) continue;
        const rowStr = row.map(c => String(c)).join(' ');
        const lower = rowStr.toLowerCase();
        const hasEnglish = lower.includes('course code') || lower.includes('course name');
        const hasArabic = rowStr.includes('رمز المقرر') || rowStr.includes('المقرر');
        if (hasEnglish || hasArabic) {
            headerRowIndex = i;
            lang = hasArabic ? 'ar' : 'en';
            row.forEach((cell, idx) => {
                const raw = String(cell).trim();
                const val = raw.toLowerCase();
                // Normalize Arabic headers (trim spaces, handle leading spaces)
                const ar = raw; // keep original for Arabic matching
                if (lang === 'ar') {
                    if (ar.includes('الكلية')) columnIndices.college = idx;
                    else if (ar.includes('رمز المقرر')) columnIndices.code = idx;
                    else if (ar.includes('الشعبة') && !ar.includes('اونلاين') && !ar.includes('سعة')) columnIndices.section = idx;
                    else if (ar === 'المقرر' || ar.includes('المقرر') && !ar.includes('رمز')) columnIndices.name = idx;
                    else if (ar.includes('المحاضر')) columnIndices.instructor = idx;
                    else if (ar.includes('القسم')) columnIndices.department = idx;
                    else if (ar.includes('اليوم')) columnIndices.day = idx;
                    else if (ar.includes('وقت البداية')) columnIndices.from = idx;
                    else if (ar.includes('وقت النهاية')) columnIndices.to = idx;
                    else if (ar.includes('القاعة') && !ar.includes('نوع') && !ar.includes('مساحة')) columnIndices.room = idx;
                    else if (ar.includes('مبنى القاعه') || ar.includes('مبنى القاعة')) columnIndices.building = idx;
                    else if (ar.includes('تاريخ الاختبار')) columnIndices.exam = idx;
                } else {
                    if (val === 'collage' || val === 'college') columnIndices.college = idx;
                    else if (val === 'course code') columnIndices.code = idx;
                    else if (val === 'section num' || val === 'section number') columnIndices.section = idx;
                    else if (val === 'course name' || val === 'course title') columnIndices.name = idx;
                    else if (val === 'instructor') columnIndices.instructor = idx;
                    else if (val === 'department') columnIndices.department = idx;
                    else if (val === 'day') columnIndices.day = idx;
                    else if (val === 'from time' || val === 'from') columnIndices.from = idx;
                    else if (val === 'to time' || (val === 'to' && idx !== columnIndices.instructor)) columnIndices.to = idx;
                    else if (val === 'hall' || val === 'room') columnIndices.room = idx;
                    else if (val === 'building') columnIndices.building = idx;
                    else if (val.includes('exam date')) columnIndices.exam = idx;
                }
            });
            console.log(`  Headers found at row ${i} (${lang}):`, columnIndices);
            break;
        }
    }

    if (headerRowIndex === -1) {
        console.warn(`  Could not find header row in ${path.basename(filePath)}`);
        return { lang: 'en', rows: [] };
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
            college: String(row[columnIndices.college] || '').trim() || 'Other',
            department: String(row[columnIndices.department] || '').trim() || '',
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
    return { lang, rows: cleanedRows };
}

function consolidateBilingual(englishRows, arabicRows, ueSet, urSet) {
    const isTBA = (name) => {
        if (!name) return true;
        const n = name.toUpperCase();
        return n.includes('TO BE') || n.includes('ANNOUNCED') || n.includes('TBA') || n === '';
    };

    const courseMap = {};

    // Helper to ensure course exists
    const ensureCourse = (code, name, college, department, lang) => {
        if (!courseMap[code]) {
            courseMap[code] = {
                id: code,
                code: code,
                name: '',
                nameAr: '',
                college: '',
                collegeAr: '',
                department: '',
                departmentAr: '',
                category: null,
                sections: {}
            };
        }
        const c = courseMap[code];
        if (lang === 'ar') {
            if (name && !c.nameAr) c.nameAr = name;
            if (college && college !== 'Other' && !c.collegeAr) c.collegeAr = college;
            if (department && !c.departmentAr) c.departmentAr = department;
        } else {
            if (name && !c.name) c.name = name;
            if (college && college !== 'Other' && !c.college) c.college = college;
            if (department && !c.department) c.department = department;
        }
        return c;
    };

    // Process English rows first
    for (const row of englishRows) {
        const { college, department, code, name, section, instructor, time, room, building, exam } = row;
        const course = ensureCourse(code, name, college, department, 'en');
        const key = section;
        if (!course.sections[key]) {
            course.sections[key] = {
                section: section,
                instructor: instructor,
                instructorAr: '',
                times: [],
                slots: [],
                room: room,
                building: building,
                exam: exam
            };
        }
        const sect = course.sections[key];
        if (isTBA(sect.instructor) && !isTBA(instructor)) sect.instructor = instructor;
        if (time && !sect.times.includes(time)) {
            sect.times.push(time);
            sect.slots.push({ time: time, room: room || '', building: building || '' });
        }
        if (room && !sect.room.includes(room)) sect.room = sect.room ? `${sect.room} / ${room}` : room;
        if (building && !sect.building) sect.building = building;
        if (exam && !sect.exam) sect.exam = exam;
    }

    // Process Arabic rows to fill Ar fields
    for (const row of arabicRows) {
        const { college, department, code, name, section, instructor, time, room, building, exam } = row;
        const course = ensureCourse(code, name, college, department, 'ar');
        const key = section;
        if (!course.sections[key]) {
            // Section exists in Arabic but not English? Create with Ar instructor
            course.sections[key] = {
                section: section,
                instructor: '',
                instructorAr: instructor,
                times: [],
                slots: [],
                room: room,
                building: building,
                exam: exam
            };
        }
        const sect = course.sections[key];
        if (!sect.instructorAr || isTBA(sect.instructorAr)) {
            if (!isTBA(instructor)) sect.instructorAr = instructor;
        }
        // Times should already exist from English, but ensure we have slot if missing
        if (time && !sect.times.includes(time)) {
            sect.times.push(time);
            // For Arabic rows, we could store Ar slots but keep same
            sect.slots.push({ time: time, room: room || '', building: building || '' });
        }
        // Fill Ar room/building if needed (keep English as primary)
        if (room && !sect.room.includes(room) && !room.includes('هـ')) {
            // Prefer to keep English room, don't overwrite with Arabic hall prefix هـ
        }
    }

    // Assign categories via cross-reference
    for (const code of Object.keys(courseMap)) {
        if (ueSet.has(code)) courseMap[code].category = 'UE';
        else if (urSet.has(code)) courseMap[code].category = 'UR';
        else courseMap[code].category = null;
    }

    // Convert to final structure
    return Object.values(courseMap).map(course => {
        const sections = Object.values(course.sections).map(sect => ({
            section: sect.section,
            instructor: sect.instructor || 'To Be Announced',
            instructorAr: sect.instructorAr || sect.instructor || 'To Be Announced',
            time: sect.times.join(' | '),
            room: sect.room,
            building: sect.building,
            slots: sect.slots,
            exam: sect.exam
        }));
        sections.sort((a, b) => {
            const numA = parseInt(a.section) || 0;
            const numB = parseInt(b.section) || 0;
            return numA - numB;
        });
        return {
            id: course.id,
            code: course.code,
            name: course.name || course.nameAr || course.code,
            nameAr: course.nameAr || course.name || course.code,
            nameEn: course.name || course.nameAr || course.code,
            college: course.college || 'Other',
            collegeAr: course.collegeAr || course.college || 'Other',
            collegeEn: course.college || course.collegeAr || 'Other',
            department: course.department || '',
            departmentAr: course.departmentAr || course.department || '',
            departmentEn: course.department || course.departmentAr || '',
            category: course.category,
            sections: sections
        };
    });
}

function validateData(courses) {
    console.log('\n--- Data Validation ---');
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
        if (!course.nameAr) {
            // Not an error, just note
        }
    });
    if (issueCount === 0) console.log('✓ No issues found!');
    else console.log(`Found ${issueCount} potential issues.`);
    console.log('--- End Validation ---');
}

convertData();
