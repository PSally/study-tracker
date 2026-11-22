(function (ns) {
const {
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
} = ns.Curriculum;
const { StorageService } = ns;
const MakeupSchedule = ns.MakeupSchedule || {
  MAKEUP_TERM_LABEL: 'ซ.1/2569 (21–26 ม.ค. 2570)',
  MAKEUP_RE169: {},
  parseMakeupSlot: () => null,
};

const storage = new StorageService();

// ================= HELPERS =================
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function getGradeMeta(gradeList, gradeVal) {
  return gradeList.find((g) => g.value === gradeVal) || gradeList[0];
}

function formatGpa(val) {
  if (val === null || Number.isNaN(val)) return '—';
  return val.toFixed(2);
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function clampPct(val, max) {
  if (!max) return 0;
  return Math.min(100, Math.round((val / max) * 100));
}

// ================= DEFAULT STATE =================
function createDefaultState() {
  const deiCompulsory = {};
  DEI_COMPULSORY_GROUPS.forEach((g) => {
    g.courses.forEach((c) => {
      deiCompulsory[c.id] = {
        status: 'not_started',
        grade: '',
        term: '',
        note: '',
        ...(c.defaultRecord || {}),
      };
    });
  });

  const ruGe = {};
  RU_GE_GROUPS.forEach((g) => {
    g.slots.forEach((s) => {
      ruGe[s.id] = {
        selectedCode: s.type === 'fixed' ? s.code : '',
        status: 'not_started',
        grade: '',
        term: '',
        note: '',
      };
    });
  });

  const ruMajorCompulsory = {};
  RU_MAJOR_COMPULSORY.forEach((c) => {
    ruMajorCompulsory[c.id] = { status: 'not_started', grade: '', term: '', note: '' };
  });

  const ruMajorElective = {};
  RU_MAJOR_ELECTIVE_SLOTS.forEach((s) => {
    ruMajorElective[s.id] = {
      selectedCode: '',
      customCode: '',
      customName: '',
      status: 'not_started',
      grade: '',
      term: '',
      note: '',
    };
  });

  const ruMinor = {};
  RU_MINOR_SLOTS.forEach((s) => {
    ruMinor[s.id] = {
      selectedCode: '',
      customCode: '',
      customName: '',
      status: 'not_started',
      grade: '',
      term: '',
      note: '',
    };
  });

  const ruFree = {};
  RU_FREE_ELECTIVE_SLOTS.forEach((s) => {
    ruFree[s.id] = {
      customCode: '',
      customName: '',
      status: 'not_started',
      grade: '',
      term: '',
      note: '',
    };
  });

  return {
    version: 2,
    profile: {
      name: '',
      deiStudentId: '',
      ruStudentId: '',
      startTerm: '2/68',
    },
    terms: [...DEFAULT_TERMS],
    events: [],
    dei: {
      compulsory: deiCompulsory,
      electives: DEI_DEFAULT_ELECTIVES.map((e) => ({ ...e })),
      kpcLogs: [],
      ethicsPassed: false,
      nnetPassed: false,
    },
    ru: {
      ge: ruGe,
      majorCompulsory: ruMajorCompulsory,
      majorElective: ruMajorElective,
      minor: ruMinor,
      freeElective: ruFree,
    },
  };
}

function normalizeState(raw) {
  const base = createDefaultState();
  if (!raw || typeof raw !== 'object') return base;

  const isLegacyV1 = !raw.version || Number(raw.version) < 2;

  const merged = {
    ...base,
    version: 2,
    profile: { ...base.profile, ...(raw.profile || {}) },
    terms: Array.isArray(raw.terms) && raw.terms.length > 0 ? raw.terms : base.terms,
    events: Array.isArray(raw.events) ? raw.events : [],
    dei: {
      compulsory: { ...base.dei.compulsory },
      electives: isLegacyV1
        ? base.dei.electives
        : (Array.isArray(raw.dei?.electives) ? raw.dei.electives : base.dei.electives),
      kpcLogs: Array.isArray(raw.dei?.kpcLogs) ? raw.dei.kpcLogs : [],
      ethicsPassed: Boolean(raw.dei?.ethicsPassed),
      nnetPassed: Boolean(raw.dei?.nnetPassed),
    },
    ru: {
      ge: { ...base.ru.ge },
      majorCompulsory: { ...base.ru.majorCompulsory },
      majorElective: { ...base.ru.majorElective },
      minor: { ...base.ru.minor },
      freeElective: { ...base.ru.freeElective },
    },
  };

  if (!isLegacyV1) {
    Object.keys(base.dei.compulsory).forEach((id) => {
      if (raw.dei?.compulsory?.[id]) {
        merged.dei.compulsory[id] = { ...base.dei.compulsory[id], ...raw.dei.compulsory[id] };
      }
    });
  } else {
    merged._migratedToV2 = true;
  }
  Object.keys(base.ru.ge).forEach((id) => {
    if (raw.ru?.ge?.[id]) {
      merged.ru.ge[id] = { ...base.ru.ge[id], ...raw.ru.ge[id] };
    }
  });
  // Ensure fixed GE codes always stay locked
  RU_GE_GROUPS.forEach((g) => {
    g.slots.forEach((s) => {
      if (s.type === 'fixed') merged.ru.ge[s.id].selectedCode = s.code;
    });
  });

  Object.keys(base.ru.majorCompulsory).forEach((id) => {
    if (raw.ru?.majorCompulsory?.[id]) {
      merged.ru.majorCompulsory[id] = { ...base.ru.majorCompulsory[id], ...raw.ru.majorCompulsory[id] };
    }
  });
  Object.keys(base.ru.majorElective).forEach((id) => {
    if (raw.ru?.majorElective?.[id]) {
      merged.ru.majorElective[id] = { ...base.ru.majorElective[id], ...raw.ru.majorElective[id] };
    }
  });
  Object.keys(base.ru.minor).forEach((id) => {
    if (raw.ru?.minor?.[id]) {
      merged.ru.minor[id] = { ...base.ru.minor[id], ...raw.ru.minor[id] };
    }
  });
  Object.keys(base.ru.freeElective).forEach((id) => {
    if (raw.ru?.freeElective?.[id]) {
      merged.ru.freeElective[id] = { ...base.ru.freeElective[id], ...raw.ru.freeElective[id] };
    }
  });

  return merged;
}

// ================= APP RUNTIME STATE =================
let state = createDefaultState();
let pendingLocalDraft = null;
let saveTimer = null;
let lastSyncError = '';

const ui = {
  activeTab: 'overview',
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  calSelected: '',
  makeupSearch: '',
  makeupScope: 'failed_or_active',
  deiStatusFilter: 'all',
  deiSearch: '',
  ruCategoryFilter: 'all',
  ruStatusFilter: 'all',
  ruSearch: '',
  termProgramFilter: 'all',
  showEmptyTerms: false,
};

// ================= METRICS & AGGREGATIONS =================
function getAllDeiCourses() {
  const list = [];
  DEI_COMPULSORY_GROUPS.forEach((g) => {
    g.courses.forEach((c) => {
      const rec = state.dei.compulsory[c.id];
      list.push({
        program: 'dei',
        kind: 'compulsory',
        groupTitle: g.title,
        id: c.id,
        code: c.code,
        name: c.name,
        credits: c.credits,
        ...rec,
      });
    });
  });
  state.dei.electives.forEach((e) => {
    list.push({
      program: 'dei',
      kind: 'elective',
      groupTitle: `วิชาเลือก (${e.tag || 'เลือกเสรี'})`,
      id: e.id,
      code: e.code || '—',
      name: e.name || 'ยังไม่ระบุชื่อวิชา',
      credits: Number(e.credits) || 0,
      status: e.status || 'not_started',
      grade: e.grade || '',
      term: e.term || '',
      note: e.note || '',
    });
  });
  return list;
}

function resolveRuSlotDisplay(category, slotDef, rec) {
  if (category === 'ge') {
    if (slotDef.type === 'fixed') {
      return { code: slotDef.code, name: slotDef.name, altCode: slotDef.altCode || '' };
    }
    const found = slotDef.options.find((o) => o.code === rec.selectedCode);
    if (found) return { code: found.code, name: found.name, altCode: '' };
    return { code: 'ยังไม่เลือก', name: slotDef.label, altCode: '' };
  }
  if (category === 'majorCompulsory') {
    return { code: slotDef.code, name: `${slotDef.name} (${slotDef.enName})`, altCode: slotDef.altCode || '' };
  }
  if (category === 'majorElective') {
    if (rec.selectedCode === '__CUSTOM__') {
      return { code: rec.customCode || 'JPNXXXX', name: rec.customName || 'วิชาเอกเลือก (กำหนดเอง)', altCode: '' };
    }
    const found = RU_MAJOR_ELECTIVE_CATALOG.find((c) => c.code === rec.selectedCode);
    if (found) return { code: found.code, name: found.name, altCode: found.altCode || '' };
    return { code: 'JPNXXXX', name: slotDef.label, altCode: '' };
  }
  if (category === 'minor') {
    if (rec.selectedCode === '__CUSTOM__') {
      return { code: rec.customCode || 'PSYXXXX', name: rec.customName || 'วิชาโทจิตวิทยา (กำหนดเอง)', altCode: '' };
    }
    const found = RU_MINOR_PSY_CATALOG.find((c) => c.code === rec.selectedCode);
    if (found) return { code: found.code, name: found.name, altCode: '' };
    return { code: 'PSYXXXX', name: slotDef.label, altCode: '' };
  }
  return {
    code: rec.customCode || 'เลือกเสรี',
    name: rec.customName || slotDef.label,
    altCode: '',
  };
}

function getAllRuCourses() {
  const list = [];
  RU_GE_GROUPS.forEach((g) => {
    g.slots.forEach((s) => {
      const rec = state.ru.ge[s.id];
      const disp = resolveRuSlotDisplay('ge', s, rec);
      list.push({
        program: 'ru',
        kind: 'ge',
        groupTitle: 'ศึกษาทั่วไป',
        id: s.id,
        code: disp.code,
        name: disp.name,
        credits: s.credits,
        ...rec,
      });
    });
  });
  RU_MAJOR_COMPULSORY.forEach((c) => {
    const rec = state.ru.majorCompulsory[c.id];
    const disp = resolveRuSlotDisplay('majorCompulsory', c, rec);
    list.push({
      program: 'ru',
      kind: 'majorCompulsory',
      groupTitle: 'เอกบังคับ (ญี่ปุ่น)',
      id: c.id,
      code: disp.code,
      name: disp.name,
      credits: c.credits,
      ...rec,
    });
  });
  RU_MAJOR_ELECTIVE_SLOTS.forEach((s) => {
    const rec = state.ru.majorElective[s.id];
    const disp = resolveRuSlotDisplay('majorElective', s, rec);
    list.push({
      program: 'ru',
      kind: 'majorElective',
      groupTitle: 'เอกเลือก (ญี่ปุ่น)',
      id: s.id,
      code: disp.code,
      name: disp.name,
      credits: s.credits,
      ...rec,
    });
  });
  RU_MINOR_SLOTS.forEach((s) => {
    const rec = state.ru.minor[s.id];
    const disp = resolveRuSlotDisplay('minor', s, rec);
    list.push({
      program: 'ru',
      kind: 'minor',
      groupTitle: 'โทจิตวิทยา',
      id: s.id,
      code: disp.code,
      name: disp.name,
      credits: s.credits,
      ...rec,
    });
  });
  RU_FREE_ELECTIVE_SLOTS.forEach((s) => {
    const rec = state.ru.freeElective[s.id];
    const disp = resolveRuSlotDisplay('freeElective', s, rec);
    list.push({
      program: 'ru',
      kind: 'freeElective',
      groupTitle: 'เลือกเสรี',
      id: s.id,
      code: disp.code,
      name: disp.name,
      credits: s.credits,
      ...rec,
    });
  });
  return list;
}

function calcGpaFromCourses(courses, gradeList) {
  let totalPoints = 0;
  let totalCredits = 0;
  courses.forEach((c) => {
    const meta = getGradeMeta(gradeList, c.grade);
    if (meta && meta.points !== null && c.credits > 0) {
      totalPoints += meta.points * c.credits;
      totalCredits += c.credits;
    }
  });
  return totalCredits > 0 ? totalPoints / totalCredits : null;
}

function calcDeiStats() {
  const courses = getAllDeiCourses();
  let compPassed = 0;
  let elecPassed = 0;
  let inProgress = 0;
  let passedCount = 0;

  courses.forEach((c) => {
    if (c.status === 'passed') {
      passedCount += 1;
      if (c.kind === 'compulsory') compPassed += c.credits;
      else elecPassed += c.credits;
    } else if (c.status === 'in_progress') {
      inProgress += c.credits;
    }
  });

  const kpcHours = state.dei.kpcLogs.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);
  const totalPassed = compPassed + elecPassed;
  const gpa = calcGpaFromCourses(courses, DEI_GRADES);

  return {
    compPassed,
    elecPassed,
    totalPassed,
    inProgress,
    passedCount,
    kpcHours,
    gpa,
  };
}

function calcRuStats() {
  const courses = getAllRuCourses();
  const byKind = {
    ge: 0,
    majorCompulsory: 0,
    majorElective: 0,
    minor: 0,
    freeElective: 0,
  };
  let inProgress = 0;
  let passedCount = 0;

  courses.forEach((c) => {
    if (c.status === 'passed') {
      passedCount += 1;
      byKind[c.kind] += c.credits;
    } else if (c.status === 'in_progress') {
      inProgress += c.credits;
    }
  });

  const totalPassed =
    byKind.ge + byKind.majorCompulsory + byKind.majorElective + byKind.minor + byKind.freeElective;
  const gpa = calcGpaFromCourses(courses, RU_GRADES);

  return {
    ...byKind,
    totalPassed,
    inProgress,
    passedCount,
    gpa,
  };
}

function findDuplicateCodes(slotMap) {
  const counts = {};
  Object.values(slotMap).forEach((rec) => {
    const code = rec.selectedCode === '__CUSTOM__'
      ? (rec.customCode || '').trim().toUpperCase()
      : (rec.selectedCode || '').trim().toUpperCase();
    if (code) {
      counts[code] = (counts[code] || 0) + 1;
    }
  });
  return new Set(Object.keys(counts).filter((k) => counts[k] > 1));
}

// ================= PERSISTENCE & SYNC UI =================
function setSyncBadge(mode, text) {
  const pill = document.getElementById('sync-pill');
  const label = document.getElementById('sync-label');
  if (!pill || !label) return;
  pill.className = `sync-pill ${mode}`;
  label.textContent = text;
}

function scheduleSave() {
  updateTabChips();
  setSyncBadge('saving', 'กำลังบันทึก...');
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const res = await storage.saveState(state);
      lastSyncError = '';
      const t = formatTime(res.updatedAt);
      if (res.source === 'cloud') {
        setSyncBadge('cloud', `บันทึกบน Supabase แล้ว ✓ ${t}`);
      } else {
        setSyncBadge('local', `บันทึกในเครื่องแล้ว (${t})`);
      }
    } catch (err) {
      console.error(err);
      lastSyncError = err.message || String(err);
      setSyncBadge('error', 'บันทึกไม่สำเร็จ — คลิกดูรายละเอียด');
      showToast(lastSyncError);
    }
  }, 600);
}

let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

function updateTabChips() {
  const dei = calcDeiStats();
  const ru = calcRuStats();
  const chipDei = document.getElementById('chip-dei');
  const chipRu = document.getElementById('chip-ru');
  if (chipDei) chipDei.textContent = `${dei.totalPassed}/${DEI_TARGETS.totalCredits}`;
  if (chipRu) chipRu.textContent = `${ru.totalPassed}/${RU_TARGETS.totalCredits}`;
  const chipCal = document.getElementById('chip-cal');
  if (chipCal) chipCal.textContent = String(upcomingEvents().length);
}

// ================= RENDER HELPERS =================
function buildTermOptionsHtml(selectedTerm) {
  let html = `<option value="">— เทอม —</option>`;
  state.terms.forEach((t) => {
    const sel = t === selectedTerm ? 'selected' : '';
    html += `<option value="${escapeHtml(t)}" ${sel}>${escapeHtml(t)}</option>`;
  });
  if (selectedTerm && !state.terms.includes(selectedTerm)) {
    html += `<option value="${escapeHtml(selectedTerm)}" selected>${escapeHtml(selectedTerm)}</option>`;
  }
  return html;
}

function buildGradeOptionsHtml(gradeList, selectedGrade) {
  return gradeList
    .map((g) => `<option value="${escapeHtml(g.value)}" ${g.value === selectedGrade ? 'selected' : ''}>${escapeHtml(g.label)}</option>`)
    .join('');
}

function buildStatusOptionsHtml(selectedStatus) {
  return COURSE_STATUSES.map(
    (s) => `<option value="${s.value}" ${s.value === selectedStatus ? 'selected' : ''}>${s.label}</option>`
  ).join('');
}

function renderCheckIcon(status) {
  if (status === 'passed') return '♥';
  if (status === 'in_progress') return '✿';
  if (status === 'failed') return '!';
  return '';
}

function applySmartRecordChange(rec, field, value, gradeList) {
  rec[field] = value;
  if (field === 'grade') {
    const meta = getGradeMeta(gradeList, value);
    if (value && meta.passed) {
      rec.status = 'passed';
    } else if (value === 'F' || value === '0' || value === 'ขส' || value === 'มส') {
      rec.status = 'failed';
    }
  } else if (field === 'term') {
    if (value && rec.status === 'not_started' && !rec.grade) {
      rec.status = 'in_progress';
    }
  } else if (field === 'toggleCheck') {
    rec.status = rec.status === 'passed' ? 'not_started' : 'passed';
  }
}

// ================= VIEW 1: OVERVIEW =================
function renderOverview() {
  const dei = calcDeiStats();
  const ru = calcRuStats();
  const deiPct = clampPct(dei.totalPassed, DEI_TARGETS.totalCredits);
  const ruPct = clampPct(ru.totalPassed, RU_TARGETS.totalCredits);
  const kpcPct = clampPct(dei.kpcHours, DEI_TARGETS.kpcHours);

  // Active terms quick summary
  const allCourses = [...getAllDeiCourses(), ...getAllRuCourses()];
  const activeTerms = state.terms.filter((t) => allCourses.some((c) => c.term === t));

  const container = document.getElementById('view-overview');
  container.innerHTML = `
    <div class="stack">
      <div class="card">
        <div class="card-header" style="margin-bottom: 12px;">
          <div>
            <h2 class="card-title">ข้อมูลผู้เรียน</h2>
            <p class="card-sub">ใช้แสดงบนหัวใบติดตามโครงสร้างหลักสูตรและเวลาพิมพ์เป็น PDF</p>
          </div>
          <span class="term-first-tag">เข้าเรียนเทอมแรก: ${escapeHtml(state.profile.startTerm || '2/68')}</span>
        </div>
        <div class="profile-strip" style="margin-bottom: 0;">
          <div class="profile-field">
            <label>ชื่อ - นามสกุล</label>
            <input type="text" data-profile="name" value="${escapeHtml(state.profile.name)}" placeholder="กรอกชื่อ-นามสกุล" />
          </div>
          <div class="profile-field">
            <label>รหัสนักศึกษา สทก.ทางไกล ม.ปลาย</label>
            <input type="text" data-profile="deiStudentId" value="${escapeHtml(state.profile.deiStudentId)}" placeholder="รหัสประจำตัว สทก." />
          </div>
          <div class="profile-field">
            <label>รหัสนักศึกษา Pre-degree ม.รามคำแหง</label>
            <input type="text" data-profile="ruStudentId" value="${escapeHtml(state.profile.ruStudentId)}" placeholder="เช่น 68xxxxxxxx" />
          </div>
        </div>
      </div>

      <div class="grid-2">
        <!-- DEI CARD -->
        <div class="card program-card dei">
          <div class="program-tag dei">ส่วนที่ 1 &bull; มัธยมศึกษาตอนปลาย</div>
          <div class="card-header" style="margin-bottom: 6px;">
            <div>
              <h2 class="card-title">สทก.ทางไกล ม.ปลาย</h2>
              <p class="card-sub">สถาบันการศึกษาทางไกล (หลักสูตร สกร. 2567 — 76 หน่วยกิต)</p>
            </div>
            <button type="button" class="btn btn-dei btn-sm" data-goto-tab="dei">เปิดใบติดตาม →</button>
          </div>

          <div class="stat-row">
            <div class="stat-box">
              <div class="stat-label">หน่วยกิตที่ผ่าน</div>
              <div class="stat-value tabular" style="color: var(--dei-primary);">${dei.totalPassed}<span style="font-size:13px;color:var(--text-light);">/${DEI_TARGETS.totalCredits}</span></div>
              <div class="stat-foot">กำลังเรียน ${dei.inProgress} นก.</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">เกรดเฉลี่ย (GPAX)</div>
              <div class="stat-value tabular">${formatGpa(dei.gpa)}</div>
              <div class="stat-foot">ระบบ 0 – 4.0</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">กพช. สะสม</div>
              <div class="stat-value tabular">${dei.kpcHours}<span style="font-size:13px;color:var(--text-light);">/${DEI_TARGETS.kpcHours}</span></div>
              <div class="stat-foot">ชั่วโมง (${kpcPct}%)</div>
            </div>
          </div>

          <div class="progress-wrap">
            <div class="progress-meta">
              <span>ความคืบหน้าหน่วยกิตรวม</span>
              <strong class="tabular">${deiPct}% (${dei.totalPassed}/${DEI_TARGETS.totalCredits} นก.)</strong>
            </div>
            <div class="progress-track">
              <div class="progress-fill dei" style="width: ${deiPct}%;"></div>
            </div>
          </div>

          <div class="breakdown-list">
            <div class="breakdown-item">
              <span>วิชาบังคับ (8 วิชา)</span>
              <div class="breakdown-bar"><div class="progress-fill dei" style="width:${clampPct(dei.compPassed, DEI_TARGETS.compulsoryCredits)}%;"></div></div>
              <strong class="tabular">${dei.compPassed}/${DEI_TARGETS.compulsoryCredits} นก.</strong>
            </div>
            <div class="breakdown-item">
              <span>วิชาเลือก</span>
              <div class="breakdown-bar"><div class="progress-fill dei" style="width:${clampPct(dei.elecPassed, DEI_TARGETS.electiveCredits)}%;"></div></div>
              <strong class="tabular">${dei.elecPassed}/${DEI_TARGETS.electiveCredits} นก.</strong>
            </div>
            <div class="breakdown-item">
              <span>เกณฑ์จบเพิ่มเติม</span>
              <span style="font-size:12px;">
                คุณธรรม: <strong>${state.dei.ethicsPassed ? 'ผ่าน ✓' : 'รอประเมิน'}</strong> &bull;
                N-NET: <strong>${state.dei.nnetPassed ? 'ผ่าน ✓' : 'รอสอบ'}</strong>
              </span>
            </div>
          </div>
        </div>

        <!-- RU PRE-DEGREE CARD -->
        <div class="card program-card ru">
          <div class="program-tag ru">ส่วนที่ 2 &bull; คณะมนุษยศาสตร์ (หลักสูตร 2568)</div>
          <div class="card-header" style="margin-bottom: 6px;">
            <div>
              <h2 class="card-title">Pre-degree ม.รามคำแหง</h2>
              <p class="card-sub">เอกภาษาญี่ปุ่น (78 นก.) &bull; โทจิตวิทยา (18 นก.) &bull; รวม 132 นก.</p>
            </div>
            <button type="button" class="btn btn-primary btn-sm" data-goto-tab="ru">เปิดใบติดตาม →</button>
          </div>

          <div class="stat-row">
            <div class="stat-box">
              <div class="stat-label">หน่วยกิตที่ผ่าน</div>
              <div class="stat-value tabular" style="color: var(--ru-primary);">${ru.totalPassed}<span style="font-size:13px;color:var(--text-light);">/${RU_TARGETS.totalCredits}</span></div>
              <div class="stat-foot">กำลังเรียน ${ru.inProgress} นก.</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">เกรดเฉลี่ย (GPAX)</div>
              <div class="stat-value tabular">${formatGpa(ru.gpa)}</div>
              <div class="stat-foot">ระบบ A – F (8 เกรด)</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">จำนวนวิชาที่ผ่าน</div>
              <div class="stat-value tabular">${ru.passedCount}<span style="font-size:13px;color:var(--text-light);">/44</span></div>
              <div class="stat-foot">วิชาละ 3 หน่วยกิต</div>
            </div>
          </div>

          <div class="progress-wrap">
            <div class="progress-meta">
              <span>ความคืบหน้าหน่วยกิตรวม</span>
              <strong class="tabular">${ruPct}% (${ru.totalPassed}/${RU_TARGETS.totalCredits} นก.)</strong>
            </div>
            <div class="progress-track">
              <div class="progress-fill ru" style="width: ${ruPct}%;"></div>
            </div>
          </div>

          <div class="breakdown-list">
            <div class="breakdown-item">
              <span>ศึกษาทั่วไป (RAM)</span>
              <div class="breakdown-bar"><div class="progress-fill ru" style="width:${clampPct(ru.ge, RU_TARGETS.geCredits)}%;"></div></div>
              <strong class="tabular">${ru.ge}/${RU_TARGETS.geCredits} นก.</strong>
            </div>
            <div class="breakdown-item">
              <span>วิชาเอกบังคับ (ภาษาญี่ปุ่น)</span>
              <div class="breakdown-bar"><div class="progress-fill ru" style="width:${clampPct(ru.majorCompulsory, RU_TARGETS.majorCompulsoryCredits)}%;"></div></div>
              <strong class="tabular">${ru.majorCompulsory}/${RU_TARGETS.majorCompulsoryCredits} นก.</strong>
            </div>
            <div class="breakdown-item">
              <span>วิชาเอกเลือก (ภาษาญี่ปุ่น)</span>
              <div class="breakdown-bar"><div class="progress-fill sakura" style="width:${clampPct(ru.majorElective, RU_TARGETS.majorElectiveCredits)}%;"></div></div>
              <strong class="tabular">${ru.majorElective}/${RU_TARGETS.majorElectiveCredits} นก.</strong>
            </div>
            <div class="breakdown-item">
              <span>วิชาโท (จิตวิทยา PSY)</span>
              <div class="breakdown-bar"><div class="progress-fill amber" style="width:${clampPct(ru.minor, RU_TARGETS.minorCredits)}%;"></div></div>
              <strong class="tabular">${ru.minor}/${RU_TARGETS.minorCredits} นก.</strong>
            </div>
            <div class="breakdown-item">
              <span>วิชาเลือกเสรี</span>
              <div class="breakdown-bar"><div class="progress-fill dei" style="width:${clampPct(ru.freeElective, RU_TARGETS.freeElectiveCredits)}%;"></div></div>
              <strong class="tabular">${ru.freeElective}/${RU_TARGETS.freeElectiveCredits} นก.</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- QUICK TERM SUMMARY -->
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">สรุปภาคเรียนที่บันทึกแล้ว (เริ่ม 2/68)</h2>
            <p class="card-sub">เมื่อเลือกภาคเรียนในใบติดตามแต่ละวิชา รายวิชาจะถูกจัดกลุ่มแยกเทอมให้อัตโนมัติ</p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" data-goto-tab="terms">ดูรายละเอียดแยกทุกเทอม →</button>
        </div>

        ${activeTerms.length === 0 ? `
          <div class="empty-state">
            ยังไม่มีรายวิชาที่ระบุภาคเรียน — ไปที่แท็บ <strong>สทก.ทางไกล ม.ปลาย</strong> หรือ <strong>Pre-degree ม.รามฯ</strong> แล้วเลือกเทอม <strong>2/68</strong> ในวิชาที่ลงเรียนได้เลยครับ
          </div>
        ` : `
          <div class="grid-4">
            ${activeTerms.map((t) => {
              const deiT = getAllDeiCourses().filter((c) => c.term === t);
              const ruT = getAllRuCourses().filter((c) => c.term === t);
              const deiCr = deiT.reduce((s, c) => s + c.credits, 0);
              const ruCr = ruT.reduce((s, c) => s + c.credits, 0);
              const deiGpa = calcGpaFromCourses(deiT, DEI_GRADES);
              const ruGpa = calcGpaFromCourses(ruT, RU_GRADES);
              return `
                <div class="stat-box" style="cursor:pointer;" data-goto-tab="terms">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <strong style="color:var(--ru-primary);">เทอม ${escapeHtml(t)}</strong>
                    ${t === '2/68' ? '<span class="term-first-tag">เทอมแรก</span>' : ''}
                  </div>
                  <div style="font-size:12px;color:var(--dei-primary);">สทก.: ${deiT.length} วิชา (${deiCr} นก.) &bull; GPA ${formatGpa(deiGpa)}</div>
                  <div style="font-size:12px;color:var(--ru-primary);margin-top:2px;">ม.รามฯ: ${ruT.length} วิชา (${ruCr} นก.) &bull; GPA ${formatGpa(ruGpa)}</div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

// ================= VIEW 2: DEI HIGH SCHOOL =================
function renderDeiView() {
  const stats = calcDeiStats();
  const q = ui.deiSearch.trim().toLowerCase();

  const matchesFilter = (rec, code, name) => {
    if (ui.deiStatusFilter !== 'all' && rec.status !== ui.deiStatusFilter) return false;
    if (q) {
      const hay = `${code} ${name} ${rec.term || ''} ${rec.note || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  let compulsoryHtml = '';
  DEI_COMPULSORY_GROUPS.forEach((group) => {
    const visibleCourses = group.courses.filter((c) => matchesFilter(state.dei.compulsory[c.id], c.code, c.name));
    if (visibleCourses.length === 0) return;

    const groupPassed = group.courses.reduce(
      (sum, c) => sum + (state.dei.compulsory[c.id].status === 'passed' ? c.credits : 0),
      0
    );

    compulsoryHtml += `
      <div class="section-subhead">
        <span>${escapeHtml(group.title)}</span>
        <span class="tabular">ผ่านแล้ว ${groupPassed} / ${group.requiredCredits} หน่วยกิต</span>
      </div>
      <div class="table-wrap">
        <table class="sheet">
          <thead>
            <tr>
              <th style="width:44px;">ติ๊ก</th>
              <th style="width:95px;">รหัสวิชา</th>
              <th>ชื่อรายวิชา</th>
              <th style="width:58px;">นก.</th>
              <th style="width:132px;">สถานะ</th>
              <th style="width:112px;">เกรด</th>
              <th style="width:105px;">ภาคเรียน</th>
              <th style="width:140px;">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            ${visibleCourses.map((c) => {
              const rec = state.dei.compulsory[c.id];
              return `
                <tr class="row-${rec.status}">
                  <td class="m-check">
                    <button type="button" class="check-btn ${rec.status}" data-dei-comp-toggle="${c.id}" title="คลิกเพื่อติ๊กผ่าน/ยังไม่เรียน">${renderCheckIcon(rec.status)}</button>
                  </td>
                  <td data-label="รหัสวิชา"><span class="course-code dei">${escapeHtml(c.code)}</span></td>
                  <td class="m-full" data-label="ชื่อรายวิชา"><span class="course-name">${escapeHtml(c.name)}</span></td>
                  <td data-label="หน่วยกิต" class="tabular" style="font-weight:700;">${c.credits}</td>
                  <td data-label="สถานะ">
                    <select class="cell-select status-select status-${rec.status}" data-dei-comp-id="${c.id}" data-field="status">
                      ${buildStatusOptionsHtml(rec.status)}
                    </select>
                  </td>
                  <td data-label="เกรด">
                    <select class="cell-select tabular" data-dei-comp-id="${c.id}" data-field="grade">
                      ${buildGradeOptionsHtml(DEI_GRADES, rec.grade)}
                    </select>
                  </td>
                  <td data-label="ภาคเรียน">
                    <select class="cell-select tabular" data-dei-comp-id="${c.id}" data-field="term">
                      ${buildTermOptionsHtml(rec.term)}
                    </select>
                  </td>
                  <td class="m-full" data-label="หมายเหตุ / คะแนน">
                    <input type="text" class="cell-input" data-dei-comp-id="${c.id}" data-field="note" value="${escapeHtml(rec.note)}" placeholder="โน้ต / คะแนนสอบ..." />
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  });

  const visibleElectives = state.dei.electives.filter((e) => matchesFilter(e, e.code, e.name));

  const container = document.getElementById('view-dei');
  container.innerHTML = `
    <div class="stack">
      <!-- Top Summary Header -->
      <div class="card program-card dei">
        <div class="card-header" style="margin-bottom: 10px;">
          <div>
            <h2 class="card-title">ใบติดตามโครงสร้างหลักสูตร สทก.ทางไกล ระดับ ม.ปลาย</h2>
            <p class="card-sub">
              หลักสูตร สกร. 2567 &bull; เกณฑ์จบ: วิชาบังคับ ${DEI_TARGETS.compulsoryCredits} นก. + วิชาเลือกไม่น้อยกว่า ${DEI_TARGETS.electiveCredits} นก. = <strong>${DEI_TARGETS.totalCredits} หน่วยกิต</strong> + กพช. ${DEI_TARGETS.kpcHours} ชม. + คุณธรรม + N-NET
              ${state.profile.name || state.profile.deiStudentId ? `<br />ผู้เรียน: <strong>${escapeHtml(state.profile.name || '—')}</strong> &bull; รหัสประจำตัว: <strong>${escapeHtml(state.profile.deiStudentId || '—')}</strong> &bull; เริ่มเรียน <strong>${escapeHtml(state.profile.startTerm || '2/68')}</strong>` : ''}
            </p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <span class="credit-badge dei tabular">ผ่านแล้ว ${stats.totalPassed} / ${DEI_TARGETS.totalCredits} นก.</span>
            <span class="credit-badge tabular" style="background:#f3f2ed;color:var(--text);">GPAX ${formatGpa(stats.gpa)}</span>
          </div>
        </div>
        <div class="progress-track">
          <div class="progress-fill dei" style="width:${clampPct(stats.totalPassed, DEI_TARGETS.totalCredits)}%;"></div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar no-print">
        <div class="filter-pills">
          ${[
            { k: 'all', l: 'ทั้งหมด' },
            { k: 'passed', l: 'ผ่านแล้ว' },
            { k: 'in_progress', l: 'กำลังเรียน' },
            { k: 'not_started', l: 'ยังไม่เรียน' },
          ].map((f) => `<button type="button" class="pill dei ${ui.deiStatusFilter === f.k ? 'active' : ''}" data-dei-filter="${f.k}">${f.l}</button>`).join('')}
        </div>
        <div class="search-box">
          <input id="dei-search" type="search" class="input" value="${escapeHtml(ui.deiSearch)}" placeholder="ค้นหารหัสวิชา / ชื่อวิชา สทก. ..." />
        </div>
      </div>

      <!-- Compulsory 41 credits -->
      <div class="section-block">
        <div class="section-head">
          <h3>หมวดวิชาบังคับ 8 สาระการเรียนรู้ (หลักสูตร สกร. 2567)</h3>
          <span class="credit-badge ${stats.compPassed >= DEI_TARGETS.compulsoryCredits ? 'done' : 'dei'} tabular">
            ${stats.compPassed} / ${DEI_TARGETS.compulsoryCredits} หน่วยกิต
          </span>
        </div>
        ${compulsoryHtml || '<div class="empty-state">ไม่พบรายวิชาบังคับตามตัวกรองที่เลือก</div>'}
      </div>

      <!-- Electives 35 credits -->
      <div class="section-block">
        <div class="section-head">
          <div>
            <h3>หมวดวิชาเลือก (ไม่น้อยกว่า ${DEI_TARGETS.electiveCredits} หน่วยกิต)</h3>
            <span style="font-size:12px;color:var(--text-muted);">ใส่รหัสวิชาเลือกที่คุณลงเรียนใน สทก. เพิ่ม/แก้ไข/ลบได้อิสระ</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="credit-badge ${stats.elecPassed >= DEI_TARGETS.electiveCredits ? 'done' : 'dei'} tabular">
              ${stats.elecPassed} / ${DEI_TARGETS.electiveCredits} หน่วยกิต
            </span>
            <button type="button" id="btn-add-dei-elective" class="btn btn-dei btn-sm no-print">+ เพิ่มวิชาเลือก</button>
          </div>
        </div>

        <div class="table-wrap">
          <table class="sheet">
            <thead>
              <tr>
                <th style="width:44px;">ติ๊ก</th>
                <th style="width:110px;">รหัสวิชา</th>
                <th>ชื่อรายวิชาเลือก</th>
                <th style="width:105px;">ประเภท</th>
                <th style="width:68px;">นก.</th>
                <th style="width:130px;">สถานะ</th>
                <th style="width:108px;">เกรด</th>
                <th style="width:100px;">ภาคเรียน</th>
                <th style="width:42px;" class="no-print"></th>
              </tr>
            </thead>
            <tbody>
              ${visibleElectives.length === 0 ? `
                <tr><td colspan="9" class="empty-state">ยังไม่มีวิชาเลือกที่ตรงกับตัวกรอง — กดปุ่ม "+ เพิ่มวิชาเลือก" เพื่อเพิ่มรายวิชาได้ครับ</td></tr>
              ` : visibleElectives.map((e) => `
                <tr class="row-${e.status}">
                  <td class="m-check">
                    <button type="button" class="check-btn ${e.status}" data-dei-elec-toggle="${e.id}">${renderCheckIcon(e.status)}</button>
                  </td>
                  <td data-label="รหัสวิชา">
                    <input type="text" class="cell-input course-code dei" data-dei-elec-id="${e.id}" data-field="code" value="${escapeHtml(e.code)}" placeholder="รหัสวิชา" />
                  </td>
                  <td class="m-full" data-label="ชื่อรายวิชาเลือก">
                    <input type="text" class="cell-input" data-dei-elec-id="${e.id}" data-field="name" value="${escapeHtml(e.name)}" placeholder="ชื่อรายวิชา" />
                  </td>
                  <td data-label="ประเภท">
                    <select class="cell-select" data-dei-elec-id="${e.id}" data-field="tag">
                      ${['วิชาเลือก', 'เลือกบังคับ', 'เลือกเสรี', 'โครงงาน'].map((tg) => `<option value="${tg}" ${e.tag === tg ? 'selected' : ''}>${tg}</option>`).join('')}
                    </select>
                  </td>
                  <td data-label="หน่วยกิต">
                    <input type="number" min="1" max="10" class="cell-input tabular" data-dei-elec-id="${e.id}" data-field="credits" value="${e.credits}" />
                  </td>
                  <td data-label="สถานะ">
                    <select class="cell-select status-select status-${e.status}" data-dei-elec-id="${e.id}" data-field="status">
                      ${buildStatusOptionsHtml(e.status)}
                    </select>
                  </td>
                  <td data-label="เกรด">
                    <select class="cell-select tabular" data-dei-elec-id="${e.id}" data-field="grade">
                      ${buildGradeOptionsHtml(DEI_GRADES, e.grade)}
                    </select>
                  </td>
                  <td data-label="ภาคเรียน">
                    <select class="cell-select tabular" data-dei-elec-id="${e.id}" data-field="term">
                      ${buildTermOptionsHtml(e.term)}
                    </select>
                  </td>
                  <td class="no-print m-delete">
                    <button type="button" class="btn btn-danger-ghost" data-dei-elec-del="${e.id}" title="ลบวิชานี้">✕ ลบ</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- KPC & Graduation Requirements -->
      <div class="kpc-grid">
        <div class="card">
          <div class="card-header" style="margin-bottom: 10px;">
            <div>
              <h3 class="card-title">กิจกรรมพัฒนาคุณภาพชีวิต (กพช.)</h3>
              <p class="card-sub">หลักสูตร สกร. 2567 กำหนดไม่น้อยกว่า ${DEI_TARGETS.kpcHours} ชั่วโมงตลอดหลักสูตร ม.ปลาย</p>
            </div>
            <span class="credit-badge ${stats.kpcHours >= DEI_TARGETS.kpcHours ? 'done' : 'dei'} tabular">
              ${stats.kpcHours} / ${DEI_TARGETS.kpcHours} ชม.
            </span>
          </div>

          <div class="progress-track" style="margin-bottom: 14px;">
            <div class="progress-fill dei" style="width:${clampPct(stats.kpcHours, DEI_TARGETS.kpcHours)}%;"></div>
          </div>

          <form id="kpc-form" class="kpc-form no-print">
            <input id="kpc-title" type="text" class="input" placeholder="ชื่อกิจกรรม กพช. (เช่น จิตอาสา, อบรม...)" required />
            <input id="kpc-hours" type="number" min="1" max="200" class="input tabular" placeholder="ชม." required />
            <select id="kpc-term" class="select tabular">
              ${buildTermOptionsHtml('2/68')}
            </select>
            <button type="submit" class="btn btn-dei">+ เพิ่ม</button>
          </form>

          <div class="kpc-list">
            ${state.dei.kpcLogs.length === 0 ? `
              <div class="empty-state" style="padding:16px;">ยังไม่มีบันทึกชั่วโมง กพช.</div>
            ` : state.dei.kpcLogs.map((item) => `
              <div class="kpc-row">
                <div>
                  <strong>${escapeHtml(item.title)}</strong>
                  <span style="font-size:12px;color:var(--text-muted);margin-left:6px;">เทอม ${escapeHtml(item.term || '—')}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <strong class="tabular" style="color:var(--dei-primary);">${item.hours} ชม.</strong>
                  <button type="button" class="btn btn-danger-ghost no-print" data-kpc-del="${item.id}">✕</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">เงื่อนไขจบการศึกษาอื่น ๆ</h3>
              <p class="card-sub">ติ๊กเมื่อผ่านการประเมินตามเกณฑ์ สทก./สกร.</p>
            </div>
          </div>

          <div class="requirement-item">
            <div>
              <strong>การประเมินคุณธรรม</strong>
              <div style="font-size:12px;color:var(--text-muted);">ต้องผ่านในระดับพอใช้ขึ้นไป</div>
            </div>
            <button type="button" class="btn ${state.dei.ethicsPassed ? 'btn-dei' : 'btn-secondary'} btn-sm" id="btn-toggle-ethics">
              ${state.dei.ethicsPassed ? 'ผ่านแล้ว ✓' : 'ยังไม่ประเมิน'}
            </button>
          </div>

          <div class="requirement-item">
            <div>
              <strong>การสอบระดับชาติ (N-NET)</strong>
              <div style="font-size:12px;color:var(--text-muted);">เข้ารับการทดสอบในภาคเรียนสุดท้าย</div>
            </div>
            <button type="button" class="btn ${state.dei.nnetPassed ? 'btn-dei' : 'btn-secondary'} btn-sm" id="btn-toggle-nnet">
              ${state.dei.nnetPassed ? 'เข้าสอบแล้ว ✓' : 'ยังไม่สอบ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ================= VIEW 3: RU PRE-DEGREE (JAPANESE MAJOR + PSY MINOR) =================
function renderRuView() {
  const stats = calcRuStats();
  const q = ui.ruSearch.trim().toLowerCase();
  const dupMajorElec = findDuplicateCodes(state.ru.majorElective);
  const dupMinor = findDuplicateCodes(state.ru.minor);

  const showCat = (cat) => ui.ruCategoryFilter === 'all' || ui.ruCategoryFilter === cat;
  const matchesFilter = (rec, searchHaystack) => {
    if (ui.ruStatusFilter !== 'all' && rec.status !== ui.ruStatusFilter) return false;
    if (q && !`${searchHaystack} ${rec.term || ''} ${rec.note || ''}`.toLowerCase().includes(q)) return false;
    return true;
  };

  // --- 1) GE 30 credits ---
  let geHtml = '';
  if (showCat('ge')) {
    let groupsInner = '';
    RU_GE_GROUPS.forEach((group) => {
      const visibleSlots = group.slots.filter((slot) => {
        const rec = state.ru.ge[slot.id];
        const hay = slot.type === 'fixed'
          ? `${slot.code} ${slot.altCode || ''} ${slot.name} ${slot.label}`
          : `${slot.label} ${slot.options.map((o) => `${o.code} ${o.name}`).join(' ')}`;
        return matchesFilter(rec, hay);
      });
      if (visibleSlots.length === 0) return;

      groupsInner += `
        <div class="section-subhead">
          <span>${escapeHtml(group.title)}</span>
        </div>
        <div class="table-wrap">
          <table class="sheet">
            <thead>
              <tr>
                <th style="width:44px;">ติ๊ก</th>
                <th style="width:310px;">กระบวนวิชา (ตามโครงสร้างหลักสูตร 2568)</th>
                <th style="width:52px;">นก.</th>
                <th style="width:128px;">สถานะ</th>
                <th style="width:108px;">เกรด</th>
                <th style="width:100px;">ภาคเรียน</th>
                <th style="width:130px;">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              ${visibleSlots.map((slot) => {
                const rec = state.ru.ge[slot.id];
                return `
                  <tr class="row-${rec.status}">
                    <td class="m-check">
                      <button type="button" class="check-btn ${rec.status}" data-ru-toggle="ge:${slot.id}">${renderCheckIcon(rec.status)}</button>
                    </td>
                    <td class="m-full" data-label="กระบวนวิชา">
                      ${slot.type === 'fixed' ? `
                        <span class="course-code">${escapeHtml(slot.code)}</span>
                        ${slot.altCode ? `<span class="course-alt">(เดิม ${escapeHtml(slot.altCode)})</span>` : ''}
                        <div class="course-name">${escapeHtml(slot.name)}</div>
                      ` : `
                        <div style="font-size:11.5px;color:var(--text-muted);margin-bottom:4px;">${escapeHtml(slot.label)}</div>
                        <select class="cell-select" data-ru-bucket="ge" data-ru-id="${slot.id}" data-field="selectedCode">
                          <option value="">— เลือก 1 กระบวนวิชา —</option>
                          ${slot.options.map((o) => `
                            <option value="${o.code}" ${rec.selectedCode === o.code ? 'selected' : ''}>${o.code} — ${escapeHtml(o.name)}</option>
                          `).join('')}
                        </select>
                      `}
                    </td>
                    <td data-label="หน่วยกิต" class="tabular" style="font-weight:700;">${slot.credits}</td>
                    <td data-label="สถานะ">
                      <select class="cell-select status-select status-${rec.status}" data-ru-bucket="ge" data-ru-id="${slot.id}" data-field="status">
                        ${buildStatusOptionsHtml(rec.status)}
                      </select>
                    </td>
                    <td data-label="เกรด">
                      <select class="cell-select tabular" data-ru-bucket="ge" data-ru-id="${slot.id}" data-field="grade">
                        ${buildGradeOptionsHtml(RU_GRADES, rec.grade)}
                      </select>
                    </td>
                    <td data-label="ภาคเรียน">
                      <select class="cell-select tabular" data-ru-bucket="ge" data-ru-id="${slot.id}" data-field="term">
                        ${buildTermOptionsHtml(rec.term)}
                      </select>
                    </td>
                    <td class="m-full" data-label="หมายเหตุ">
                      <input type="text" class="cell-input" data-ru-bucket="ge" data-ru-id="${slot.id}" data-field="note" value="${escapeHtml(rec.note)}" placeholder="โน้ต..." />
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    });

    geHtml = `
      <div class="section-block">
        <div class="section-head">
          <h3>1. หมวดวิชาศึกษาทั่วไป (10 กระบวนวิชา)</h3>
          <span class="credit-badge ${stats.ge >= RU_TARGETS.geCredits ? 'done' : ''} tabular">${stats.ge} / ${RU_TARGETS.geCredits} หน่วยกิต</span>
        </div>
        ${groupsInner || '<div class="empty-state">ไม่พบรายวิชาตามตัวกรองที่เลือก</div>'}
      </div>
    `;
  }

  // --- 2) Major Compulsory 51 credits (17 courses) ---
  let majorCompHtml = '';
  if (showCat('majorCompulsory')) {
    const visible = RU_MAJOR_COMPULSORY.filter((c) => {
      const rec = state.ru.majorCompulsory[c.id];
      return matchesFilter(rec, `${c.code} ${c.altCode || ''} ${c.name} ${c.enName}`);
    });

    majorCompHtml = `
      <div class="section-block">
        <div class="section-head">
          <div>
            <h3>2. หมวดวิชาเอกภาษาญี่ปุ่น — วิชาเอกบังคับ (17 กระบวนวิชา)</h3>
            <span style="font-size:12px;color:var(--text-muted);">สัญลักษณ์ ** หมายถึงวิชามีเงื่อนไข/วิชาบังคับก่อนตามระเบียบการ พ.ศ. 2568</span>
          </div>
          <span class="credit-badge ${stats.majorCompulsory >= RU_TARGETS.majorCompulsoryCredits ? 'done' : ''} tabular">
            ${stats.majorCompulsory} / ${RU_TARGETS.majorCompulsoryCredits} หน่วยกิต
          </span>
        </div>
        ${visible.length === 0 ? '<div class="empty-state">ไม่พบรายวิชาตามตัวกรองที่เลือก</div>' : `
          <div class="table-wrap">
            <table class="sheet">
              <thead>
                <tr>
                  <th style="width:44px;">ติ๊ก</th>
                  <th style="width:120px;">รหัสวิชา</th>
                  <th>ชื่อกระบวนวิชา</th>
                  <th style="width:52px;">นก.</th>
                  <th style="width:128px;">สถานะ</th>
                  <th style="width:108px;">เกรด</th>
                  <th style="width:100px;">ภาคเรียน</th>
                  <th style="width:130px;">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                ${visible.map((c) => {
                  const rec = state.ru.majorCompulsory[c.id];
                  return `
                    <tr class="row-${rec.status}">
                      <td class="m-check">
                        <button type="button" class="check-btn ${rec.status}" data-ru-toggle="majorCompulsory:${c.id}">${renderCheckIcon(rec.status)}</button>
                      </td>
                      <td data-label="รหัสวิชา">
                        <span class="course-code">${escapeHtml(c.prereqMark)}${escapeHtml(c.code)}</span>
                        ${c.altCode ? `<span class="course-alt">(${escapeHtml(c.altCode)})</span>` : ''}
                      </td>
                      <td class="m-full" data-label="ชื่อกระบวนวิชา">
                        <span class="course-name">${escapeHtml(c.name)}</span>
                        <span class="course-en">${escapeHtml(c.enName)}</span>
                      </td>
                      <td data-label="หน่วยกิต" class="tabular" style="font-weight:700;">${c.credits}</td>
                      <td data-label="สถานะ">
                        <select class="cell-select status-select status-${rec.status}" data-ru-bucket="majorCompulsory" data-ru-id="${c.id}" data-field="status">
                          ${buildStatusOptionsHtml(rec.status)}
                        </select>
                      </td>
                      <td data-label="เกรด">
                        <select class="cell-select tabular" data-ru-bucket="majorCompulsory" data-ru-id="${c.id}" data-field="grade">
                          ${buildGradeOptionsHtml(RU_GRADES, rec.grade)}
                        </select>
                      </td>
                      <td data-label="ภาคเรียน">
                        <select class="cell-select tabular" data-ru-bucket="majorCompulsory" data-ru-id="${c.id}" data-field="term">
                          ${buildTermOptionsHtml(rec.term)}
                        </select>
                      </td>
                      <td class="m-full" data-label="หมายเหตุ">
                        <input type="text" class="cell-input" data-ru-bucket="majorCompulsory" data-ru-id="${c.id}" data-field="note" value="${escapeHtml(rec.note)}" placeholder="โน้ต..." />
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  // --- 3) Major Electives 27 credits (9 slots) ---
  let majorElecHtml = '';
  if (showCat('majorElective')) {
    const categories = [...new Set(RU_MAJOR_ELECTIVE_CATALOG.map((c) => c.category))];
    const visible = RU_MAJOR_ELECTIVE_SLOTS.filter((slot) => {
      const rec = state.ru.majorElective[slot.id];
      const disp = resolveRuSlotDisplay('majorElective', slot, rec);
      return matchesFilter(rec, `${slot.label} ${disp.code} ${disp.name}`);
    });

    majorElecHtml = `
      <div class="section-block">
        <div class="section-head">
          <div>
            <h3>3. หมวดวิชาเอกภาษาญี่ปุ่น — วิชาเอกเลือก (เลือก 9 กระบวนวิชา)</h3>
            <span style="font-size:12px;color:var(--text-muted);">เลือกจาก 3 หมวดของหลักสูตร JPN ไม่ซ้ำกับวิชาเอกบังคับ (ระบบแจ้งเตือนหากเลือกซ้ำ)</span>
          </div>
          <span class="credit-badge ${stats.majorElective >= RU_TARGETS.majorElectiveCredits ? 'done' : ''} tabular">
            ${stats.majorElective} / ${RU_TARGETS.majorElectiveCredits} หน่วยกิต
          </span>
        </div>
        ${visible.length === 0 ? '<div class="empty-state">ไม่พบรายวิชาตามตัวกรองที่เลือก</div>' : `
          <div class="table-wrap">
            <table class="sheet">
              <thead>
                <tr>
                  <th style="width:44px;">ติ๊ก</th>
                  <th style="width:330px;">วิชาเอกเลือก JPN (9 ช่อง)</th>
                  <th style="width:52px;">นก.</th>
                  <th style="width:128px;">สถานะ</th>
                  <th style="width:108px;">เกรด</th>
                  <th style="width:100px;">ภาคเรียน</th>
                  <th style="width:130px;">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                ${visible.map((slot) => {
                  const rec = state.ru.majorElective[slot.id];
                  const effectiveCode = (rec.selectedCode === '__CUSTOM__' ? rec.customCode : rec.selectedCode || '').trim().toUpperCase();
                  const isDup = effectiveCode && dupMajorElec.has(effectiveCode);
                  return `
                    <tr class="row-${rec.status}">
                      <td class="m-check">
                        <button type="button" class="check-btn ${rec.status}" data-ru-toggle="majorElective:${slot.id}">${renderCheckIcon(rec.status)}</button>
                      </td>
                      <td class="m-full" data-label="วิชาเอกเลือก JPN">
                        <select class="cell-select" data-ru-bucket="majorElective" data-ru-id="${slot.id}" data-field="selectedCode">
                          <option value="">— เลือก${slot.label} —</option>
                          ${categories.map((cat) => `
                            <optgroup label="${escapeHtml(cat)}">
                              ${RU_MAJOR_ELECTIVE_CATALOG.filter((c) => c.category === cat).map((c) => `
                                <option value="${c.code}" ${rec.selectedCode === c.code ? 'selected' : ''}>${c.prereqMark}${c.code} — ${escapeHtml(c.name)}</option>
                              `).join('')}
                            </optgroup>
                          `).join('')}
                          <option value="__CUSTOM__" ${rec.selectedCode === '__CUSTOM__' ? 'selected' : ''}>✎ พิมพ์รหัสวิชา JPN อื่นเอง...</option>
                        </select>
                        ${rec.selectedCode === '__CUSTOM__' ? `
                          <div class="custom-course-row">
                            <input type="text" class="cell-input" style="max-width:110px;" data-ru-bucket="majorElective" data-ru-id="${slot.id}" data-field="customCode" value="${escapeHtml(rec.customCode)}" placeholder="รหัส JPN..." />
                            <input type="text" class="cell-input" data-ru-bucket="majorElective" data-ru-id="${slot.id}" data-field="customName" value="${escapeHtml(rec.customName)}" placeholder="ชื่อวิชา..." />
                          </div>
                        ` : ''}
                        ${isDup ? `<span class="dup-warn">⚠ เลือกวิชา ${escapeHtml(effectiveCode)} ซ้ำกับช่องอื่น</span>` : ''}
                      </td>
                      <td data-label="หน่วยกิต" class="tabular" style="font-weight:700;">${slot.credits}</td>
                      <td data-label="สถานะ">
                        <select class="cell-select status-select status-${rec.status}" data-ru-bucket="majorElective" data-ru-id="${slot.id}" data-field="status">
                          ${buildStatusOptionsHtml(rec.status)}
                        </select>
                      </td>
                      <td data-label="เกรด">
                        <select class="cell-select tabular" data-ru-bucket="majorElective" data-ru-id="${slot.id}" data-field="grade">
                          ${buildGradeOptionsHtml(RU_GRADES, rec.grade)}
                        </select>
                      </td>
                      <td data-label="ภาคเรียน">
                        <select class="cell-select tabular" data-ru-bucket="majorElective" data-ru-id="${slot.id}" data-field="term">
                          ${buildTermOptionsHtml(rec.term)}
                        </select>
                      </td>
                      <td class="m-full" data-label="หมายเหตุ">
                        <input type="text" class="cell-input" data-ru-bucket="majorElective" data-ru-id="${slot.id}" data-field="note" value="${escapeHtml(rec.note)}" placeholder="โน้ต..." />
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  // --- 4) Minor Psychology 18 credits (6 slots) ---
  let minorHtml = '';
  if (showCat('minor')) {
    const groups = [...new Set(RU_MINOR_PSY_CATALOG.map((c) => c.group))];
    const visible = RU_MINOR_SLOTS.filter((slot) => {
      const rec = state.ru.minor[slot.id];
      const disp = resolveRuSlotDisplay('minor', slot, rec);
      return matchesFilter(rec, `${slot.label} ${disp.code} ${disp.name}`);
    });

    minorHtml = `
      <div class="section-block">
        <div class="section-head">
          <div>
            <h3>4. หมวดวิชาโท — จิตวิทยา PSY (6 กระบวนวิชา)</h3>
            <span style="font-size:12px;color:var(--text-muted);">เลือกจากรายวิชาจิตวิทยา ม.รามฯ หรือเลือก "พิมพ์รหัสวิชา PSY เอง" สำหรับวิชาโทเลือกเพิ่มเติม</span>
          </div>
          <span class="credit-badge ${stats.minor >= RU_TARGETS.minorCredits ? 'done' : ''} tabular">
            ${stats.minor} / ${RU_TARGETS.minorCredits} หน่วยกิต
          </span>
        </div>
        ${visible.length === 0 ? '<div class="empty-state">ไม่พบรายวิชาตามตัวกรองที่เลือก</div>' : `
          <div class="table-wrap">
            <table class="sheet">
              <thead>
                <tr>
                  <th style="width:44px;">ติ๊ก</th>
                  <th style="width:330px;">วิชาโทจิตวิทยา (6 ช่อง)</th>
                  <th style="width:52px;">นก.</th>
                  <th style="width:128px;">สถานะ</th>
                  <th style="width:108px;">เกรด</th>
                  <th style="width:100px;">ภาคเรียน</th>
                  <th style="width:130px;">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                ${visible.map((slot) => {
                  const rec = state.ru.minor[slot.id];
                  const effectiveCode = (rec.selectedCode === '__CUSTOM__' ? rec.customCode : rec.selectedCode || '').trim().toUpperCase();
                  const isDup = effectiveCode && dupMinor.has(effectiveCode);
                  return `
                    <tr class="row-${rec.status}">
                      <td class="m-check">
                        <button type="button" class="check-btn ${rec.status}" data-ru-toggle="minor:${slot.id}">${renderCheckIcon(rec.status)}</button>
                      </td>
                      <td class="m-full" data-label="วิชาโทจิตวิทยา">
                        <select class="cell-select" data-ru-bucket="minor" data-ru-id="${slot.id}" data-field="selectedCode">
                          <option value="">— เลือก${slot.label} —</option>
                          ${groups.map((grp) => `
                            <optgroup label="${escapeHtml(grp)}">
                              ${RU_MINOR_PSY_CATALOG.filter((c) => c.group === grp).map((c) => `
                                <option value="${c.code}" ${rec.selectedCode === c.code ? 'selected' : ''}>${c.code} — ${escapeHtml(c.name)}</option>
                              `).join('')}
                            </optgroup>
                          `).join('')}
                          <option value="__CUSTOM__" ${rec.selectedCode === '__CUSTOM__' ? 'selected' : ''}>✎ พิมพ์รหัสวิชา PSY อื่นเอง...</option>
                        </select>
                        ${rec.selectedCode === '__CUSTOM__' ? `
                          <div class="custom-course-row">
                            <input type="text" class="cell-input" style="max-width:110px;" data-ru-bucket="minor" data-ru-id="${slot.id}" data-field="customCode" value="${escapeHtml(rec.customCode)}" placeholder="รหัส PSY..." />
                            <input type="text" class="cell-input" data-ru-bucket="minor" data-ru-id="${slot.id}" data-field="customName" value="${escapeHtml(rec.customName)}" placeholder="ชื่อวิชาจิตวิทยา..." />
                          </div>
                        ` : ''}
                        ${isDup ? `<span class="dup-warn">⚠ เลือกวิชา ${escapeHtml(effectiveCode)} ซ้ำกับช่องอื่น</span>` : ''}
                      </td>
                      <td data-label="หน่วยกิต" class="tabular" style="font-weight:700;">${slot.credits}</td>
                      <td data-label="สถานะ">
                        <select class="cell-select status-select status-${rec.status}" data-ru-bucket="minor" data-ru-id="${slot.id}" data-field="status">
                          ${buildStatusOptionsHtml(rec.status)}
                        </select>
                      </td>
                      <td data-label="เกรด">
                        <select class="cell-select tabular" data-ru-bucket="minor" data-ru-id="${slot.id}" data-field="grade">
                          ${buildGradeOptionsHtml(RU_GRADES, rec.grade)}
                        </select>
                      </td>
                      <td data-label="ภาคเรียน">
                        <select class="cell-select tabular" data-ru-bucket="minor" data-ru-id="${slot.id}" data-field="term">
                          ${buildTermOptionsHtml(rec.term)}
                        </select>
                      </td>
                      <td class="m-full" data-label="หมายเหตุ">
                        <input type="text" class="cell-input" data-ru-bucket="minor" data-ru-id="${slot.id}" data-field="note" value="${escapeHtml(rec.note)}" placeholder="โน้ต..." />
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  // --- 5) Free Electives 6 credits (2 slots) ---
  let freeHtml = '';
  if (showCat('freeElective')) {
    const visible = RU_FREE_ELECTIVE_SLOTS.filter((slot) => {
      const rec = state.ru.freeElective[slot.id];
      return matchesFilter(rec, `${slot.label} ${rec.customCode} ${rec.customName}`);
    });

    freeHtml = `
      <div class="section-block">
        <div class="section-head">
          <h3>5. หมวดวิชาเลือกเสรี (2 กระบวนวิชา)</h3>
          <span class="credit-badge ${stats.freeElective >= RU_TARGETS.freeElectiveCredits ? 'done' : ''} tabular">
            ${stats.freeElective} / ${RU_TARGETS.freeElectiveCredits} หน่วยกิต
          </span>
        </div>
        ${visible.length === 0 ? '<div class="empty-state">ไม่พบรายวิชาตามตัวกรองที่เลือก</div>' : `
          <div class="table-wrap">
            <table class="sheet">
              <thead>
                <tr>
                  <th style="width:44px;">ติ๊ก</th>
                  <th style="width:120px;">รหัสวิชา</th>
                  <th>ชื่อกระบวนวิชาเลือกเสรี</th>
                  <th style="width:52px;">นก.</th>
                  <th style="width:128px;">สถานะ</th>
                  <th style="width:108px;">เกรด</th>
                  <th style="width:100px;">ภาคเรียน</th>
                  <th style="width:130px;">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                ${visible.map((slot) => {
                  const rec = state.ru.freeElective[slot.id];
                  return `
                    <tr class="row-${rec.status}">
                      <td class="m-check">
                        <button type="button" class="check-btn ${rec.status}" data-ru-toggle="freeElective:${slot.id}">${renderCheckIcon(rec.status)}</button>
                      </td>
                      <td data-label="รหัสวิชา">
                        <input type="text" class="cell-input course-code" data-ru-bucket="freeElective" data-ru-id="${slot.id}" data-field="customCode" value="${escapeHtml(rec.customCode)}" placeholder="เช่น ENG1001" />
                      </td>
                      <td class="m-full" data-label="ชื่อวิชาเลือกเสรี">
                        <input type="text" class="cell-input" data-ru-bucket="freeElective" data-ru-id="${slot.id}" data-field="customName" value="${escapeHtml(rec.customName)}" placeholder="ระบุชื่อวิชาเลือกเสรี..." />
                      </td>
                      <td data-label="หน่วยกิต" class="tabular" style="font-weight:700;">${slot.credits}</td>
                      <td data-label="สถานะ">
                        <select class="cell-select status-select status-${rec.status}" data-ru-bucket="freeElective" data-ru-id="${slot.id}" data-field="status">
                          ${buildStatusOptionsHtml(rec.status)}
                        </select>
                      </td>
                      <td data-label="เกรด">
                        <select class="cell-select tabular" data-ru-bucket="freeElective" data-ru-id="${slot.id}" data-field="grade">
                          ${buildGradeOptionsHtml(RU_GRADES, rec.grade)}
                        </select>
                      </td>
                      <td data-label="ภาคเรียน">
                        <select class="cell-select tabular" data-ru-bucket="freeElective" data-ru-id="${slot.id}" data-field="term">
                          ${buildTermOptionsHtml(rec.term)}
                        </select>
                      </td>
                      <td class="m-full" data-label="หมายเหตุ">
                        <input type="text" class="cell-input" data-ru-bucket="freeElective" data-ru-id="${slot.id}" data-field="note" value="${escapeHtml(rec.note)}" placeholder="โน้ต..." />
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  const container = document.getElementById('view-ru');
  container.innerHTML = `
    <div class="stack">
      <div class="card program-card ru">
        <div class="card-header" style="margin-bottom: 10px;">
          <div>
            <h2 class="card-title">โครงสร้างหลักสูตรวิชาเอกภาษาญี่ปุ่น (Pre-degree ม.รามคำแหง)</h2>
            <p class="card-sub">
              คณะมนุษยศาสตร์ (ระเบียบการ พ.ศ. 2568) &bull; วิชาเอก: <strong>ภาษาญี่ปุ่น (78 นก.)</strong> &bull; วิชาโท: <strong>จิตวิทยา (18 นก.)</strong> &bull; รวม <strong>132 หน่วยกิต</strong>
              ${state.profile.name || state.profile.ruStudentId ? `<br />ชื่อ: <strong>${escapeHtml(state.profile.name || '—')}</strong> &bull; รหัสประจำตัว: <strong>${escapeHtml(state.profile.ruStudentId || '—')}</strong> &bull; เริ่มเรียน <strong>${escapeHtml(state.profile.startTerm || '2/68')}</strong>` : ''}
            </p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <span class="credit-badge tabular">ผ่านแล้ว ${stats.totalPassed} / ${RU_TARGETS.totalCredits} นก.</span>
            <span class="credit-badge tabular" style="background:#f3f2ed;color:var(--text);">GPAX ${formatGpa(stats.gpa)}</span>
            <button type="button" id="btn-ru-plan" class="btn btn-secondary btn-sm no-print">ดูแผนการเรียน 4 ปี (หน้า 158)</button>
          </div>
        </div>
        <div class="progress-track">
          <div class="progress-fill ru" style="width:${clampPct(stats.totalPassed, RU_TARGETS.totalCredits)}%;"></div>
        </div>
      </div>

      <!-- Category & Status Filters -->
      <div class="toolbar no-print" style="margin-bottom: 6px;">
        <div class="filter-pills">
          ${[
            { k: 'all', l: 'ทุกหมวด (132)' },
            { k: 'ge', l: `ศึกษาทั่วไป (${stats.ge}/30)` },
            { k: 'majorCompulsory', l: `เอกบังคับ (${stats.majorCompulsory}/51)` },
            { k: 'majorElective', l: `เอกเลือก (${stats.majorElective}/27)` },
            { k: 'minor', l: `โทจิตวิทยา (${stats.minor}/18)` },
            { k: 'freeElective', l: `เลือกเสรี (${stats.freeElective}/6)` },
          ].map((c) => `<button type="button" class="pill ${ui.ruCategoryFilter === c.k ? 'active' : ''}" data-ru-cat="${c.k}">${c.l}</button>`).join('')}
        </div>
      </div>

      <div class="toolbar no-print">
        <div class="filter-pills">
          ${[
            { k: 'all', l: 'สถานะทั้งหมด' },
            { k: 'passed', l: 'ผ่านแล้ว' },
            { k: 'in_progress', l: 'กำลังเรียน' },
            { k: 'not_started', l: 'ยังไม่เรียน' },
          ].map((f) => `<button type="button" class="pill ${ui.ruStatusFilter === f.k ? 'active' : ''}" data-ru-status="${f.k}">${f.l}</button>`).join('')}
        </div>
        <div class="search-box">
          <input id="ru-search" type="search" class="input" value="${escapeHtml(ui.ruSearch)}" placeholder="ค้นหารหัส JPN / RAM / PSY หรือชื่อวิชา..." />
        </div>
      </div>

      ${geHtml}
      ${majorCompHtml}
      ${majorElecHtml}
      ${minorHtml}
      ${freeHtml}
    </div>
  `;
}

// ================= VIEW 4: TERM-BY-TERM VIEW =================
function renderTermsView() {
  const allDei = getAllDeiCourses();
  const allRu = getAllRuCourses();
  const pool =
    ui.termProgramFilter === 'dei'
      ? allDei
      : ui.termProgramFilter === 'ru'
        ? allRu
        : [...allDei, ...allRu];

  // Collect terms in order (always include '2/68')
  const extraTerms = [];
  pool.forEach((c) => {
    if (c.term && !state.terms.includes(c.term) && !extraTerms.includes(c.term)) {
      extraTerms.push(c.term);
    }
  });
  const orderedTerms = [...state.terms, ...extraTerms];

  // Cumulative GPAX tracking up to each term
  const cumDei = [];
  const cumRu = [];

  const termCards = orderedTerms
    .map((term) => {
      const items = pool.filter((c) => c.term === term);
      const deiItems = items.filter((c) => c.program === 'dei');
      const ruItems = items.filter((c) => c.program === 'ru');
      cumDei.push(...deiItems);
      cumRu.push(...ruItems);

      if (items.length === 0 && !ui.showEmptyTerms && term !== '2/68') {
        return '';
      }

      const deiPassedCr = deiItems.filter((c) => c.status === 'passed').reduce((s, c) => s + c.credits, 0);
      const deiRegCr = deiItems.reduce((s, c) => s + c.credits, 0);
      const ruPassedCr = ruItems.filter((c) => c.status === 'passed').reduce((s, c) => s + c.credits, 0);
      const ruRegCr = ruItems.reduce((s, c) => s + c.credits, 0);

      const deiTermGpa = calcGpaFromCourses(deiItems, DEI_GRADES);
      const deiCumGpa = calcGpaFromCourses(cumDei, DEI_GRADES);
      const ruTermGpa = calcGpaFromCourses(ruItems, RU_GRADES);
      const ruCumGpa = calcGpaFromCourses(cumRu, RU_GRADES);

      return `
        <div class="term-card">
          <div class="term-head">
            <div class="term-title-wrap">
              <span class="term-badge tabular">ภาคเรียนที่ ${escapeHtml(term)}</span>
              ${term === '2/68' ? '<span class="term-first-tag">เทอมแรกที่เข้าเรียน</span>' : ''}
              <span style="font-size:12.5px;color:var(--text-muted);">${items.length} รายวิชา</span>
            </div>
            <div class="term-metrics tabular">
              ${(ui.termProgramFilter === 'all' || ui.termProgramFilter === 'dei') && deiItems.length > 0 ? `
                <div class="term-metric">
                  <span style="color:var(--dei-primary);font-weight:700;">สทก.:</span>
                  <strong>${deiPassedCr}/${deiRegCr} นก.</strong>
                  <span>GPA <strong>${formatGpa(deiTermGpa)}</strong> (สะสม ${formatGpa(deiCumGpa)})</span>
                </div>
              ` : ''}
              ${(ui.termProgramFilter === 'all' || ui.termProgramFilter === 'ru') && ruItems.length > 0 ? `
                <div class="term-metric">
                  <span style="color:var(--ru-primary);font-weight:700;">ม.รามฯ:</span>
                  <strong>${ruPassedCr}/${ruRegCr} นก.</strong>
                  <span>GPA <strong>${formatGpa(ruTermGpa)}</strong> (สะสม ${formatGpa(ruCumGpa)})</span>
                </div>
              ` : ''}
            </div>
          </div>

          ${items.length === 0 ? `
            <div class="empty-state">
              ยังไม่มีรายวิชาในภาคเรียน <strong>${escapeHtml(term)}</strong> — เลือกภาคเรียน "${escapeHtml(term)}" จากแท็บ สทก. ม.ปลาย หรือ Pre-degree ม.รามฯ เพื่อแสดงที่นี่ครับ
            </div>
          ` : `
            <div class="table-wrap">
              <table class="sheet">
                <thead>
                  <tr>
                    <th style="width:108px;">หลักสูตร</th>
                    <th style="width:110px;">รหัสวิชา</th>
                    <th>ชื่อรายวิชา</th>
                    <th style="width:130px;">หมวดวิชา</th>
                    <th style="width:52px;">นก.</th>
                    <th style="width:115px;">สถานะ</th>
                    <th style="width:85px;">เกรด</th>
                    <th style="width:130px;">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((c) => {
                    const statusLabel = (COURSE_STATUSES.find((s) => s.value === c.status) || COURSE_STATUSES[0]).label;
                    return `
                      <tr class="row-${c.status}">
                        <td data-label="หลักสูตร">
                          <span class="program-tag ${c.program}" style="margin:0;">
                            ${c.program === 'dei' ? 'สทก. ม.ปลาย' : 'ม.รามฯ Pre-deg'}
                          </span>
                        </td>
                        <td data-label="รหัสวิชา"><span class="course-code ${c.program}">${escapeHtml(c.code)}</span></td>
                        <td class="m-full" data-label="ชื่อรายวิชา"><span class="course-name">${escapeHtml(c.name)}</span></td>
                        <td data-label="หมวดวิชา" style="font-size:12px;color:var(--text-muted);">${escapeHtml(c.groupTitle)}</td>
                        <td data-label="หน่วยกิต" class="tabular" style="font-weight:700;">${c.credits}</td>
                        <td data-label="สถานะ"><span style="font-size:12.5px;font-weight:600;">${escapeHtml(statusLabel)}</span></td>
                        <td data-label="เกรด" class="tabular" style="font-weight:700;font-size:14px;">${escapeHtml(c.grade || '—')}</td>
                        <td class="m-full" data-label="หมายเหตุ" style="font-size:12px;color:var(--text-muted);">${escapeHtml(c.note || '—')}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;
    })
    .filter(Boolean)
    .join('');

  // Courses with status != not_started but no term assigned
  const unscheduled = pool.filter((c) => !c.term && c.status !== 'not_started');

  const container = document.getElementById('view-terms');
  container.innerHTML = `
    <div class="stack">
      <div class="card">
        <div class="card-header" style="margin-bottom: 12px;">
          <div>
            <h2 class="card-title">ผลการเรียนแยกตามภาคเรียน (เริ่ม 2/68)</h2>
            <p class="card-sub">สรุปรายวิชา หน่วยกิต เกรดเฉลี่ยประจำเทอม (GPA) และเกรดเฉลี่ยสะสม (GPAX) เรียงตามเทอม</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;" class="no-print">
            <button type="button" id="btn-toggle-empty-terms" class="btn btn-secondary btn-sm">
              ${ui.showEmptyTerms ? 'ซ่อนเทอมที่ยังว่าง' : 'แสดงเทอมล่วงหน้าทั้งหมด'}
            </button>
            <button type="button" id="btn-add-term" class="btn btn-primary btn-sm">+ เพิ่มภาคเรียนใหม่</button>
          </div>
        </div>

        <div class="filter-pills no-print">
          ${[
            { k: 'all', l: 'รวมทั้ง 2 หลักสูตร' },
            { k: 'dei', l: 'เฉพาะ สทก.ทางไกล ม.ปลาย' },
            { k: 'ru', l: 'เฉพาะ Pre-degree ม.รามฯ' },
          ].map((f) => `<button type="button" class="pill ${ui.termProgramFilter === f.k ? 'active' : ''}" data-term-filter="${f.k}">${f.l}</button>`).join('')}
        </div>
      </div>

      ${termCards}

      ${unscheduled.length > 0 ? `
        <div class="term-card" style="border-color: var(--amber-border);">
          <div class="term-head" style="background: var(--amber-soft);">
            <div class="term-title-wrap">
              <strong style="color: var(--amber);">รายวิชาที่ติ๊กเรียน/ผ่านแล้ว แต่ยังไม่ได้ระบุภาคเรียน (${unscheduled.length} วิชา)</strong>
            </div>
          </div>
          <div class="table-wrap">
            <table class="sheet">
              <thead>
                <tr>
                  <th>หลักสูตร</th>
                  <th>รหัสวิชา</th>
                  <th>ชื่อรายวิชา</th>
                  <th>นก.</th>
                  <th>เกรด</th>
                </tr>
              </thead>
              <tbody>
                ${unscheduled.map((c) => `
                  <tr>
                    <td data-label="หลักสูตร"><span class="program-tag ${c.program}" style="margin:0;">${c.program === 'dei' ? 'สทก. ม.ปลาย' : 'ม.รามฯ'}</span></td>
                    <td data-label="รหัสวิชา"><span class="course-code ${c.program}">${escapeHtml(c.code)}</span></td>
                    <td class="m-full" data-label="ชื่อรายวิชา">${escapeHtml(c.name)}</td>
                    <td data-label="หน่วยกิต" class="tabular">${c.credits}</td>
                    <td data-label="เกรด" class="tabular">${escapeHtml(c.grade || '—')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ================= VIEW 5: CALENDAR & MAKEUP EXAMS =================
const EVENT_TYPES = {
  exam: { label: 'สอบ', icon: '📝', color: '#ec4899' },
  makeup: { label: 'สอบซ่อม', icon: '🔁', color: '#ef4444' },
  assignment: { label: 'ส่งงาน', icon: '📚', color: '#f59e0b' },
  group: { label: 'พบกลุ่ม / เรียน', icon: '👩‍🏫', color: '#14b8a6' },
  kpc: { label: 'กพช.', icon: '🌱', color: '#22c55e' },
  other: { label: 'อื่น ๆ', icon: '⭐', color: '#8b5cf6' },
};
const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const TH_DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDateStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatThaiDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-').map(Number);
  return `${d} ${TH_MONTHS[m - 1]} ${y + 543}`;
}

function upcomingEvents() {
  const today = toDateStr(new Date());
  return (state.events || [])
    .filter((e) => e.date >= today)
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
}

function daysUntil(str) {
  const [y, m, d] = str.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

function renderCalendarView() {
  const y = ui.calYear;
  const m = ui.calMonth;
  const todayStr = toDateStr(new Date());
  const startDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const events = state.events || [];
  const byDate = {};
  events.forEach((e) => {
    (byDate[e.date] = byDate[e.date] || []).push(e);
  });

  let cells = '';
  for (let i = 0; i < startDow; i += 1) cells += '<div class="cal-cell cal-empty"></div>';
  for (let d = 1; d <= daysInMonth; d += 1) {
    const ds = `${y}-${pad2(m + 1)}-${pad2(d)}`;
    const evs = byDate[ds] || [];
    const cls = ['cal-cell'];
    if (ds === todayStr) cls.push('cal-today');
    if (ds === ui.calSelected) cls.push('cal-selected');
    cells += `
      <button type="button" class="${cls.join(' ')}" data-cal-day="${ds}">
        <span class="cal-num">${d}</span>
        <span class="cal-dots">
          ${evs.slice(0, 4).map((e) => `<i style="background:${(EVENT_TYPES[e.type] || EVENT_TYPES.other).color}"></i>`).join('')}
        </span>
        ${evs.length > 0 ? `<span class="cal-count">${evs.length}</span>` : ''}
      </button>`;
  }

  const sel = ui.calSelected || todayStr;
  const selEvents = byDate[sel] || [];

  const upcoming = upcomingEvents().slice(0, 8);

  // Courses not passed yet -> auto-match with ภาค ซ.1/2569 schedule
  const allCourses = [...getAllDeiCourses(), ...getAllRuCourses()];
  const failed = allCourses.filter((c) => c.status === 'failed');
  const waiting = allCourses.filter((c) => c.status === 'in_progress');
  const ruUnpassedAll = getAllRuCourses().filter(
    (c) => c.status !== 'passed' && c.code && !c.code.includes('XXXX') && c.code !== 'ยังไม่เลือก' && c.code !== 'เลือกเสรี'
  );

  const makeupTargets =
    ui.makeupScope === 'all_ru_unpassed'
      ? ruUnpassedAll
      : [...failed, ...waiting.filter((c) => c.program === 'ru')];

  const makeupRows = makeupTargets.map((c) => ({
    course: c,
    slot: c.program === 'ru' ? MakeupSchedule.parseMakeupSlot(c.code) : null,
  }));

  // Detect exam time conflicts across makeupTargets
  const slotCounts = {};
  makeupRows.forEach((r) => {
    if (r.slot && r.slot.slotKey) {
      slotCounts[r.slot.slotKey] = (slotCounts[r.slot.slotKey] || 0) + 1;
    }
  });
  const conflictSlots = new Set(Object.keys(slotCounts).filter((k) => slotCounts[k] > 1));

  // Search box results against ภาค ซ.1/2569 lookup table
  const mq = ui.makeupSearch.trim().toUpperCase();
  const lookupMatches = mq
    ? Object.keys(MakeupSchedule.MAKEUP_RE169)
        .filter((code) => code.includes(mq))
        .slice(0, 12)
        .map((code) => MakeupSchedule.parseMakeupSlot(code))
    : [];

  const typeOptions = Object.entries(EVENT_TYPES)
    .map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`)
    .join('');

  document.getElementById('view-calendar').innerHTML = `
    <div class="stack">
      <div class="card kawaii-hero">
        <h2 class="card-title">🌸 ปฏิทินการศึกษา &amp; ตารางสอบซ่อม ซ.1/2569</h2>
        <p class="card-sub">จดวันสอบ วันสอบซ่อม ส่งงาน กพช. พร้อมค้นหาและจับคู่วันสอบซ่อม ม.รามฯ ภาค ซ.1/2569 (21–26 ม.ค. 2570) อัตโนมัติ ✨</p>
      </div>

      <div class="grid-2 cal-layout">
        <div class="card">
          <div class="cal-head" style="flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary btn-sm" data-cal-nav="-1">‹</button>
            <strong class="cal-title">${TH_MONTHS[m]} ${y + 543}</strong>
            <button type="button" class="btn btn-secondary btn-sm" data-cal-nav="1">›</button>
            <button type="button" class="btn btn-primary btn-sm" data-cal-nav="today">วันนี้</button>
            <button type="button" class="btn btn-dei btn-sm" data-cal-nav="makeup2569">ซ.1/2569 (ม.ค. 70)</button>
          </div>
          <div class="cal-grid cal-dow">${TH_DOW.map((d) => `<span>${d}</span>`).join('')}</div>
          <div class="cal-grid">${cells}</div>
          <div class="cal-legend">
            ${Object.values(EVENT_TYPES).map((t) => `<span><i style="background:${t.color}"></i>${t.label}</span>`).join('')}
          </div>
        </div>

        <div class="stack">
          <div class="card">
            <h3 class="card-title">📌 ${formatThaiDate(sel)}</h3>
            <div class="kpc-list" style="max-height:200px;margin:10px 0;">
              ${selEvents.length === 0 ? '<div class="empty-state" style="padding:14px;">ยังไม่มีนัดหมายในวันนี้ 🍡</div>' : selEvents.map((e) => {
                const t = EVENT_TYPES[e.type] || EVENT_TYPES.other;
                return `
                <div class="kpc-row">
                  <div><span style="color:${t.color};font-weight:700;">${t.icon} ${t.label}</span> — <strong>${escapeHtml(e.title)}</strong>
                    ${e.time ? `<span style="color:var(--text-muted);font-size:12px;"> ⏰ ${escapeHtml(e.time)}</span>` : ''}
                    ${e.note ? `<div style="font-size:12px;color:var(--text-muted);">${escapeHtml(e.note)}</div>` : ''}
                  </div>
                  <button type="button" class="btn btn-danger-ghost" data-cal-del="${e.id}">✕</button>
                </div>`;
              }).join('')}
            </div>
            <form id="cal-form" class="stack" style="gap:8px;">
              <input id="cal-title" class="input" placeholder="ชื่อนัดหมาย เช่น สอบซ่อม JPN1011 หรือ สอบกลางภาค" required />
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <input id="cal-date" type="date" class="input" value="${sel}" required />
                <input id="cal-time" type="time" class="input" />
              </div>
              <select id="cal-type" class="select">${typeOptions}</select>
              <input id="cal-note" class="input" placeholder="โน้ต (คาบ A/B • ห้องสอบ • สิ่งที่ต้องเตรียม)" />
              <button type="submit" class="btn btn-primary">＋ เพิ่มลงปฏิทิน</button>
            </form>
          </div>

          <div class="card">
            <h3 class="card-title">⏳ นัดหมายที่กำลังจะถึง</h3>
            <div class="kpc-list" style="max-height:240px;margin-top:10px;">
              ${upcoming.length === 0 ? '<div class="empty-state" style="padding:14px;">ยังไม่มีนัดหมายที่จะถึง ✨</div>' : upcoming.map((e) => {
                const t = EVENT_TYPES[e.type] || EVENT_TYPES.other;
                const n = daysUntil(e.date);
                return `
                <div class="kpc-row">
                  <div><span style="color:${t.color};font-weight:700;">${t.icon}</span> <strong>${escapeHtml(e.title)}</strong>
                    <div style="font-size:12px;color:var(--text-muted);">${formatThaiDate(e.date)}${e.time ? ` • ${escapeHtml(e.time)}` : ''}</div>
                  </div>
                  <span class="credit-badge ${n <= 3 ? '' : 'dei'}" style="${n <= 3 ? 'background:#fee2e2;color:#dc2626;' : ''}">${n === 0 ? 'วันนี้!' : `อีก ${n} วัน`}</span>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- AUTO MAKEUP EXAM TRACKER (RE 1/2569) -->
      <div class="card">
        <div class="card-header" style="margin-bottom:10px;">
          <div>
            <h3 class="card-title">🔁 ตารางสอบซ่อม ภาค ${escapeHtml(MakeupSchedule.MAKEUP_TERM_LABEL)} ของวิชาที่ยังไม่ผ่าน</h3>
            <p class="card-sub">จับคู่รหัสวิชาจากไฟล์สอบซ่อม ภาค ซ.1/2569 ให้อัตโนมัติ (คาบ A = 09:30–12:00 น. • คาบ B = 14:00–16:30 น.)</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="pill ${ui.makeupScope === 'failed_or_active' ? 'active' : ''}" data-makeup-scope="failed_or_active">ไม่ผ่าน / กำลังเรียน (${failed.length + waiting.filter((c) => c.program === 'ru').length})</button>
            <button type="button" class="pill ${ui.makeupScope === 'all_ru_unpassed' ? 'active' : ''}" data-makeup-scope="all_ru_unpassed">วิชา ม.รามฯ ที่ยังไม่ผ่านทั้งหมด (${ruUnpassedAll.length})</button>
            ${makeupRows.some((r) => r.slot && r.slot.date) ? `<button type="button" id="btn-makeup-add-all" class="btn btn-primary btn-sm">✨ ลงปฏิทินทั้งหมด</button>` : ''}
          </div>
        </div>

        ${makeupRows.length === 0 ? `
          <div class="empty-state">ยังไม่มีวิชาที่ตั้งสถานะ "ไม่ผ่าน/รอซ่อม" หรือ "กำลังเรียน" ของ ม.รามฯ 🎉<br />
          <span style="font-size:12px;">ลองกดปุ่ม <strong>"วิชา ม.รามฯ ที่ยังไม่ผ่านทั้งหมด"</strong> ด้านบน หรือค้นหารหัสวิชาด้านล่างได้เลยค่ะ</span></div>
        ` : makeupRows.map(({ course: c, slot }, i) => {
          const hasConflict = slot && slot.slotKey && conflictSlots.has(slot.slotKey);
          const alreadyInCal = slot && slot.date && events.some((ev) => ev.type === 'makeup' && ev.date === slot.date && ev.title.includes(c.code));
          return `
            <div class="kpc-row" style="flex-wrap:wrap;gap:8px;margin-bottom:8px;${hasConflict ? 'border-color:#fca5a5;background:#fff5f5;' : ''}">
              <div style="flex:1;min-width:220px;">
                <span class="course-code ${c.program}">${escapeHtml(c.code)}</span>
                <strong>${escapeHtml(c.name)}</strong>
                <span class="credit-badge ${c.status === 'failed' ? '' : 'dei'}" style="margin-left:6px;font-size:11px;${c.status === 'failed' ? 'background:#fee2e2;color:#dc2626;border-color:#fca5a5;' : ''}">
                  ${(COURSE_STATUSES.find((s) => s.value === c.status) || COURSE_STATUSES[0]).label}
                </span>
                <div style="font-size:12.5px;margin-top:3px;color:${slot ? (slot.isFaculty ? 'var(--amber)' : '#9333ea') : 'var(--text-muted)'};font-weight:600;">
                  ${slot ? `📅 ${escapeHtml(slot.label)}` : (c.program === 'ru' ? 'ไม่พบในตาราง ซ.1/2569 (กำหนดวันเองได้)' : 'สทก. ม.ปลาย (ใส่วันสอบซ่อมเองได้)')}
                </div>
                ${hasConflict ? `<span class="dup-warn">⚠ เวลาสอบซ่อมชนกับวิชาอื่นในรายการ!</span>` : ''}
              </div>
              <input type="date" class="input" id="makeup-date-${i}" value="${slot?.date || ''}" style="max-width:165px;" />
              <button type="button" class="btn ${alreadyInCal ? 'btn-secondary' : 'btn-primary'} btn-sm"
                data-makeup-add="${i}"
                data-makeup-code="${escapeHtml(c.code)}"
                data-makeup-name="${escapeHtml(c.name)}"
                data-makeup-time="${slot?.time || ''}"
                data-makeup-note="${slot ? `ภาค ซ.1/2569 ${slot.session ? `คาบ ${slot.session}` : 'คณะจัดสอบเอง'}` : ''}">
                ${alreadyInCal ? 'ลงแล้ว ✓' : '🌸 ลงปฏิทิน'}
              </button>
            </div>
          `;
        }).join('')}

        <!-- QUICK MAKEUP SCHEDULE SEARCH (RE 1/2569) -->
        <div style="margin-top:16px;padding-top:14px;border-top:2px dashed var(--border);">
          <strong style="font-size:13.5px;">🔎 ค้นหาวันสอบซ่อม ภาค ซ.1/2569 (จากไฟล์ที่แนบมา)</strong>
          <p style="margin:2px 0 8px;font-size:12px;color:var(--text-muted);">พิมพ์รหัสวิชา เช่น <code>JPN1011</code>, <code>RAM1111</code>, <code>PSY2002</code>, <code>ENG1001</code> เพื่อดูวันสอบซ่อมและกดลงปฏิทินได้ทันที</p>
          <input id="makeup-search-input" type="search" class="input" value="${escapeHtml(ui.makeupSearch)}" placeholder="พิมพ์รหัสวิชา JPN / PSY / RAM ..." style="max-width:360px;" />
          ${mq ? `
            <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px;">
              ${lookupMatches.length === 0 ? '<div style="font-size:12.5px;color:var(--text-muted);">ไม่พบรหัสวิชานี้ในฐานข้อมูล ซ.1/2569</div>' : lookupMatches.map((slot) => `
                <div class="kpc-row" style="flex-wrap:wrap;">
                  <div>
                    <span class="course-code">${escapeHtml(slot.code)}</span>
                    <span style="margin-left:8px;font-size:13px;font-weight:600;color:${slot.isFaculty ? 'var(--amber)' : '#9333ea'};">📅 ${escapeHtml(slot.label)}</span>
                  </div>
                  ${slot.date ? `
                    <button type="button" class="btn btn-primary btn-sm" data-lookup-add="${escapeHtml(slot.code)}" data-lookup-date="${slot.date}" data-lookup-time="${slot.time}" data-lookup-session="${slot.session}">
                      🌸 ลงปฏิทิน
                    </button>
                  ` : '<span style="font-size:12px;color:var(--amber);">ติดต่อคณะ</span>'}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// ================= MASTER RENDER =================
function renderActiveView() {
  updateTabChips();
  document.querySelectorAll('.nav-tab, .mobile-nav-item').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === ui.activeTab);
  });
  document.querySelectorAll('.tab-view').forEach((sec) => {
    sec.classList.toggle('hidden', sec.id !== `view-${ui.activeTab}`);
  });

  if (ui.activeTab === 'overview') renderOverview();
  else if (ui.activeTab === 'dei') renderDeiView();
  else if (ui.activeTab === 'ru') renderRuView();
  else if (ui.activeTab === 'terms') renderTermsView();
  else if (ui.activeTab === 'calendar') renderCalendarView();
}

// ================= MODALS =================
function openModal(html) {
  const backdrop = document.getElementById('modal-backdrop');
  const box = document.getElementById('modal-box');
  box.innerHTML = html;
  backdrop.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
}

function showRuPlanModal() {
  openModal(`
    <div class="modal-header">
      <h3>แผนการเรียนแนะนำ 4 ปี — เอกภาษาญี่ปุ่น (ระเบียบการหน้า 158)</h3>
      <button type="button" class="btn btn-ghost btn-sm" data-close-modal>✕ ปิด</button>
    </div>
    <p style="margin:0 0 14px;font-size:13px;color:var(--text-muted);">
      แผนแนะนำจากคณะมนุษยศาสตร์ ม.รามคำแหง (รวม 132 หน่วยกิต) สำหรับดูประกอบการวางแผนลงทะเบียน Pre-degree ของคุณ (สามารถปรับลำดับลงเรียนตามจริงได้ โดยดูวิชาบังคับก่อน ** เป็นหลัก)
    </p>
    <div class="plan-grid">
      ${RU_SUGGESTED_PLAN.map((p) => `
        <div class="plan-box">
          <h4>${escapeHtml(p.year)}</h4>
          <ul>
            ${p.items.map((it) => `<li>${escapeHtml(it)}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </div>
  `);
}

function showAddTermModal() {
  openModal(`
    <div class="modal-header">
      <h3>เพิ่มภาคเรียนใหม่</h3>
      <button type="button" class="btn btn-ghost btn-sm" data-close-modal>✕ ปิด</button>
    </div>
    <form id="modal-add-term-form">
      <div class="form-group">
        <label for="new-term-input">ชื่อภาคเรียน (เช่น 1/73, 2/73, ซ่อม 2/68)</label>
        <input id="new-term-input" type="text" class="input" placeholder="1/73" required />
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;">
        <button type="button" class="btn btn-secondary" data-close-modal>ยกเลิก</button>
        <button type="submit" class="btn btn-primary">เพิ่มภาคเรียน</button>
      </div>
    </form>
  `);
  setTimeout(() => document.getElementById('new-term-input')?.focus(), 50);
}

function showBackupAndSetupModal() {
  const isCloud = storage.isCloudMode;
  openModal(`
    <div class="modal-header">
      <h3>สำรองข้อมูล &amp; การตั้งค่า Supabase (ล็อกใช้คนเดียว)</h3>
      <button type="button" class="btn btn-ghost btn-sm" data-close-modal>✕ ปิด</button>
    </div>

    <div class="stack">
      <div class="card" style="padding:16px;background:var(--surface-subtle);">
        <h4 style="margin:0 0 8px;">1. สำรอง / กู้คืนข้อมูลด้วยไฟล์ JSON</h4>
        <p style="margin:0 0 12px;font-size:12.5px;color:var(--text-muted);">
          เก็บสำเนาผลการเรียนทั้งหมดไว้ในเครื่องเป็นไฟล์ .json เผื่อป้องกันข้อมูลหายหรือย้ายเครื่องได้ทุกเมื่อ
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" id="btn-export-json" class="btn btn-primary btn-sm">ดาวน์โหลดไฟล์สำรอง (.json)</button>
          <label class="btn btn-secondary btn-sm" style="cursor:pointer;">
            นำเข้าไฟล์สำรอง (.json)
            <input id="input-import-json" type="file" accept="application/json" style="display:none;" />
          </label>
        </div>
      </div>

      <div class="card" style="padding:16px;">
        <h4 style="margin:0 0 8px;">
          2. สถานะ Supabase Cloud:
          <span style="color:${isCloud ? 'var(--success)' : 'var(--amber)'};">
            ${isCloud ? `เชื่อมต่อแล้ว (${escapeHtml(storage.user?.email || '')})` : 'ยังไม่ได้ตั้งค่า (Local Mode)'}
          </span>
        </h4>
        ${lastSyncError ? `
          <div class="login-error" style="margin-bottom:12px;">
            <strong>รายละเอียดข้อผิดพลาดล่าสุด:</strong><br />
            <code>${escapeHtml(lastSyncError)}</code>
            <div style="margin-top:8px;">
              <button type="button" id="btn-retry-sync" class="btn btn-secondary btn-sm">ลองเชื่อมต่อใหม่</button>
            </div>
          </div>
        ` : ''}
        <p style="margin:0 0 10px;font-size:12.5px;color:var(--text-muted);">
          วิธีทำให้เว็บนี้บน <strong>GitHub Pages</strong> เก็บข้อมูลไม่หายและ <strong>ล็อกให้เข้าได้แค่คุณคนเดียว</strong>:
        </p>
        <ol class="guide-steps">
          <li>สมัครฟรีที่ <strong>supabase.com</strong> → สร้างโปรเจกต์ใหม่ (เลือก Region: <strong>Singapore</strong>)</li>
          <li>เปิด <strong>SQL Editor</strong> → วางโค้ดจากไฟล์ <code>supabase-schema.sql</code> แล้วกด <strong>Run</strong> (สร้างตาราง + เปิด RLS ล็อกสิทธิ์เฉพาะเจ้าของ)</li>
          <li>ไปที่ <strong>Authentication → Users → Add user → Create new user</strong> ใส่อีเมล/รหัสผ่านของคุณเอง แล้วติ๊ก <strong>Auto Confirm User</strong></li>
          <li>ไปที่ <strong>Authentication → Sign In / Providers</strong> → ปิดสวิตช์ <strong>Allow new users to sign up</strong> เพื่อไม่ให้คนอื่นสมัครเข้ามาได้</li>
          <li>ไปที่ <strong>Project Settings → API</strong> คัดลอก <code>Project URL</code> และ <code>anon public key</code> ไปใส่ในไฟล์ <code>config.js</code> แล้ว push ขึ้น GitHub Pages ได้เลย!</li>
        </ol>
      </div>
    </div>
  `);
}

// ================= EVENT DELEGATION =================
function bindGlobalEvents() {
  // Tab switching (desktop + mobile bottom nav)
  document.querySelectorAll('.nav-tab, .mobile-nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.activeTab = btn.dataset.tab;
      renderActiveView();
      if (window.innerWidth <= 768) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  // Topbar actions
  document.getElementById('btn-print').addEventListener('click', () => window.print());
  document.getElementById('btn-backup').addEventListener('click', showBackupAndSetupModal);
  document.getElementById('sync-pill').addEventListener('click', showBackupAndSetupModal);
  document.getElementById('btn-open-supabase-guide').addEventListener('click', showBackupAndSetupModal);

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await storage.signOut();
    document.getElementById('app-shell').classList.add('hidden');
    document.getElementById('login-gate').classList.remove('hidden');
    showToast('ออกจากระบบเรียบร้อยแล้ว');
  });

  // Migration from local to cloud
  document.getElementById('btn-migrate-yes').addEventListener('click', async () => {
    if (pendingLocalDraft) {
      state = normalizeState(pendingLocalDraft);
      pendingLocalDraft = null;
      document.getElementById('migrate-banner').classList.add('hidden');
      renderActiveView();
      scheduleSave();
      showToast('นำเข้าข้อมูลจากเครื่องขึ้น Supabase แล้ว!');
    }
  });
  document.getElementById('btn-migrate-no').addEventListener('click', () => {
    pendingLocalDraft = null;
    document.getElementById('migrate-banner').classList.add('hidden');
  });

  // Login form
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errBox = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');

    errBox.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังเข้าสู่ระบบ...';

    try {
      await storage.signIn(email, password);
      await enterAuthenticatedApp();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'เข้าสู่ระบบ';
    }
  });

  // Modal backdrop close & delegated modal events
  const backdrop = document.getElementById('modal-backdrop');
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('[data-close-modal]')) {
      closeModal();
    }
    if (e.target.id === 'btn-retry-sync') {
      closeModal();
      enterAuthenticatedApp();
    }
    if (e.target.id === 'btn-export-json') {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `study-tracker-backup-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('ดาวน์โหลดไฟล์สำรองเรียบร้อยแล้ว');
    }
  });

  backdrop.addEventListener('submit', (e) => {
    if (e.target.id === 'modal-add-term-form') {
      e.preventDefault();
      const val = document.getElementById('new-term-input').value.trim();
      if (!val) return;
      if (!state.terms.includes(val)) {
        state.terms.push(val);
        scheduleSave();
        showToast(`เพิ่มภาคเรียน ${val} แล้ว`);
      }
      closeModal();
      renderActiveView();
    }
  });

  backdrop.addEventListener('change', (e) => {
    if (e.target.id === 'input-import-json') {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          state = normalizeState(parsed);
          scheduleSave();
          closeModal();
          renderActiveView();
          showToast('นำเข้าข้อมูลจากไฟล์สำรองเรียบร้อยแล้ว!');
        } catch {
          showToast('ไฟล์ JSON ไม่ถูกต้อง');
        }
      };
      reader.readAsText(file);
    }
  });

  // Delegated clicks inside main views
  const main = document.querySelector('main.container');

  main.addEventListener('click', (e) => {
    const gotoBtn = e.target.closest('[data-goto-tab]');
    if (gotoBtn) {
      ui.activeTab = gotoBtn.dataset.gotoTab;
      renderActiveView();
      return;
    }

    // DEI filters
    const deiFilter = e.target.closest('[data-dei-filter]');
    if (deiFilter) {
      ui.deiStatusFilter = deiFilter.dataset.deiFilter;
      renderDeiView();
      return;
    }

    // DEI compulsory toggle
    const deiCompToggle = e.target.closest('[data-dei-comp-toggle]');
    if (deiCompToggle) {
      const id = deiCompToggle.dataset.deiCompToggle;
      applySmartRecordChange(state.dei.compulsory[id], 'toggleCheck', null, DEI_GRADES);
      scheduleSave();
      renderDeiView();
      return;
    }

    // DEI elective toggle / add / delete
    const deiElecToggle = e.target.closest('[data-dei-elec-toggle]');
    if (deiElecToggle) {
      const item = state.dei.electives.find((x) => x.id === deiElecToggle.dataset.deiElecToggle);
      if (item) {
        applySmartRecordChange(item, 'toggleCheck', null, DEI_GRADES);
        scheduleSave();
        renderDeiView();
      }
      return;
    }

    if (e.target.id === 'btn-add-dei-elective') {
      state.dei.electives.push({
        id: uid('dei-e'),
        code: '',
        name: '',
        credits: 3,
        tag: 'เลือกเสรี',
        status: 'not_started',
        grade: '',
        term: '',
        note: '',
      });
      scheduleSave();
      renderDeiView();
      showToast('เพิ่มช่องรายวิชาเลือก สทก. แล้ว');
      return;
    }

    const deiElecDel = e.target.closest('[data-dei-elec-del]');
    if (deiElecDel) {
      state.dei.electives = state.dei.electives.filter((x) => x.id !== deiElecDel.dataset.deiElecDel);
      scheduleSave();
      renderDeiView();
      return;
    }

    // KPC delete & DEI requirements toggles
    const kpcDel = e.target.closest('[data-kpc-del]');
    if (kpcDel) {
      state.dei.kpcLogs = state.dei.kpcLogs.filter((x) => x.id !== kpcDel.dataset.kpcDel);
      scheduleSave();
      renderDeiView();
      return;
    }

    if (e.target.id === 'btn-toggle-ethics') {
      state.dei.ethicsPassed = !state.dei.ethicsPassed;
      scheduleSave();
      renderDeiView();
      return;
    }

    if (e.target.id === 'btn-toggle-nnet') {
      state.dei.nnetPassed = !state.dei.nnetPassed;
      scheduleSave();
      renderDeiView();
      return;
    }

    // RU filters & modals
    const ruCat = e.target.closest('[data-ru-cat]');
    if (ruCat) {
      ui.ruCategoryFilter = ruCat.dataset.ruCat;
      renderRuView();
      return;
    }

    const ruStatus = e.target.closest('[data-ru-status]');
    if (ruStatus) {
      ui.ruStatusFilter = ruStatus.dataset.ruStatus;
      renderRuView();
      return;
    }

    if (e.target.id === 'btn-ru-plan') {
      showRuPlanModal();
      return;
    }

    // RU toggle check
    const ruToggle = e.target.closest('[data-ru-toggle]');
    if (ruToggle) {
      const [bucket, id] = ruToggle.dataset.ruToggle.split(':');
      applySmartRecordChange(state.ru[bucket][id], 'toggleCheck', null, RU_GRADES);
      scheduleSave();
      renderRuView();
      return;
    }

    // Calendar controls
    const calDay = e.target.closest('[data-cal-day]');
    if (calDay) {
      ui.calSelected = calDay.dataset.calDay;
      renderCalendarView();
      return;
    }

    const calNav = e.target.closest('[data-cal-nav]');
    if (calNav) {
      const v = calNav.dataset.calNav;
      if (v === 'today') {
        const now = new Date();
        ui.calYear = now.getFullYear();
        ui.calMonth = now.getMonth();
        ui.calSelected = toDateStr(now);
      } else if (v === 'makeup2569') {
        ui.calYear = 2027;
        ui.calMonth = 0;
        ui.calSelected = '2027-01-21';
      } else {
        const dt = new Date(ui.calYear, ui.calMonth + Number(v), 1);
        ui.calYear = dt.getFullYear();
        ui.calMonth = dt.getMonth();
      }
      renderCalendarView();
      return;
    }

    const makeupScope = e.target.closest('[data-makeup-scope]');
    if (makeupScope) {
      ui.makeupScope = makeupScope.dataset.makeupScope;
      renderCalendarView();
      return;
    }

    if (e.target.id === 'btn-makeup-add-all') {
      const allCourses = [...getAllDeiCourses(), ...getAllRuCourses()];
      const failed = allCourses.filter((c) => c.status === 'failed');
      const waitingRu = allCourses.filter((c) => c.status === 'in_progress' && c.program === 'ru');
      const ruUnpassedAll = getAllRuCourses().filter(
        (c) => c.status !== 'passed' && c.code && !c.code.includes('XXXX') && c.code !== 'ยังไม่เลือก' && c.code !== 'เลือกเสรี'
      );
      const targets = ui.makeupScope === 'all_ru_unpassed' ? ruUnpassedAll : [...failed, ...waitingRu];
      let added = 0;
      let firstDate = '';
      targets.forEach((c) => {
        if (c.program !== 'ru') return;
        const slot = MakeupSchedule.parseMakeupSlot(c.code);
        if (!slot || !slot.date) return;
        const exists = (state.events || []).some(
          (ev) => ev.type === 'makeup' && ev.date === slot.date && ev.title.includes(c.code)
        );
        if (exists) return;
        state.events.push({
          id: uid('ev'),
          title: `สอบซ่อม ${c.code} ${c.name}`,
          date: slot.date,
          time: slot.time || '',
          type: 'makeup',
          note: `ภาค ซ.1/2569 ${slot.session ? `คาบ ${slot.session}` : 'คณะจัดสอบเอง'}`,
        });
        if (!firstDate) firstDate = slot.date;
        added += 1;
      });
      if (added > 0) {
        const [yy, mm] = (firstDate || '2027-01-21').split('-').map(Number);
        ui.calYear = yy;
        ui.calMonth = mm - 1;
        ui.calSelected = firstDate || '2027-01-21';
        scheduleSave();
        renderCalendarView();
        showToast(`เพิ่มวันสอบซ่อมลงปฏิทินแล้ว ${added} วิชา ✨`);
      } else {
        showToast('วิชาที่มีตารางสอบซ่อมทั้งหมดลงในปฏิทินเรียบร้อยแล้ว 🌸');
      }
      return;
    }

    const calDel = e.target.closest('[data-cal-del]');
    if (calDel) {
      state.events = state.events.filter((x) => x.id !== calDel.dataset.calDel);
      scheduleSave();
      renderCalendarView();
      return;
    }

    const makeupBtn = e.target.closest('[data-makeup-add]');
    if (makeupBtn) {
      const input = document.getElementById(`makeup-date-${makeupBtn.dataset.makeupAdd}`);
      if (!input || !input.value) {
        showToast('เลือกวันสอบซ่อมก่อนนะ 🌸');
        return;
      }
      const code = makeupBtn.dataset.makeupCode || '';
      const name = makeupBtn.dataset.makeupName || '';
      const time = makeupBtn.dataset.makeupTime || '';
      const note = makeupBtn.dataset.makeupNote || '';
      const exists = (state.events || []).some(
        (ev) => ev.type === 'makeup' && ev.date === input.value && code && ev.title.includes(code)
      );
      const [yy, mm] = input.value.split('-').map(Number);
      ui.calYear = yy;
      ui.calMonth = mm - 1;
      ui.calSelected = input.value;
      if (exists) {
        renderCalendarView();
        showToast('วิชานี้ลงในปฏิทินวันนั้นแล้วนะ 🌸');
        return;
      }
      state.events.push({
        id: uid('ev'),
        title: `สอบซ่อม ${code} ${name}`.trim(),
        date: input.value,
        time,
        type: 'makeup',
        note,
      });
      scheduleSave();
      renderCalendarView();
      showToast(`ลงวันสอบซ่อม ${code} ในปฏิทินแล้ว 🔁`);
      return;
    }

    const lookupBtn = e.target.closest('[data-lookup-add]');
    if (lookupBtn) {
      const code = lookupBtn.dataset.lookupAdd;
      const date = lookupBtn.dataset.lookupDate;
      const time = lookupBtn.dataset.lookupTime || '';
      const session = lookupBtn.dataset.lookupSession || '';
      if (!code || !date) return;
      const matched = getAllRuCourses().find((c) => (c.code || '').toUpperCase() === code.toUpperCase());
      const title = matched ? `สอบซ่อม ${code} ${matched.name}` : `สอบซ่อม ${code}`;
      const exists = (state.events || []).some(
        (ev) => ev.type === 'makeup' && ev.date === date && ev.title.includes(code)
      );
      const [yy, mm] = date.split('-').map(Number);
      ui.calYear = yy;
      ui.calMonth = mm - 1;
      ui.calSelected = date;
      if (exists) {
        renderCalendarView();
        showToast(`วิชา ${code} ลงในปฏิทินวันนั้นแล้วนะ 🌸`);
        return;
      }
      state.events.push({
        id: uid('ev'),
        title,
        date,
        time,
        type: 'makeup',
        note: `ภาค ซ.1/2569 ${session ? `คาบ ${session}` : ''}`.trim(),
      });
      scheduleSave();
      renderCalendarView();
      showToast(`ลงวันสอบซ่อม ${code} ในปฏิทินแล้ว 🔁`);
      return;
    }

    // Terms view controls
    const termFilter = e.target.closest('[data-term-filter]');
    if (termFilter) {
      ui.termProgramFilter = termFilter.dataset.termFilter;
      renderTermsView();
      return;
    }

    if (e.target.id === 'btn-toggle-empty-terms') {
      ui.showEmptyTerms = !ui.showEmptyTerms;
      renderTermsView();
      return;
    }

    if (e.target.id === 'btn-add-term') {
      showAddTermModal();
      return;
    }
  });

  // Delegated change events (select dropdowns, numbers)
  main.addEventListener('change', (e) => {
    const el = e.target;

    if (el.dataset.deiCompId) {
      const id = el.dataset.deiCompId;
      const field = el.dataset.field;
      applySmartRecordChange(state.dei.compulsory[id], field, el.value, DEI_GRADES);
      scheduleSave();
      renderDeiView();
      return;
    }

    if (el.dataset.deiElecId) {
      const item = state.dei.electives.find((x) => x.id === el.dataset.deiElecId);
      if (!item) return;
      const field = el.dataset.field;
      const val = field === 'credits' ? Math.max(1, Number(el.value) || 1) : el.value;
      applySmartRecordChange(item, field, val, DEI_GRADES);
      scheduleSave();
      renderDeiView();
      return;
    }

    if (el.dataset.ruBucket && el.dataset.ruId) {
      const bucket = el.dataset.ruBucket;
      const id = el.dataset.ruId;
      const field = el.dataset.field;
      applySmartRecordChange(state.ru[bucket][id], field, el.value, RU_GRADES);
      scheduleSave();
      renderRuView();
      return;
    }
  });

  // Delegated input events (text fields, search boxes, profile)
  main.addEventListener('input', (e) => {
    const el = e.target;

    if (el.dataset.profile) {
      state.profile[el.dataset.profile] = el.value;
      scheduleSave();
      return;
    }

    if (el.id === 'dei-search') {
      ui.deiSearch = el.value;
      const pos = el.selectionStart;
      renderDeiView();
      const next = document.getElementById('dei-search');
      if (next) {
        next.focus();
        next.setSelectionRange(pos, pos);
      }
      return;
    }

    if (el.id === 'ru-search') {
      ui.ruSearch = el.value;
      const pos = el.selectionStart;
      renderRuView();
      const next = document.getElementById('ru-search');
      if (next) {
        next.focus();
        next.setSelectionRange(pos, pos);
      }
      return;
    }

    if (el.id === 'makeup-search-input') {
      ui.makeupSearch = el.value;
      const pos = el.selectionStart;
      renderCalendarView();
      const next = document.getElementById('makeup-search-input');
      if (next) {
        next.focus();
        next.setSelectionRange(pos, pos);
      }
      return;
    }

    if (el.dataset.deiCompId && el.dataset.field === 'note') {
      state.dei.compulsory[el.dataset.deiCompId].note = el.value;
      scheduleSave();
      return;
    }

    if (el.dataset.deiElecId && (el.dataset.field === 'code' || el.dataset.field === 'name')) {
      const item = state.dei.electives.find((x) => x.id === el.dataset.deiElecId);
      if (item) {
        item[el.dataset.field] = el.value;
        scheduleSave();
      }
      return;
    }

    if (el.dataset.ruBucket && el.dataset.ruId && ['note', 'customCode', 'customName'].includes(el.dataset.field)) {
      state.ru[el.dataset.ruBucket][el.dataset.ruId][el.dataset.field] = el.value;
      scheduleSave();
      return;
    }
  });

  // KPC form submit
  main.addEventListener('submit', (e) => {
    if (e.target.id === 'cal-form') {
      e.preventDefault();
      const title = document.getElementById('cal-title').value.trim();
      const date = document.getElementById('cal-date').value;
      if (!title || !date) return;
      state.events.push({
        id: uid('ev'),
        title,
        date,
        time: document.getElementById('cal-time').value,
        type: document.getElementById('cal-type').value,
        note: document.getElementById('cal-note').value.trim(),
      });
      ui.calSelected = date;
      const [yy, mm] = date.split('-').map(Number);
      ui.calYear = yy;
      ui.calMonth = mm - 1;
      scheduleSave();
      renderCalendarView();
      showToast('เพิ่มนัดหมายแล้ว 🌸');
      return;
    }
    if (e.target.id === 'kpc-form') {
      e.preventDefault();
      const title = document.getElementById('kpc-title').value.trim();
      const hours = Number(document.getElementById('kpc-hours').value);
      const term = document.getElementById('kpc-term').value;
      if (!title || !hours || hours <= 0) return;
      state.dei.kpcLogs.push({ id: uid('kpc'), title, hours, term });
      scheduleSave();
      renderDeiView();
      showToast(`เพิ่ม กพช. ${hours} ชั่วโมงแล้ว`);
    }
  });
}

// ================= BOOTSTRAP =================
async function enterAuthenticatedApp() {
  document.getElementById('login-gate').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');

  const isCloud = storage.isCloudMode && Boolean(storage.user);
  document.getElementById('btn-logout').classList.toggle('hidden', !isCloud);
  document.getElementById('local-banner').classList.toggle('hidden', isCloud);

  try {
    const loaded = await storage.loadState();
    lastSyncError = '';
    if (loaded.state) {
      state = normalizeState(loaded.state);
      if (state._migratedToV2) {
        delete state._migratedToV2;
        scheduleSave();
        showToast('อัปเดตหลักสูตร สทก. (สกร. 2567) และบันทึกเกรดจริงให้แล้ว ✓');
      }
    } else {
      state = createDefaultState();
      if (isCloud && !loaded.localDraft) {
        scheduleSave();
      }
    }

    if (loaded.source === 'cloud_empty' && loaded.localDraft) {
      pendingLocalDraft = loaded.localDraft;
      document.getElementById('migrate-banner').classList.remove('hidden');
    }

    const t = formatTime(loaded.updatedAt);
    if (isCloud) {
      setSyncBadge('cloud', t ? `เชื่อมต่อ Supabase แล้ว ✓ (${t})` : 'เชื่อมต่อ Supabase แล้ว ✓');
    } else {
      setSyncBadge('local', 'โหมดเครื่องตัวเอง (Local)');
    }
  } catch (err) {
    console.error(err);
    lastSyncError = err.message || String(err);
    setSyncBadge('error', 'โหลดข้อมูลไม่สำเร็จ — คลิกดูรายละเอียด');
    showToast(lastSyncError);
  }

  renderActiveView();
}

// ================= SWEET FLUFFY EFFECTS =================
function initSweetEffects() {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 1. Ambient falling fluffy puffs & dessert sprinkles
  const layer = document.createElement('div');
  layer.className = 'sweet-particles';
  layer.setAttribute('aria-hidden', 'true');

  const symbols = ['🧸', '🐻', '🐾', '♡', '♥', '🎀', '✦', '✧', '☁️', '🐾', '♡'];
  const colors = ['#ff85b3', '#b37352', '#e86a96', '#995d3c', '#f5a8c6', '#d89658'];
  const puffColors = ['#ffd6e6', '#ffe9f0', '#f5dfd0', '#fff1e6'];
  const isMobile = window.innerWidth <= 768;
  const totalFlakes = isMobile ? 12 : 20;
  const totalPuffs = isMobile ? 7 : 12;

  for (let i = 0; i < totalFlakes; i += 1) {
    const el = document.createElement('span');
    el.className = 'sweet-flake';
    el.textContent = symbols[i % symbols.length];
    el.style.setProperty('--x', `${(Math.random() * 96 + 2).toFixed(1)}%`);
    el.style.setProperty('--size', `${(11 + Math.random() * 9).toFixed(0)}px`);
    el.style.setProperty('--dur', `${(11 + Math.random() * 11).toFixed(1)}s`);
    el.style.setProperty('--sway', `${(3 + Math.random() * 3.5).toFixed(1)}s`);
    el.style.setProperty('--delay', `${(-Math.random() * 18).toFixed(1)}s`);
    el.style.setProperty('--op', (0.45 + Math.random() * 0.38).toFixed(2));
    el.style.color = colors[i % colors.length];
    layer.appendChild(el);
  }

  for (let i = 0; i < totalPuffs; i += 1) {
    const puff = document.createElement('span');
    puff.className = 'sweet-puff';
    puff.style.setProperty('--x', `${(Math.random() * 96 + 2).toFixed(1)}%`);
    puff.style.setProperty('--size', `${(16 + Math.random() * 22).toFixed(0)}px`);
    puff.style.setProperty('--dur', `${(14 + Math.random() * 12).toFixed(1)}s`);
    puff.style.setProperty('--sway', `${(4 + Math.random() * 4).toFixed(1)}s`);
    puff.style.setProperty('--delay', `${(-Math.random() * 20).toFixed(1)}s`);
    puff.style.setProperty('--op', (0.45 + Math.random() * 0.35).toFixed(2));
    puff.style.setProperty('--puff-color', puffColors[i % puffColors.length]);
    layer.appendChild(puff);
  }

  document.body.appendChild(layer);

  // 2. Fluffy heart/sparkle mouse trail & click burst
  const trailChars = ['♥', '♡', '✦', '✧', '˚'];
  const trailColors = ['#ff6b9d', '#ff9ec4', '#c88263', '#f5b076', '#e05d8e'];
  let lastTrail = 0;
  let activeSparkles = 0;

  function spawnSparkle(x, y, dx, dy, char, size) {
    if (activeSparkles > 36) return;
    activeSparkles += 1;
    const sp = document.createElement('span');
    sp.className = 'sweet-sparkle';
    sp.textContent = char || trailChars[Math.floor(Math.random() * trailChars.length)];
    sp.style.left = `${x}px`;
    sp.style.top = `${y}px`;
    sp.style.color = trailColors[Math.floor(Math.random() * trailColors.length)];
    if (size) sp.style.fontSize = `${size}px`;
    sp.style.setProperty('--dx', `${dx}px`);
    sp.style.setProperty('--dy', `${dy}px`);
    document.body.appendChild(sp);
    setTimeout(() => {
      sp.remove();
      activeSparkles -= 1;
    }, 860);
  }

  if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
    document.addEventListener('mousemove', (e) => {
      const now = Date.now();
      if (now - lastTrail < 85) return;
      lastTrail = now;
      const dx = Math.round((Math.random() - 0.5) * 26);
      const dy = Math.round(-16 - Math.random() * 20);
      spawnSparkle(e.clientX, e.clientY, dx, dy, null, 11 + Math.floor(Math.random() * 5));
    }, { passive: true });
  }

  document.addEventListener('click', (e) => {
    const burst = ['🧸', '🐾', '♥', '♡', '🎀', '✦'];
    for (let i = 0; i < burst.length; i += 1) {
      const angle = (Math.PI * 2 * i) / burst.length + Math.random() * 0.4;
      const dist = 24 + Math.random() * 24;
      const dx = Math.round(Math.cos(angle) * dist);
      const dy = Math.round(Math.sin(angle) * dist - 14);
      spawnSparkle(e.clientX, e.clientY, dx, dy, burst[i], 12 + Math.floor(Math.random() * 5));
    }
  }, { passive: true });
}

async function init() {
  initSweetEffects();
  bindGlobalEvents();
  const auth = await storage.initAuth();

  if (auth.mode === 'cloud' && !auth.user) {
    document.getElementById('login-gate').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
  } else {
    await enterAuthenticatedApp();
  }
}

init();
})(window.StudyTracker);
