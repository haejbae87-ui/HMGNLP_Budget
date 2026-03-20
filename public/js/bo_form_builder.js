// ─── [메뉴3] 교육 양식 & 학습유형 관리 (Form Builder) ─────────────────────────
// Tenant Admin이 계획용/신청용/결과용 양식을 직접 만들어두는 단계

// LNB 독립 진입점 래퍼
function renderFormBuilderMenu() {
  document.getElementById('bo-content').innerHTML = renderFormMasterTab();
}

const AVAILABLE_FIELDS = [
  { key: '교육목적', icon: '🎯', required: true },
  { key: '교육기간', icon: '📅', required: true },
  { key: '교육기관', icon: '🏫', required: true },
  { key: '장소', icon: '📍', required: false },
  { key: '기대효과', icon: '✨', required: false },
  { key: '예상비용', icon: '💰', required: true },
  { key: '교육비', icon: '💳', required: true },
  { key: '참가비', icon: '💲', required: false },
  { key: '과정명', icon: '📚', required: true },
  { key: '교육일정', icon: '🗓️', required: true },
  { key: '수강인원', icon: '👥', required: false },
  { key: '정원', icon: '🪑', required: false },
  { key: '첨부파일', icon: '📎', required: false },
  { key: '보안서약서', icon: '🔒', required: false },
  { key: '영수증', icon: '🧾', required: false },
  { key: '계획서연결', icon: '🔗', required: false, hint: 'Step5에서 연결된 계획 양식을 불러옵니다' },
];

let _fbEditId = null; // 편집 중인 양식 ID
let _fbTempFields = []; // 임시 필드 목록 (빌더 내 현재 구성)

function renderFormMasterTab() {
  const tenantId = boCurrentPersona.tenantId || 'HMG';
  const allForms = FORM_MASTER.filter(f => f.tenantId === tenantId);
  const planForms = allForms.filter(f => f.type === 'plan');
  const applyForms = allForms.filter(f => f.type === 'apply');
  const resultForms = allForms.filter(f => f.type === 'result');
  const tenant = TENANTS.find(t => t.id === tenantId);

  const formCard = (f) => {
    const typeConfig = {
      plan:   { color: '#7C3AED', bg: '#F5F3FF', label: '📋 교육계획 양식' },
      apply:  { color: '#059669', bg: '#F0FDF4', label: '📄 교육신청 양식' },
      result: { color: '#D97706', bg: '#FFFBEB', label: '📝 교육결과 양식' }
    };
    const { color: typeColor, bg: typeBg, label: typeLabel } = typeConfig[f.type] || typeConfig.apply;
    return `
    <div class="bo-rule-card" style="margin-bottom:10px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="background:${typeBg};color:${typeColor};font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px">${typeLabel}</span>
            <span style="font-size:14px;font-weight:800;color:#111827">${f.name}</span>
            <span class="bo-badge ${f.active ? 'bo-badge-green' : 'bo-badge-gray'}">${f.active ? '활성' : '비활성'}</span>
          </div>
          <div style="font-size:12px;color:#6B7280;margin-bottom:8px">${f.desc || ''}</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">
            ${f.fields.map(fld => {
      const meta = AVAILABLE_FIELDS.find(a => a.key === fld) || { icon: '📝' };
      return `<span style="background:#F3F4F6;color:#374151;font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px">${meta.icon} ${fld}</span>`;
    }).join('')}
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0;margin-left:12px">
          <button class="bo-btn-secondary bo-btn-sm" onclick="fbOpenBuilderModal('${f.id}')">✏️ 편집</button>
          <button class="bo-btn-secondary bo-btn-sm" onclick="fbToggleActive('${f.id}')"
            style="color:${f.active ? '#F59E0B' : '#059669'};border-color:${f.active ? '#F59E0B' : '#059669'}">
            ${f.active ? '비활성화' : '활성화'}
          </button>
        </div>
      </div>
    </div>`;
  };

  return `
<div>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
    <div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="width:10px;height:10px;background:${tenant?.color};border-radius:50%;display:inline-block"></span>
        <span style="font-weight:800;font-size:14px;color:#111827">${tenant?.name}</span>
      </div>
      <div style="font-size:12px;color:#6B7280">
        계획용 양식 <strong>${planForms.length}</strong>개 &nbsp;|&nbsp; 신청용 양식 <strong>${applyForms.length}</strong>개
      </div>
    </div>
    <button class="bo-btn-primary bo-btn-sm" onclick="fbOpenBuilderModal()">+ 양식 신규 생성</button>
  </div>

  <!-- 교육계획 양식 목록 -->
  <div style="margin-bottom:20px">
    <div style="font-size:12px;font-weight:800;color:#7C3AED;margin-bottom:10px;display:flex;align-items:center;gap:6px">
      📋 교육계획 양식 (Plan Forms)
      <span class="bo-badge bo-badge-purple">${planForms.length}</span>
    </div>
    ${planForms.length ? planForms.map(formCard).join('') :
      '<div class="bo-card" style="padding:20px;text-align:center;color:#9CA3AF">교육계획 양식이 없습니다. 추가해 주세요.</div>'}
  </div>

  <!-- 교육신청 양식 목록 -->
  <div style="margin-bottom:20px">
    <div style="font-size:12px;font-weight:800;color:#059669;margin-bottom:10px;display:flex;align-items:center;gap:6px">
      📄 교육신청 양식 (Apply Forms)
      <span class="bo-badge bo-badge-green">${applyForms.length}</span>
    </div>
    ${applyForms.length ? applyForms.map(formCard).join('') :
      '<div class="bo-card" style="padding:20px;text-align:center;color:#9CA3AF">교육신청 양식이 없습니다. 추가해 주세요.</div>'}
  </div>

  <!-- 교육결과 양식 목록 -->
  <div style="margin-bottom:20px">
    <div style="font-size:12px;font-weight:800;color:#D97706;margin-bottom:10px;display:flex;align-items:center;gap:6px">
      📝 교육결과 양식 (Result Forms)
      <span class="bo-badge" style="background:#FFFBEB;color:#D97706;border:1px solid #FDE68A">${resultForms.length}</span>
    </div>
    ${resultForms.length ? resultForms.map(formCard).join('') :
      '<div class="bo-card" style="padding:20px;text-align:center;color:#9CA3AF">교육결과 양식이 없습니다. 추가해 주세요.</div>'}
  </div>

  <div class="bo-card" style="padding:12px 18px;background:#F5F3FF;border-color:#DDD6FE;margin-bottom:24px">
    <span style="font-size:12px;font-weight:700;color:#5B21B6">
      🔗 여기서 만든 양식은 [Step4] 통합 정책 설정에서 자동으로 드롭다운에 표시됩니다.
    </span>
  </div>

  <!-- 학습유형(Learning Type) 템플릿 마스터 보기 -->
  <div style="margin-bottom:20px">
    <div style="font-size:12px;font-weight:800;color:#111827;margin-bottom:10px;display:flex;align-items:center;gap:6px">
      📚 학습유형 템플릿 마스터
      <span style="font-size:11px;color:#6B7280;font-weight:500">(플랫폼 사전 정의)</span>
    </div>
    <div class="bo-card" style="padding:16px;background:#FAFAFA">
      <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:16px">
        ${LEARNING_TYPES.map(cat => `
        <div>
          <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #E5E7EB">
            ${cat.category}
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${cat.items.map(item => `
            <span style="background:#fff;border:1px solid #D1D5DB;color:#4B5563;font-size:11px;padding:3px 8px;border-radius:6px">
              ${item}
            </span>`).join('')}
          </div>
        </div>`).join('')}
      </div>
      <div style="margin-top:12px;font-size:11px;color:#9CA3AF">
        * 위 학습유형들은 [Step3] 통합 정책 설정 시, 각 예산 및 조직별로 허용 여부를 체크박스로 제어할 수 있습니다.
      </div>
    </div>
  </div>

</div>

<!-- Form Builder 모달 -->
<div id="fb-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9100;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto">
  <div style="background:#fff;border-radius:16px;width:640px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.25)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <h3 id="fb-modal-title" style="font-size:15px;font-weight:800;margin:0">양식 신규 생성</h3>
      <button onclick="fbCloseModal()" style="border:none;background:none;font-size:20px;cursor:pointer;color:#9CA3AF">✕</button>
    </div>
    <div id="fb-modal-body"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
      <button class="bo-btn-secondary bo-btn-sm" onclick="fbCloseModal()">취소</button>
      <button class="bo-btn-primary bo-btn-sm" onclick="fbSaveForm()">저장</button>
    </div>
  </div>
</div>`;
}

// ─── Form Builder 모달 내용 ──────────────────────────────────────────────────
function _fbModalBody(form) {
  const nameVal = form?.name || '';
  const typeVal = form?.type || 'apply';
  const descVal = form?.desc || '';
  _fbTempFields = form ? [...form.fields] : [];

  return `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
    <div>
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">양식 유형 *</label>
      <select id="fb-type" style="width:100%;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
        <option value="apply" ${typeVal === 'apply' ? 'selected' : ''}>📄 교육신청 양식</option>
        <option value="plan"  ${typeVal === 'plan' ? 'selected' : ''}>📋 교육계획 양식</option>
        <option value="result" ${typeVal === 'result' ? 'selected' : ''}>📝 교육결과 양식</option>
      </select>
    </div>
    <div>
      <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">양식명 *</label>
      <input id="fb-name" value="${nameVal}" type="text" placeholder="예) R&D 사외교육 신청서"
        style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
    </div>
  </div>
  <div style="margin-bottom:14px">
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:5px">설명</label>
    <input id="fb-desc" value="${descVal}" type="text" placeholder="이 양식의 용도 설명"
      style="width:100%;box-sizing:border-box;padding:9px 12px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:13px">
  </div>
  <div style="border:1.5px solid #E5E7EB;border-radius:12px;overflow:hidden;margin-bottom:4px">
    <div style="background:#F9FAFB;padding:10px 16px;border-bottom:1px solid #E5E7EB;font-size:12px;font-weight:800;color:#374151">
      📋 입력 필드 구성 (클릭으로 추가/제거)
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
      <!-- 좌: 사용 가능 필드 팔레트 -->
      <div style="padding:14px;border-right:1px solid #E5E7EB">
        <div style="font-size:11px;color:#6B7280;font-weight:700;margin-bottom:8px">사용 가능 필드</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px" id="fb-palette">
          ${AVAILABLE_FIELDS.map(f => `
          <span onclick="fbToggleField('${f.key}')" id="fbf-${f.key.replace(/\s/g, '_')}"
            class="fb-field-chip ${_fbTempFields.includes(f.key) ? 'selected' : ''}"
            title="${f.hint || ''}">
            ${f.icon} ${f.key}${f.required ? '<sup>*</sup>' : ''}
          </span>`).join('')}
        </div>
      </div>
      <!-- 우: 구성된 필드 미리보기 -->
      <div style="padding:14px">
        <div style="font-size:11px;color:#6B7280;font-weight:700;margin-bottom:8px">구성된 필드 순서</div>
        <div id="fb-preview" style="min-height:80px">
          ${_fbTempFields.length ? _fbTempFields.map((f, i) => `
          <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:#F9FAFB;border-radius:6px;margin-bottom:4px;font-size:12px">
            <span style="color:#D1D5DB;font-weight:700">${i + 1}</span>
            <span>${AVAILABLE_FIELDS.find(a => a.key === f)?.icon || '📝'} ${f}</span>
            <span onclick="fbRemoveField('${f}')" style="margin-left:auto;cursor:pointer;color:#EF4444;font-size:14px">×</span>
          </div>`).join('') :
      '<div style="text-align:center;color:#D1D5DB;padding:20px;font-size:12px">왼쪽에서 필드를 클릭하여 추가</div>'}
        </div>
      </div>
    </div>
  </div>`;
}

function fbToggleField(key) {
  const idx = _fbTempFields.indexOf(key);
  if (idx > -1) _fbTempFields.splice(idx, 1); else _fbTempFields.push(key);
  _refreshFbPreview();
}

function fbRemoveField(key) {
  const idx = _fbTempFields.indexOf(key);
  if (idx > -1) _fbTempFields.splice(idx, 1);
  _refreshFbPreview();
}

function _refreshFbPreview() {
  const previewEl = document.getElementById('fb-preview');
  const paletteEls = document.querySelectorAll('.fb-field-chip');
  if (previewEl) {
    previewEl.innerHTML = _fbTempFields.length ? _fbTempFields.map((f, i) => `
    <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:#F9FAFB;border-radius:6px;margin-bottom:4px;font-size:12px">
      <span style="color:#D1D5DB;font-weight:700">${i + 1}</span>
      <span>${AVAILABLE_FIELDS.find(a => a.key === f)?.icon || '📝'} ${f}</span>
      <span onclick="fbRemoveField('${f}')" style="margin-left:auto;cursor:pointer;color:#EF4444;font-size:14px">×</span>
    </div>`).join('') :
      '<div style="text-align:center;color:#D1D5DB;padding:20px;font-size:12px">왼쪽에서 필드를 클릭하여 추가</div>';
  }
  paletteEls.forEach(el => {
    const key = el.textContent.trim().replace(/\*.*/, '').replace(/[^\uAC00-\uD7A3a-zA-Z&]/g, '').trim();
    const fKey = AVAILABLE_FIELDS.find(a => el.id === `fbf-${a.key.replace(/\s/g, '_')}`)?.key;
    if (fKey) el.classList.toggle('selected', _fbTempFields.includes(fKey));
  });
}

function fbOpenBuilderModal(formId) {
  _fbEditId = formId || null;
  const form = formId ? FORM_MASTER.find(f => f.id === formId) : null;
  document.getElementById('fb-modal-title').textContent = formId ? '양식 편집' : '양식 신규 생성';
  document.getElementById('fb-modal-body').innerHTML = _fbModalBody(form);
  document.getElementById('fb-modal').style.display = 'flex';
}

function fbCloseModal() { document.getElementById('fb-modal').style.display = 'none'; }

function fbToggleActive(formId) {
  const f = FORM_MASTER.find(x => x.id === formId);
  if (f) f.active = !f.active;
  document.getElementById('bm-content').innerHTML = renderFormMasterTab();
}

function fbSaveForm() {
  const tenantId = boCurrentPersona.tenantId || 'HMG';
  const type = document.getElementById('fb-type').value;
  const name = document.getElementById('fb-name').value.trim();
  const desc = document.getElementById('fb-desc').value.trim();
  if (!name) { alert('양식명은 필수입니다.'); return; }
  if (_fbTempFields.length === 0) { alert('최소 1개 이상의 필드를 선택해 주세요.'); return; }

  if (_fbEditId) {
    const idx = FORM_MASTER.findIndex(x => x.id === _fbEditId);
    if (idx > -1) FORM_MASTER[idx] = { ...FORM_MASTER[idx], type, name, desc, fields: [..._fbTempFields] };
  } else {
    FORM_MASTER.push({
      id: 'FM' + (Date.now()), tenantId, type, name, desc, active: true, fields: [..._fbTempFields]
    });
  }
  fbCloseModal();
  document.getElementById('bm-content').innerHTML = renderFormMasterTab();
}
