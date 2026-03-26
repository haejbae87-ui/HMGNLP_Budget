// ─── 입력 필드 정의 관리 (플랫폼 총괄 관리자) ──────────────────────────────────
// 양식 마법사에서 사용되는 입력 필드 목록을 관리하는 화면

// 필드 타입 정보
const FIELD_TYPE_META = {
  text:           { label: '텍스트(단행)',   icon: '📝', color: '#6B7280', bg: '#F3F4F6' },
  textarea:       { label: '텍스트(장문)',   icon: '📄', color: '#059669', bg: '#F0FDF4' },
  date:           { label: '날짜',          icon: '📅', color: '#0369A1', bg: '#EFF6FF' },
  daterange:      { label: '날짜 범위',     icon: '📆', color: '#0369A1', bg: '#EFF6FF' },
  number:         { label: '숫자/금액',      icon: '🔢', color: '#D97706', bg: '#FFFBEB' },
  'user-search':  { label: '사용자 검색',   icon: '🔍', color: '#6366F1', bg: '#EEF2FF' },
  file:           { label: '파일 업로드',   icon: '📎', color: '#9D174D', bg: '#FDF2F8' },
  rating:         { label: '별점(1~5)',      icon: '⭐', color: '#F59E0B', bg: '#FFFBEB' },
  select:         { label: '드롭다운 선택', icon: '🗂️', color: '#7C3AED', bg: '#F5F3FF' },
  'calc-grounds': { label: '세부산출근거',  icon: '📐', color: '#065F46', bg: '#ECFDF5' },
  'budget-linked':{ label: '예산 잔액 연동',icon: '💼', color: '#1D4ED8', bg: '#EFF6FF' },
  system:         { label: '시스템 자동',   icon: '⚙️', color: '#6B7280', bg: '#F3F4F6' },
};

const FIELD_SCOPE_META = {
  front:  { label: 'Front-Office (학습자/신청자 입력)', color: '#059669', bg: '#F0FDF4' },
  back:   { label: 'Back-Office (승인자 전용)',         color: '#7C3AED', bg: '#F5F3FF' },
  system: { label: '시스템 자동 (자동 채워짐)',          color: '#0369A1', bg: '#EFF6FF' },
};

let _fmList      = [];   // 현재 표시 중인 필드 목록 (DB 또는 메모리)
let _fmEditId    = null; // 수정 중인 필드 ID (null = 신규)

// ── 메인 렌더 함수 ──────────────────────────────────────────────────────────────
function renderFieldMgmt() {
  const el = document.getElementById('bo-content');
  if (!el) return;

  // ADVANCED_FIELDS를 현재 목록으로 사용 (DB 로드 시 자동 교체)
  _fmList = (typeof ADVANCED_FIELDS !== 'undefined') ? [...ADVANCED_FIELDS] : [];

  el.innerHTML = `
<div style="padding:24px;max-width:1100px">
  <!-- 헤더 -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
    <div>
      <h2 style="margin:0;font-size:20px;font-weight:900;color:#111827">⚙️ 입력 필드 정의 관리</h2>
      <p style="margin:4px 0 0;font-size:12px;color:#6B7280">양식 마법사에서 사용되는 입력 필드 유형·속성을 관리합니다</p>
    </div>
    <button onclick="fmOpenModal(null)" class="bo-btn-primary" style="display:flex;align-items:center;gap:6px;padding:10px 18px">
      ＋ 필드 추가
    </button>
  </div>

  <!-- 필드 타입 범례 -->
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px;padding:14px;background:#F9FAFB;border-radius:12px;border:1px solid #E5E7EB">
    <span style="font-size:11px;font-weight:900;color:#374151;margin-right:4px;align-self:center">필드 타입:</span>
    ${Object.entries(FIELD_TYPE_META).map(([k,v])=>`
      <span style="font-size:10px;background:${v.bg};color:${v.color};padding:3px 8px;border-radius:6px;font-weight:800">${v.icon} ${v.label}</span>
    `).join('')}
  </div>

  <!-- 필드 목록 테이블 -->
  <div class="bo-card" style="overflow:hidden;padding:0">
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#F9FAFB;border-bottom:2px solid #E5E7EB">
          <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:900;color:#374151">필드명</th>
          <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:900;color:#374151">타입</th>
          <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:900;color:#374151">카테고리</th>
          <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:900;color:#374151">입력주체</th>
          <th style="padding:12px 8px;text-align:center;font-size:11px;font-weight:900;color:#374151">필수</th>
          <th style="padding:12px 16px;text-align:left;font-size:11px;font-weight:900;color:#374151">도움말</th>
          <th style="padding:12px 16px;text-align:right;font-size:11px;font-weight:900;color:#374151">관리</th>
        </tr>
      </thead>
      <tbody id="fm-tbody">
        ${_fmList.map((f, i) => _fmRow(f, i)).join('')}
      </tbody>
    </table>
  </div>

  <!-- 안내 -->
  <div class="bo-card" style="margin-top:16px;padding:14px 18px;background:#FFFBEB;border-color:#FDE68A">
    <div style="font-size:12px;font-weight:700;color:#92400E">
      ⚠️ 필드를 삭제하거나 타입을 변경하면 해당 필드를 사용 중인 <b>기존 양식</b>에 영향을 줄 수 있습니다.
      반드시 영향도를 확인한 후 변경하세요.
    </div>
  </div>
</div>`;

  // 필드 추가/수정 모달 DOM 사전 등록
  if (!document.getElementById('fm-modal')) _fmCreateModalDOM();
}

function _fmRow(f, idx) {
  const tm = FIELD_TYPE_META[f.fieldType] || FIELD_TYPE_META.text;
  const sm = FIELD_SCOPE_META[f.scope]    || FIELD_SCOPE_META.front;
  return `
<tr style="border-bottom:1px solid #F3F4F6;transition:background .1s"
    onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background=''">
  <td style="padding:12px 16px">
    <span style="font-size:13px;font-weight:800;color:#111827">${f.icon || ''} ${f.key}</span>
  </td>
  <td style="padding:12px 16px">
    <span style="font-size:10px;background:${tm.bg};color:${tm.color};padding:3px 8px;border-radius:6px;font-weight:800">${tm.icon} ${tm.label}</span>
  </td>
  <td style="padding:12px 16px;font-size:12px;color:#374151">${f.category}</td>
  <td style="padding:12px 16px">
    <span style="font-size:10px;background:${sm.bg};color:${sm.color};padding:2px 8px;border-radius:6px;font-weight:800">${sm.label.split(' ')[0]}</span>
  </td>
  <td style="padding:12px 8px;text-align:center">
    ${f.required ? '<span style="color:#059669;font-size:16px">✓</span>' : '<span style="color:#E5E7EB;font-size:16px">—</span>'}
  </td>
  <td style="padding:12px 16px;font-size:11px;color:#6B7280;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${f.hint||''}">${f.hint||''}</td>
  <td style="padding:12px 16px;text-align:right">
    <div style="display:flex;gap:4px;justify-content:flex-end">
      <button class="bo-btn-secondary bo-btn-sm" onclick="fmOpenModal('${f.key}')">수정</button>
      <button onclick="fmDeleteField('${f.key}')"
        style="padding:4px 10px;border-radius:6px;border:1.5px solid #EF4444;background:#fff;color:#EF4444;font-size:10px;font-weight:800;cursor:pointer">삭제</button>
    </div>
  </td>
</tr>`;
}

// ── 모달 DOM 생성 ─────────────────────────────────────────────────────────────
function _fmCreateModalDOM() {
  const modal = document.createElement('div');
  modal.id = 'fm-modal';
  modal.className = 'bo-modal-overlay';
  modal.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9000;align-items:center;justify-content:center';
  modal.innerHTML = `
<div class="bo-modal" style="width:560px;max-width:95%;background:#fff;border-radius:12px;max-height:90vh;overflow-y:auto;padding:28px">
  <div style="display:flex;justify-content:space-between;margin-bottom:20px">
    <h3 id="fm-modal-title" style="margin:0;font-size:16px;font-weight:900;color:#111827">필드 추가</h3>
    <button onclick="fmCloseModal()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#9CA3AF">✕</button>
  </div>
  <div id="fm-modal-body"></div>
  <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid #E5E7EB">
    <button onclick="fmCloseModal()" class="bo-btn-secondary">취소</button>
    <button onclick="fmSaveField()" class="bo-btn-primary">💾 저장</button>
  </div>
</div>`;
  document.body.appendChild(modal);
}

// ── 모달 열기 ─────────────────────────────────────────────────────────────────
function fmOpenModal(fieldKey) {
  _fmEditId = fieldKey;
  const f   = fieldKey ? _fmList.find(x => x.key === fieldKey) : null;
  const modal = document.getElementById('fm-modal');
  document.getElementById('fm-modal-title').textContent = f ? `'${f.key}' 필드 수정` : '새 필드 추가';

  const typeOpts = Object.entries(FIELD_TYPE_META).map(([k,v])=>
    `<option value="${k}" ${(f?.fieldType||'text')===k?'selected':''}>${v.icon} ${v.label}</option>`
  ).join('');

  document.getElementById('fm-modal-body').innerHTML = `
<div style="display:flex;flex-direction:column;gap:14px">
  <div>
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:6px">필드명 (한글) *</label>
    <input id="fm-key" type="text" value="${f?.key||''}" placeholder="예) 교육기관" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div>
      <label style="font-size:11px;font-weight:800;display:block;margin-bottom:6px">필드 타입 *</label>
      <select id="fm-type" onchange="fmOnTypeChange()" style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">${typeOpts}</select>
    </div>
    <div>
      <label style="font-size:11px;font-weight:800;display:block;margin-bottom:6px">카테고리 *</label>
      <select id="fm-category" style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
        ${['기본정보','비용정보','인원정보','첨부서류','결과정보','관리(승인자)','시스템'].map(c=>
          `<option ${(f?.category||'기본정보')===c?'selected':''}>${c}</option>`
        ).join('')}
      </select>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div>
      <label style="font-size:11px;font-weight:800;display:block;margin-bottom:6px">입력 주체 *</label>
      <select id="fm-scope" style="width:100%;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px">
        <option value="front" ${(f?.scope||'front')==='front'?'selected':''}>Front-Office (학습자 입력)</option>
        <option value="back"  ${f?.scope==='back'?'selected':''}>Back-Office (승인자 전용)</option>
        <option value="system" ${f?.scope==='system'?'selected':''}>시스템 자동</option>
      </select>
    </div>
    <div>
      <label style="font-size:11px;font-weight:800;display:block;margin-bottom:6px">아이콘 (이모지)</label>
      <input id="fm-icon" type="text" value="${f?.icon||''}" placeholder="예) 📅" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:16px">
    </div>
  </div>
  <div>
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:6px">도움말 (사용자에게 표시)</label>
    <input id="fm-hint" type="text" value="${f?.hint||''}" placeholder="예) 수강료/등록비 (원 단위)" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
  </div>
  <!-- select 타입용 옵션 -->
  <div id="fm-options-section" style="display:${(f?.fieldType==='select')?'block':'none'}">
    <label style="font-size:11px;font-weight:800;display:block;margin-bottom:6px">드롭다운 선택지 (줄바꿈으로 구분)</label>
    <textarea id="fm-options" rows="4" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:12px;resize:vertical">${(f?.options||[]).join('\n')}</textarea>
  </div>
  <div style="display:flex;align-items:center;gap:10px">
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
      <input id="fm-required" type="checkbox" ${f?.required?'checked':''} style="width:14px;height:14px;accent-color:#059669">
      <span style="font-size:12px;font-weight:800">필수 입력 필드</span>
    </label>
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
      <input id="fm-budget" type="checkbox" ${f?.budget?'checked':''} style="width:14px;height:14px;accent-color:#1D4ED8">
      <span style="font-size:12px;font-weight:800">예산 잔액 연동</span>
    </label>
  </div>
</div>`;

  modal.style.display = 'flex';
}

function fmOnTypeChange() {
  const t = document.getElementById('fm-type').value;
  const s = document.getElementById('fm-options-section');
  if (s) s.style.display = t === 'select' ? 'block' : 'none';
}

function fmCloseModal() {
  const modal = document.getElementById('fm-modal');
  if (modal) modal.style.display = 'none';
}

// ── 저장 ──────────────────────────────────────────────────────────────────────
async function fmSaveField() {
  const key      = document.getElementById('fm-key')?.value.trim();
  const fType    = document.getElementById('fm-type')?.value;
  const category = document.getElementById('fm-category')?.value;
  const scope    = document.getElementById('fm-scope')?.value;
  const icon     = document.getElementById('fm-icon')?.value.trim();
  const hint     = document.getElementById('fm-hint')?.value.trim();
  const required = document.getElementById('fm-required')?.checked;
  const budget   = document.getElementById('fm-budget')?.checked;
  const optRaw   = document.getElementById('fm-options')?.value || '';
  const options  = optRaw.split('\n').map(s=>s.trim()).filter(Boolean);

  if (!key)  { alert('필드명을 입력하세요.'); return; }
  if (!fType){ alert('필드 타입을 선택하세요.'); return; }

  const newField = { key, fieldType: fType, category, scope, icon, hint, required, budget: !!budget,
    options: options.length ? options : undefined };

  // 1) 메모리(ADVANCED_FIELDS) 업데이트
  if (typeof ADVANCED_FIELDS !== 'undefined') {
    const idx = ADVANCED_FIELDS.findIndex(f => f.key === key);
    if (idx >= 0) ADVANCED_FIELDS[idx] = { ...ADVANCED_FIELDS[idx], ...newField };
    else ADVANCED_FIELDS.push(newField);
  }

  // 2) DB 저장 (sbSaveFieldDefinition 함수가 있을 때)
  if (typeof sbSaveFieldDefinition === 'function') {
    const dbRow = {
      id: _fmEditId ? ('FD' + String(ADVANCED_FIELDS.findIndex(f=>f.key===key)+1).padStart(3,'0')) : ('FD' + Date.now()),
      key, field_type: fType, category, scope, icon, hint, required,
      budget: !!budget, options: options.length ? options : null,
    };
    try { await sbSaveFieldDefinition(dbRow); }
    catch(e) { console.warn('[FieldMgmt] DB 저장 실패 - 메모리에만 저장:', e.message); }
  }

  fmCloseModal();
  renderFieldMgmt();
}

// ── 삭제 ──────────────────────────────────────────────────────────────────────
async function fmDeleteField(key) {
  if (!confirm(`'${key}' 필드를 삭제하시겠습니까?\n이미 등록된 양식에 영향을 줄 수 있습니다.`)) return;

  if (typeof ADVANCED_FIELDS !== 'undefined') {
    const idx = ADVANCED_FIELDS.findIndex(f => f.key === key);
    if (idx >= 0) ADVANCED_FIELDS.splice(idx, 1);
  }

  // DB 삭제는 sbDeleteFieldDefinition이 있을 때
  if (typeof sbDeleteFieldDefinition === 'function') {
    try { await sbDeleteFieldDefinition(key); }
    catch(e) { console.warn('[FieldMgmt] DB 삭제 실패:', e.message); }
  }

  renderFieldMgmt();
}
