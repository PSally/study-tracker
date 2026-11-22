// =====================================================================
// ข้อมูลโครงสร้างหลักสูตรครบทั้ง 2 ส่วน:
// 1) สทก.ทางไกล ม.ปลาย (สถาบันการศึกษาทางไกล ระดับ ม.ปลาย — 76 หน่วยกิต)
// 2) Pre-degree ม.รามคำแหง คณะมนุษยศาสตร์ เอกภาษาญี่ปุ่น โทจิตวิทยา (พ.ศ. 2568 — 132 หน่วยกิต)
// =====================================================================

window.StudyTracker = window.StudyTracker || {};

(function (ns) {
const DEFAULT_TERMS = [
  '2/68',
  'S/68',
  '1/69',
  '2/69',
  'S/69',
  '1/70',
  '2/70',
  'S/70',
  '1/71',
  '2/71',
  'S/71',
  '1/72',
  '2/72',
];

const RU_GRADES = [
  { value: '', label: '— เกรด —', points: null, passed: false },
  { value: 'A', label: 'A (4.0)', points: 4.0, passed: true },
  { value: 'B+', label: 'B+ (3.5)', points: 3.5, passed: true },
  { value: 'B', label: 'B (3.0)', points: 3.0, passed: true },
  { value: 'C+', label: 'C+ (2.5)', points: 2.5, passed: true },
  { value: 'C', label: 'C (2.0)', points: 2.0, passed: true },
  { value: 'D+', label: 'D+ (1.5)', points: 1.5, passed: true },
  { value: 'D', label: 'D (1.0)', points: 1.0, passed: true },
  { value: 'S', label: 'S (ผ่าน)', points: null, passed: true },
  { value: 'F', label: 'F (0.0)', points: 0.0, passed: false },
];

const DEI_GRADES = [
  { value: '', label: '— เกรด —', points: null, passed: false },
  { value: '4', label: '4.0', points: 4.0, passed: true },
  { value: '3.5', label: '3.5', points: 3.5, passed: true },
  { value: '3', label: '3.0', points: 3.0, passed: true },
  { value: '2.5', label: '2.5', points: 2.5, passed: true },
  { value: '2', label: '2.0', points: 2.0, passed: true },
  { value: '1.5', label: '1.5', points: 1.5, passed: true },
  { value: '1', label: '1.0', points: 1.0, passed: true },
  { value: '0', label: '0 (ไม่ผ่าน)', points: 0.0, passed: false },
  { value: 'ขส', label: 'ขส (ขาดสอบ)', points: null, passed: false },
  { value: 'มส', label: 'มส', points: null, passed: false },
];

const COURSE_STATUSES = [
  { value: 'not_started', label: 'ยังไม่เรียน' },
  { value: 'in_progress', label: 'กำลังเรียน' },
  { value: 'passed', label: 'ผ่านแล้ว' },
  { value: 'failed', label: 'ไม่ผ่าน/รอซ่อม' },
];

// =====================================================================
// ส่วนที่ 1: สทก.ทางไกล ม.ปลาย (หลักสูตร สกร. พ.ศ. 2567 — 76 หน่วยกิต)
// วิชาบังคับ 41 หน่วยกิต (8 วิชา) + วิชาเลือกไม่น้อยกว่า 35 หน่วยกิต + กพช. 100 ชม.
// =====================================================================

const DEI_COMPULSORY_GROUPS = [
  {
    id: 'dei-compulsory-all',
    title: 'วิชาบังคับระดับมัธยมศึกษาตอนปลาย (8 รายวิชา — 41 หน่วยกิต)',
    requiredCredits: 41,
    courses: [
      {
        id: 'dei-c-1',
        code: 'ทร310001',
        name: 'ทักษะการเรียนรู้',
        credits: 5,
        defaultRecord: { status: 'not_started', grade: '', term: '', note: '' },
      },
      {
        id: 'dei-c-2',
        code: 'พท310001',
        name: 'ภาษาไทย',
        credits: 5,
        defaultRecord: { status: 'not_started', grade: '', term: '', note: '' },
      },
      {
        id: 'dei-c-3',
        code: 'พค310001',
        name: 'คณิตศาสตร์',
        credits: 5,
        defaultRecord: { status: 'passed', grade: '1', term: '2/68', note: 'กลางภาค 34 / ปลายภาค 16' },
      },
      {
        id: 'dei-c-4',
        code: 'พว310001',
        name: 'วิทยาศาสตร์',
        credits: 5,
        defaultRecord: { status: 'passed', grade: '3.5', term: '1/69', note: 'กลางภาค 47 / ปลายภาค 31' },
      },
      {
        id: 'dei-c-5',
        code: 'พต310001',
        name: 'ภาษาต่างประเทศ (ภาษาอังกฤษ)',
        credits: 5,
        defaultRecord: { status: 'in_progress', grade: '', term: '2/69', note: 'รอสอบ' },
      },
      {
        id: 'dei-c-6',
        code: 'สศ310001',
        name: 'สุขภาวะและศิลปะ',
        credits: 5,
        defaultRecord: { status: 'passed', grade: '2.5', term: '2/68', note: 'กลางภาค 40 / ปลายภาค 25' },
      },
      {
        id: 'dei-c-7',
        code: 'กอ310001',
        name: 'การงานอาชีพ',
        credits: 5,
        defaultRecord: { status: 'passed', grade: '4', term: '1/69', note: 'กลางภาค 52 / ปลายภาค 34' },
      },
      {
        id: 'dei-c-8',
        code: 'สค310001',
        name: 'สังคมศึกษา ประวัติศาสตร์และหน้าที่พลเมือง',
        credits: 6,
        defaultRecord: { status: 'in_progress', grade: '', term: '2/69', note: 'รอสอบ' },
      },
    ],
  },
];

// รายวิชาเลือก สทก.ทางไกล ม.ปลาย (ดึงตามผลการเรียนจริง 2/68, 1/69, 2/69 และเพิ่ม/แก้ไขเองได้อิสระ)
const DEI_DEFAULT_ELECTIVES = [
  {
    id: 'dei-e-1',
    code: 'สค320004',
    name: 'ต้านทุจริตศึกษา จิตพอเพียง สร้างสังคมใสสะอาด 3',
    credits: 3,
    tag: 'วิชาเลือก',
    status: 'passed',
    grade: '3.5',
    term: '2/68',
    note: 'กลางภาค 49 / ปลายภาค 29',
  },
  {
    id: 'dei-e-2',
    code: 'สค320005',
    name: 'ประวัติศาสตร์ชาติไทย 3',
    credits: 3,
    tag: 'วิชาเลือก',
    status: 'passed',
    grade: '4',
    term: '2/68',
    note: 'กลางภาค 56 / ปลายภาค 34',
  },
  {
    id: 'dei-e-3',
    code: 'สค320006',
    name: 'ภูมิศาสตร์ไทยและโลก กับภัยพิบัติทางธรรมชาติ',
    credits: 3,
    tag: 'วิชาเลือก',
    status: 'passed',
    grade: '4',
    term: '2/68',
    note: 'กลางภาค 54 / ปลายภาค 37',
  },
  {
    id: 'dei-e-4',
    code: 'สค320007',
    name: 'การเงินเพื่อชีวิต 3',
    credits: 3,
    tag: 'วิชาเลือก',
    status: 'passed',
    grade: '4',
    term: '2/68',
    note: 'กลางภาค 54 / ปลายภาค 33',
  },
  {
    id: 'dei-e-5',
    code: 'พว320005',
    name: 'พืชสมุนไพรกับการดูแลสุขภาพ',
    credits: 3,
    tag: 'วิชาเลือก',
    status: 'passed',
    grade: '4',
    term: '1/69',
    note: 'กลางภาค 60 / ปลายภาค 26',
  },
  {
    id: 'dei-e-6',
    code: 'สศ320001',
    name: 'สุขภาพและความปลอดภัยในชีวิต',
    credits: 3,
    tag: 'วิชาเลือก',
    status: 'passed',
    grade: '4',
    term: '1/69',
    note: 'กลางภาค 59 / ปลายภาค 31',
  },
  {
    id: 'dei-e-7',
    code: 'พว320012',
    name: 'วิทยาศาสตร์เพื่อสุขภาพ 3',
    credits: 3,
    tag: 'วิชาเลือก',
    status: 'passed',
    grade: '4',
    term: '1/69',
    note: 'กลางภาค 60 / ปลายภาค 35',
  },
  {
    id: 'dei-e-8',
    code: 'พต320005',
    name: 'การเขียนภาษาอังกฤษเพื่ออาชีพและการสมัครงาน',
    credits: 3,
    tag: 'วิชาเลือก',
    status: 'passed',
    grade: '4',
    term: '1/69',
    note: 'กลางภาค 60 / ปลายภาค 34',
  },
  {
    id: 'dei-e-9',
    code: 'พว320001',
    name: 'การใช้พลังงานไฟฟ้าในชีวิตประจำวัน 3',
    credits: 3,
    tag: 'วิชาเลือก',
    status: 'in_progress',
    grade: '',
    term: '2/69',
    note: 'รอสอบ',
  },
  {
    id: 'dei-e-10',
    code: 'พท320001',
    name: 'ภาษาไทยกับทักษะการเรียนรู้ 3',
    credits: 4,
    tag: 'วิชาเลือก',
    status: 'in_progress',
    grade: '',
    term: '2/69',
    note: 'รอสอบ',
  },
  {
    id: 'dei-e-11',
    code: 'พว320002',
    name: 'วัสดุศาสตร์ 3',
    credits: 3,
    tag: 'วิชาเลือก',
    status: 'in_progress',
    grade: '',
    term: '2/69',
    note: 'รอสอบ',
  },
];

const DEI_TARGETS = {
  totalCredits: 76,
  compulsoryCredits: 41,
  electiveCredits: 35,
  kpcHours: 100,
};

// =====================================================================
// ส่วนที่ 2: Pre-degree ม.รามคำแหง — คณะมนุษยศาสตร์
// เอกภาษาญี่ปุ่น (หลักสูตร พ.ศ. 2568) โทจิตวิทยา — รวม 132 หน่วยกิต
// =====================================================================

const RU_GE_GROUPS = [
  {
    id: 'ru-ge-lifelong',
    title: '1. กลุ่มวิชาพัฒนาทักษะการเรียนรู้ตลอดชีวิต (15 หน่วยกิต)',
    slots: [
      {
        id: 'ru-ge-1',
        label: 'ภาษาไทย (เลือกเรียน 1 วิชา)',
        credits: 3,
        type: 'select',
        options: [
          { code: 'RAM1101', name: 'ทักษะภาษาไทย (Thai Language Skills)' },
          { code: 'RAM1102', name: 'ภาษาไทยเพื่อการนำเสนอ (Thai for Presentations)' },
          { code: 'RAM1103', name: 'ภาษาไทยเพื่อการสื่อสารในการทำงาน (Thai for Communication at Work)' },
        ],
      },
      {
        id: 'ru-ge-2',
        label: 'ภาษาอังกฤษ (บังคับ)',
        credits: 3,
        type: 'fixed',
        code: 'RAM1111',
        name: 'ภาษาอังกฤษในชีวิตประจำวัน (English in Daily Life)',
      },
      {
        id: 'ru-ge-3',
        label: 'ภาษาและวัฒนธรรมต่างประเทศ (เลือกเรียน 1 วิชา)',
        credits: 3,
        type: 'select',
        options: [
          { code: 'RAM1112', name: 'ภาษาและวัฒนธรรมอังกฤษ (English Language and Culture)' },
          { code: 'RAM1113', name: 'ภาษาและวัฒนธรรมจีน (Chinese Language and Culture)' },
          { code: 'RAM1114', name: 'ภาษาและวัฒนธรรมญี่ปุ่น (Japanese Language and Culture)' },
          { code: 'RAM1115', name: 'ภาษาและวัฒนธรรมเกาหลี (Korean Language and Culture)' },
          { code: 'RAM1116', name: 'ภาษาและวัฒนธรรมมลายู (Malay Language and Culture)' },
          { code: 'RAM1117', name: 'ภาษาและวัฒนธรรมพม่า (Myanmar Language and Culture)' },
          { code: 'RAM1118', name: 'ภาษาและวัฒนธรรมเขมร (Khmer Language and Culture)' },
          { code: 'RAM1119', name: 'ภาษาและวัฒนธรรมเวียดนาม (Vietnamese Language and Culture)' },
          { code: 'RAM1121', name: 'ภาษาและวัฒนธรรมลาว (Laotian Language and Culture)' },
          { code: 'RAM1122', name: 'ภาษาและวัฒนธรรมอาหรับ (Arabic Language and Culture)' },
          { code: 'RAM1123', name: 'ภาษาและวัฒนธรรมอินเดีย (Hindi Language and Indian Culture)' },
          { code: 'RAM1124', name: 'ภาษาและวัฒนธรรมฝรั่งเศส (French Language and Culture)' },
          { code: 'RAM1125', name: 'ภาษาและวัฒนธรรมเยอรมัน (German Language and Culture)' },
          { code: 'RAM1126', name: 'ภาษาและวัฒนธรรมสเปน (Spanish Language and Culture)' },
          { code: 'RAM1127', name: 'ภาษาและวัฒนธรรมรัสเซีย (Russian Language and Culture)' },
          { code: 'RAM1128', name: 'ภาษาและวัฒนธรรมกรีก (Greek Language and Culture)' },
        ],
      },
      {
        id: 'ru-ge-4',
        label: 'ทักษะดิจิทัลและสารสนเทศ (เลือกเรียน 1 วิชา)',
        credits: 3,
        type: 'select',
        options: [
          { code: 'RAM1131', name: 'ความรู้เท่าทันดิจิทัล (Digital Literacy)' },
          { code: 'RAM1132', name: 'ความรู้เท่าทันสารสนเทศ (Information Literacy)' },
        ],
      },
      {
        id: 'ru-ge-5',
        label: 'พัฒนาตนเองและคุณภาพชีวิต (เลือกเรียน 1 วิชา)',
        credits: 3,
        type: 'select',
        options: [
          { code: 'RAM1141', name: 'ศาสตร์แห่งบุคลิกภาพ (Science of Personality)' },
          { code: 'RAM1142', name: 'การพัฒนาคุณภาพชีวิตและสังคม (Quality of Life and Society Development)' },
        ],
      },
    ],
  },
  {
    id: 'ru-ge-innovation',
    title: '2. กลุ่มวิชาพัฒนาทักษะการเป็นผู้สร้างสรรค์นวัตกรรม (6 หน่วยกิต)',
    slots: [
      {
        id: 'ru-ge-6',
        label: 'ความคิดสร้างสรรค์และวิทยาศาสตร์การคิด (เลือกเรียน 1 วิชา)',
        credits: 3,
        type: 'select',
        options: [
          { code: 'RAM1201', name: 'ความคิดสร้างสรรค์เพื่อการพัฒนานวัตกรรม (Creativity for Innovation Development)' },
          { code: 'RAM1202', name: 'ศิลปะสร้างสรรค์ (Creativity Arts)' },
          { code: 'RAM1203', name: 'ศาสตร์แห่งการคิดที่เปลี่ยนโลก (Thinking Science that Changes the World)' },
          { code: 'RAM1204', name: 'คณิตศาสตร์และสถิติในชีวิตประจำวันในโลกสมัยใหม่ (Mathematics and Statistics for Daily Life)' },
        ],
      },
      {
        id: 'ru-ge-7',
        label: 'ผู้ประกอบการและนวัตกรรม (เลือกเรียน 1 วิชา)',
        credits: 3,
        type: 'select',
        options: [
          { code: 'RAM1211', name: 'หลักการเป็นผู้ประกอบการ (Principles of Entrepreneurship)' },
          { code: 'RAM1212', name: 'ผู้ประกอบการอัจฉริยะ (Smart Entrepreneurs)' },
          { code: 'RAM1213', name: 'ภูมิปัญญาท้องถิ่นและการพัฒนานวัตกรรมเพื่อสังคมและเศรษฐกิจ (Local Wisdom and Innovation)' },
          { code: 'RAM1214', name: 'วิทยาศาสตร์ เทคโนโลยี และนวัตกรรม เพื่อโมเดลเศรษฐกิจ BCG (STI for The BCG Economy Model)' },
        ],
      },
    ],
  },
  {
    id: 'ru-ge-citizen',
    title: '3. กลุ่มวิชาพัฒนาทักษะการเป็นพลเมืองที่เข้มแข็ง (9 หน่วยกิต)',
    slots: [
      {
        id: 'ru-ge-8',
        label: 'คุณธรรมคู่ความรู้ (บังคับ)',
        credits: 3,
        type: 'fixed',
        code: 'RAM1301',
        altCode: 'RAM1000',
        name: 'คุณธรรมคู่ความรู้ (Morality and Knowledge)',
      },
      {
        id: 'ru-ge-9',
        label: 'การเมือง กฎหมาย และความยั่งยืน (เลือกเรียน 1 วิชา)',
        credits: 3,
        type: 'select',
        options: [
          { code: 'RAM1302', name: 'การเมืองและกฎหมายในชีวิตประจำวัน (Politics and Law in Daily Life)' },
          { code: 'RAM1303', name: 'วิทยาศาสตร์เพื่อการพัฒนาที่ยั่งยืน (Science for Sustainable Development)' },
        ],
      },
      {
        id: 'ru-ge-10',
        label: 'ศิลปวัฒนธรรมและสังคมร่วมสมัย (เลือกเรียน 1 วิชา)',
        credits: 3,
        type: 'select',
        options: [
          { code: 'RAM1311', name: 'ศิลปวัฒนธรรมท้องถิ่นไทย (Thai Local Art and Culture)' },
          { code: 'RAM1312', name: 'วัฒนธรรมร่วมสมัยและการพลิกผันทางดิจิทัล (Contemporary Culture and Digital Disruption)' },
        ],
      },
    ],
  },
];

// วิชาเอกบังคับภาษาญี่ปุ่น 51 หน่วยกิต (17 กระบวนวิชา ตามระเบียบการ พ.ศ. 2568 หน้า 183 & 213)
const RU_MAJOR_COMPULSORY = [
  { id: 'ru-mc-1', code: 'JPN1011', name: 'ภาษาญี่ปุ่นชั้นต้น 1', enName: 'Basic Japanese 1', credits: 3, prereqMark: '' },
  { id: 'ru-mc-2', code: 'JPN1012', name: 'ภาษาญี่ปุ่นชั้นต้น 2', enName: 'Basic Japanese 2', credits: 3, prereqMark: '**' },
  { id: 'ru-mc-3', code: 'JPN1201', altCode: 'JPN1211, JPN2201', name: 'วัฒนธรรมและสังคมญี่ปุ่น', enName: 'Japanese Culture and Society', credits: 3, prereqMark: '**' },
  { id: 'ru-mc-4', code: 'JPN2011', name: 'ภาษาญี่ปุ่นชั้นต้น 3', enName: 'Basic Japanese 3', credits: 3, prereqMark: '**' },
  { id: 'ru-mc-5', code: 'JPN2012', name: 'ภาษาญี่ปุ่นชั้นต้น 4', enName: 'Basic Japanese 4', credits: 3, prereqMark: '**' },
  { id: 'ru-mc-6', code: 'JPN2111', name: 'การฟังและการพูดภาษาญี่ปุ่น 1', enName: 'Japanese Listening and Speaking 1', credits: 3, prereqMark: '**' },
  { id: 'ru-mc-7', code: 'JPN2131', name: 'การอ่านภาษาญี่ปุ่นชั้นต้น', enName: 'Basic Japanese Reading', credits: 3, prereqMark: '**' },
  { id: 'ru-mc-8', code: 'JPN2141', name: 'การเขียนภาษาญี่ปุ่นชั้นต้น', enName: 'Basic Japanese Writing', credits: 3, prereqMark: '**' },
  { id: 'ru-mc-9', code: 'JPN2211', altCode: 'JPN3211', name: 'วรรณคดีญี่ปุ่น', enName: 'Japanese Literature', credits: 3, prereqMark: '**' },
  { id: 'ru-mc-10', code: 'JPN3111', name: 'ภาษาญี่ปุ่นชั้นกลาง 1', enName: 'Intermediate Japanese 1', credits: 3, prereqMark: '**' },
  { id: 'ru-mc-11', code: 'JPN3112', name: 'ภาษาญี่ปุ่นชั้นกลาง 2', enName: 'Intermediate Japanese 2', credits: 3, prereqMark: '**' },
  { id: 'ru-mc-12', code: 'JPN3121', name: 'การสนทนาภาษาญี่ปุ่นชั้นกลาง 1', enName: 'Intermediate Japanese Conversation 1', credits: 3, prereqMark: '**' },
  { id: 'ru-mc-13', code: 'JPN3131', name: 'การอ่านภาษาญี่ปุ่นชั้นกลาง 1', enName: 'Intermediate Japanese Reading 1', credits: 3, prereqMark: '**' },
  { id: 'ru-mc-14', code: 'JPN3141', name: 'การเขียนภาษาญี่ปุ่นชั้นกลาง 1', enName: 'Intermediate Japanese Writing 1', credits: 3, prereqMark: '**' },
  { id: 'ru-mc-15', code: 'JPN4111', name: 'ภาษาญี่ปุ่นชั้นกลาง - สูง', enName: 'Intermediate - Advanced Japanese', credits: 3, prereqMark: '**' },
  { id: 'ru-mc-16', code: 'JPN4121', name: 'การสนทนาภาษาญี่ปุ่นชั้นกลาง 2', enName: 'Intermediate Japanese Conversation 2', credits: 3, prereqMark: '**' },
  { id: 'ru-mc-17', code: 'JPN4131', name: 'การอ่านภาษาญี่ปุ่นชั้นกลาง 2', enName: 'Intermediate Japanese Reading 2', credits: 3, prereqMark: '' },
];

// คลังวิชาเอกเลือกภาษาญี่ปุ่น (เลือก 9 วิชา / 27 หน่วยกิต จาก 3 หมวด ตามหน้า 183–184)
const RU_MAJOR_ELECTIVE_CATALOG = [
  // หมวดวิชาภาษาและการใช้ภาษาญี่ปุ่น
  { code: 'JPN2110', altCode: 'JPN1111', category: 'หมวดภาษาและการใช้ภาษาญี่ปุ่น', name: 'การออกเสียงภาษาญี่ปุ่น (Japanese Pronunciation)', prereqMark: '**' },
  { code: 'JPN2113', category: 'หมวดภาษาและการใช้ภาษาญี่ปุ่น', name: 'คันจิศึกษา (Kanji Studies)', prereqMark: '**' },
  { code: 'JPN3108', category: 'หมวดภาษาและการใช้ภาษาญี่ปุ่น', name: 'ภาษาศาสตร์ภาษาญี่ปุ่นเบื้องต้น (Introduction to Japanese Linguistics)', prereqMark: '' },
  { code: 'JPN3142', category: 'หมวดภาษาและการใช้ภาษาญี่ปุ่น', name: 'การเขียนภาษาญี่ปุ่นชั้นกลาง 2 (Intermediate Japanese Writing 2)', prereqMark: '*' },
  { code: 'JPN4112', altCode: 'JPN4102', category: 'หมวดภาษาและการใช้ภาษาญี่ปุ่น', name: 'ภาษาญี่ปุ่นจากสื่อในยุคปัจจุบัน (Japanese from Modern Media)', prereqMark: '**' },
  { code: 'JPN4122', category: 'หมวดภาษาและการใช้ภาษาญี่ปุ่น', name: 'การอภิปรายภาษาญี่ปุ่น (Japanese Discussion)', prereqMark: '**' },
  { code: 'JPN4141', category: 'หมวดภาษาและการใช้ภาษาญี่ปุ่น', name: 'การเขียนรายงานภาษาญี่ปุ่น (Japanese Report Writing)', prereqMark: '**' },
  // หมวดวิชาสังคม วัฒนธรรมและวรรณคดีญี่ปุ่น
  { code: 'JPN3201', category: 'หมวดสังคม วัฒนธรรมและวรรณคดีญี่ปุ่น', name: 'ภาษากับสังคมญี่ปุ่น (Language and Japanese Society)', prereqMark: '*' },
  { code: 'JPN3202', category: 'หมวดสังคม วัฒนธรรมและวรรณคดีญี่ปุ่น', name: 'เรื่องสั้นญี่ปุ่น (Japanese Short Stories)', prereqMark: '' },
  { code: 'JPN4214', altCode: 'JPN4213', category: 'หมวดสังคม วัฒนธรรมและวรรณคดีญี่ปุ่น', name: 'วรรณกรรมญี่ปุ่นร่วมสมัย (Contemporary Japanese Literature)', prereqMark: '**' },
  // หมวดวิชาภาษาญี่ปุ่นวิชาชีพ
  { code: 'JPN3301', category: 'หมวดภาษาญี่ปุ่นวิชาชีพ', name: 'ภาษาญี่ปุ่นธุรกิจ 1 (Business Japanese 1)', prereqMark: '*' },
  { code: 'JPN3302', category: 'หมวดภาษาญี่ปุ่นวิชาชีพ', name: 'ภาษาญี่ปุ่นเพื่อการโรงแรม (Japanese for Hotel)', prereqMark: '**' },
  { code: 'JPN4301', category: 'หมวดภาษาญี่ปุ่นวิชาชีพ', name: 'การแปลภาษาญี่ปุ่น 1 (Japanese Translation 1)', prereqMark: '**' },
  { code: 'JPN4302', category: 'หมวดภาษาญี่ปุ่นวิชาชีพ', name: 'การแปลภาษาญี่ปุ่น 2 (Japanese Translation 2)', prereqMark: '**' },
  { code: 'JPN4303', category: 'หมวดภาษาญี่ปุ่นวิชาชีพ', name: 'การแปลภาษาญี่ปุ่นแบบล่าม (Japanese Interpretation)', prereqMark: '' },
  { code: 'JPN4304', category: 'หมวดภาษาญี่ปุ่นวิชาชีพ', name: 'ภาษาญี่ปุ่นธุรกิจ 2 (Business Japanese 2)', prereqMark: '**' },
  { code: 'JPN4305', category: 'หมวดภาษาญี่ปุ่นวิชาชีพ', name: 'ภาษาญี่ปุ่นเพื่อการท่องเที่ยว (Japanese for Tourism)', prereqMark: '**' },
  { code: 'JPN4306', category: 'หมวดภาษาญี่ปุ่นวิชาชีพ', name: 'การสอนภาษาญี่ปุ่นในฐานะภาษาต่างประเทศ (Teaching Japanese as a Foreign Language)', prereqMark: '**' },
];

const RU_MAJOR_ELECTIVE_SLOTS = Array.from({ length: 9 }, (_, i) => ({
  id: `ru-me-${i + 1}`,
  label: `วิชาเอกเลือก #${i + 1}`,
  credits: 3,
}));

// คลังวิชาโทจิตวิทยา ม.รามคำแหง (18 หน่วยกิต / 6 วิชา — สามารถพิมพ์วิชา PSY อื่นเพิ่มเองได้ทุกช่อง)
const RU_MINOR_PSY_CATALOG = [
  { code: 'PSY1001', group: 'พื้นฐาน/แนะนำ', name: 'จิตวิทยาทั่วไป (General Psychology)' },
  { code: 'PSY2002', group: 'โทบังคับจิตวิทยา', name: 'จิตวิทยาบุคลิกภาพและการปรับตัว (Psychology of Personality and Adjustment)' },
  { code: 'PSY2005', group: 'โทบังคับจิตวิทยา', name: 'จิตวิทยาสังคมเบื้องต้น (Introduction to Social Psychology)' },
  { code: 'PSY2006', group: 'โทบังคับจิตวิทยา', name: 'จิตวิทยาพัฒนาการ (Developmental Psychology)' },
  { code: 'PSY2201', group: 'โทเลือกจิตวิทยา', name: 'จิตวิทยาการแนะแนวและการปรึกษาเบื้องต้น (Guidance & Counseling Psychology)' },
  { code: 'PSY2202', group: 'โทเลือกจิตวิทยา', name: 'เทคนิคการแนะแนว (Techniques in Guidance)' },
  { code: 'PSY2401', group: 'โทเลือกจิตวิทยา', name: 'จิตวิทยาอุตสาหกรรมและองค์การเบื้องต้น (Industrial & Organizational Psychology)' },
  { code: 'PSY2004', group: 'โทเลือกจิตวิทยา', name: 'จิตวิทยาการเรียนรู้ (Psychology of Learning)' },
  { code: 'PSY2007', group: 'โทเลือกจิตวิทยา', name: 'จิตวิทยาอปกติ (Abnormal Psychology)' },
  { code: 'PSY2008', group: 'โทเลือกจิตวิทยา', name: 'สุขภาพจิต (Mental Health)' },
  { code: 'PSY3001', group: 'โทเลือกจิตวิทยา', name: 'จิตวิทยาครอบครัว (Family Psychology)' },
];

const RU_MINOR_SLOTS = Array.from({ length: 6 }, (_, i) => ({
  id: `ru-minor-${i + 1}`,
  label: `วิชาโทจิตวิทยา #${i + 1}`,
  credits: 3,
}));

const RU_FREE_ELECTIVE_SLOTS = Array.from({ length: 2 }, (_, i) => ({
  id: `ru-free-${i + 1}`,
  label: `วิชาเลือกเสรี #${i + 1}`,
  credits: 3,
}));

const RU_TARGETS = {
  totalCredits: 132,
  geCredits: 30,
  majorCompulsoryCredits: 51,
  majorElectiveCredits: 27,
  minorCredits: 18,
  freeElectiveCredits: 6,
};

// แผนการเรียนแนะนำ 4 ปี จากระเบียบการหน้า 158
const RU_SUGGESTED_PLAN = [
  {
    year: 'ปีที่ 1 ภาคเรียนที่ 1 (21 นก.)',
    items: [
      'RAM1111 English in Daily Life (3)',
      'RAM1101 / 1102 / 1103 เลือก 1 วิชา (3)',
      'RAM1131 / 1132 เลือก 1 วิชา (3)',
      'RAM1141 / 1142 เลือก 1 วิชา (3)',
      'RAM1201–1204 เลือก 1 วิชา (3)',
      'JPN1011 Basic Japanese 1 (3)',
      'JPN1201 Japanese Culture and Society (3)',
    ],
  },
  {
    year: 'ปีที่ 1 ภาคเรียนที่ 2 (21 นก.)',
    items: [
      'RAM11xx Language and Culture (3)',
      'RAM1211–1214 เลือก 1 วิชา (3)',
      'RAM1301 Morality and Knowledge (3)',
      'RAM1302 / 1303 เลือก 1 วิชา (3)',
      'RAM1311 / 1312 เลือก 1 วิชา (3)',
      'JPN1012 Basic Japanese 2 (3)',
      'วิชาโทจิตวิทยา 1 วิชา (3)',
    ],
  },
  {
    year: 'ปีที่ 2 ภาคเรียนที่ 1 (15 นก.)',
    items: [
      'JPN2011 Basic Japanese 3 (3)',
      'JPN2111 Japanese Listening and Speaking 1 (3)',
      'JPN2211 Japanese Literature (3)',
      'วิชาโทจิตวิทยา 1 วิชา (3)',
      'วิชาเลือกเสรี 1 วิชา (3)',
    ],
  },
  {
    year: 'ปีที่ 2 ภาคเรียนที่ 2 (15 นก.)',
    items: [
      'JPN2012 Basic Japanese 4 (3)',
      'JPN2131 Basic Japanese Reading (3)',
      'JPN2141 Basic Japanese Writing (3)',
      'วิชาเอกเลือก 1 วิชา (3)',
      'วิชาโทจิตวิทยา 1 วิชา (3)',
    ],
  },
  {
    year: 'ปีที่ 3 ภาคเรียนที่ 1 (15 นก.)',
    items: [
      'JPN3111 Intermediate Japanese 1 (3)',
      'JPN3121 Intermediate Japanese Conversation 1 (3)',
      'JPN3131 Intermediate Japanese Reading 1 (3)',
      'วิชาเอกเลือก 2 วิชา (6)',
    ],
  },
  {
    year: 'ปีที่ 3 ภาคเรียนที่ 2 (15 นก.)',
    items: [
      'JPN3112 Intermediate Japanese 2 (3)',
      'JPN3141 Intermediate Japanese Writing 1 (3)',
      'วิชาเอกเลือก 2 วิชา (6)',
      'วิชาโทจิตวิทยา 1 วิชา (3)',
    ],
  },
  {
    year: 'ปีที่ 4 ภาคเรียนที่ 1 (15 นก.)',
    items: [
      'JPN4111 Intermediate - Advanced Japanese (3)',
      'JPN4121 Intermediate Japanese Conversation 2 (3)',
      'JPN4131 Intermediate Japanese Reading 2 (3)',
      'วิชาเอกเลือก 1–2 วิชา (ตามแผนรวม 9 วิชา)',
    ],
  },
  {
    year: 'ปีที่ 4 ภาคเรียนที่ 2 (15 นก.)',
    items: [
      'วิชาเอกเลือก 2 วิชา (6)',
      'วิชาโทจิตวิทยา 2 วิชา (6)',
      'วิชาเลือกเสรี 1 วิชา (3)',
    ],
  },
];

ns.Curriculum = {
  DEFAULT_TERMS,
  RU_GRADES,
  DEI_GRADES,
  COURSE_STATUSES,
  DEI_COMPULSORY_GROUPS,
  DEI_DEFAULT_ELECTIVES,
  DEI_TARGETS,
  RU_GE_GROUPS,
  RU_MAJOR_COMPULSORY,
  RU_MAJOR_ELECTIVE_CATALOG,
  RU_MAJOR_ELECTIVE_SLOTS,
  RU_MINOR_PSY_CATALOG,
  RU_MINOR_SLOTS,
  RU_FREE_ELECTIVE_SLOTS,
  RU_TARGETS,
  RU_SUGGESTED_PLAN,
};
})(window.StudyTracker);
