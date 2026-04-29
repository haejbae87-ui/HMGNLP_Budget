// ─── 📝 교육 양식관리 ─────────────────────────────────────────────────────
// 제도그룹별 예산계정의 교육유형에 맞는 양식(필드 on/off)을 관리합니다.
// 4단계: 사업계획(forecast) · 운영계획(operation) · 신청(apply) · 결과(result)

let _fmVorgId = '';
let _fmAccountCode = '';
let _fmSelEduType = '';
let _fmActiveStage = 'forecast';
let _fmTplList = [];
let _fmAccountList = [];
let _fmFieldStates = {}; // { "elearning|forecast": { venue_type: true, ... } }

// ── 패턴 → 활성 단계 매핑 ──────────────────────────────────────────────────
const _FM_PATTERN_STAGES = {
  A: ['forecast','operation','apply','result'],
  B: ['operation','apply','result'],
  C: ['apply','result'],
  D: ['operation','apply'],
  E: ['forecast','operation'],
};
const _FM_STAGE_META = {
  forecast:  { icon:'📊', label:'사업계획 양식', color:'#7C3AED' },
  operation: { icon:'📋', label:'운영계획 양식', color:'#1D4ED8' },
  apply:     { icon:'📝', label:'신청 양식',     color:'#059669' },
  result:    { icon:'📄', label:'결과 양식',     color:'#D97706' },
};

// ── 단계별 필드 카탈로그 ────────────────────────────────────────────────────
const _FM_FIELDS = {
  forecast: [
    { cat:'기본정보', icon:'📋', locked:true, fields:[
      {key:'edu_purpose',label:'교육목적',locked:true},{key:'edu_type',label:'교육유형',locked:true},
      {key:'edu_name',label:'교육명',locked:true},{key:'is_overseas',label:'국내/해외',locked:true},
    ]},
    { cat:'교육상세', icon:'📐', fields:[
      {key:'target_audience',label:'교육대상'},{key:'planned_headcount',label:'대상인원'},
      {key:'planned_rounds',label:'예상차수'},{key:'edu_period',label:'교육기간'},
      {key:'is_continuing',label:'전년도 계속교육'},
    ]},
    { cat:'비용항목', icon:'💰', budgetOnly:true, fields:[
      {key:'requested_budget',label:'요청 예산 규모'},{key:'budget_reason',label:'예산 산출 근거'},
      {key:'expected_effect',label:'기대효과'},
    ]},
  ],
  operation: [
    { cat:'기본정보', icon:'📋', locked:true, fields:[
      {key:'edu_purpose',label:'교육목적',locked:true},{key:'edu_type',label:'교육유형',locked:true},
      {key:'edu_name',label:'교육명',locked:true},{key:'is_overseas',label:'국내/해외',locked:true},
    ]},
    { cat:'교육상세', icon:'📐', fields:[
      {key:'venue_type',label:'장소유형'},{key:'venue_name',label:'교육장소'},
      {key:'planned_days',label:'교육일수'},{key:'edu_period',label:'교육기간'},
      {key:'planned_rounds',label:'교육차수'},{key:'planned_headcount',label:'교육인원'},
      {key:'edu_institution',label:'교육기관'},{key:'instructor',label:'강사정보'},
      {key:'edu_method',label:'교육방법(대면/비대면)'},
    ]},
    { cat:'비용항목', icon:'💰', budgetOnly:true, fields:[
      {key:'planned_amount',label:'계획액'},{key:'calc_grounds',label:'세부산출근거'},
      {key:'expected_effect',label:'기대효과'},
    ]},
    { cat:'관리자 필드', icon:'🔧', fields:[
      {key:'bo_comment',label:'BO 코멘트'},{key:'allocated_amount',label:'배정액'},
    ]},
  ],
  apply: [
    { cat:'기본정보', icon:'📋', locked:true, fields:[
      {key:'edu_name',label:'교육명/과정명',locked:true},{key:'edu_type',label:'교육유형',locked:true},
    ]},
    { cat:'신청상세', icon:'📐', fields:[
      {key:'apply_reason',label:'신청사유'},{key:'course_info',label:'과정/기관 정보'},
      {key:'edu_period',label:'교육기간'},{key:'edu_institution',label:'교육기관'},
      {key:'is_overseas',label:'국내/해외'},
    ]},
    { cat:'비용항목', icon:'💰', budgetOnly:true, fields:[
      {key:'estimated_cost',label:'예상비용'},{key:'actual_cost',label:'실비'},
    ]},
    { cat:'첨부', icon:'📎', fields:[
      {key:'attachments',label:'증빙서류'},{key:'receipt',label:'영수증'},
    ]},
  ],
  result: [
    { cat:'기본정보', icon:'📋', locked:true, fields:[
      {key:'edu_name',label:'교육명',locked:true},{key:'edu_type',label:'교육유형',locked:true},
    ]},
    { cat:'결과상세', icon:'📐', fields:[
      {key:'completion_status',label:'수료여부'},{key:'satisfaction',label:'만족도'},
      {key:'learning_summary',label:'학습내용/소감'},{key:'attendance_rate',label:'출석률'},
    ]},
    { cat:'비용항목', icon:'💰', budgetOnly:true, fields:[
      {key:'actual_cost',label:'실비용'},{key:'settlement_amount',label:'정산금액'},
    ]},
    { cat:'첨부', icon:'📎', fields:[
      {key:'certificate',label:'수료증'},{key:'receipt',label:'영수증'},
    ]},
  ],
};

// ── 메인 렌더 ───────────────────────────────────────────────────────────────
async function renderFormManagement() {
  const ct = document.getElementById('bo-content');
  ct.innerHTML = '<div style="text-align:center;padding:60px;color:#9CA3AF">⏳ 양식관리 데이터 로딩 중...</div>';

  // DB 로드
  try {
    const sb = window.__supabase;
    const tid = JSON.parse(sessionStorage.getItem('loggedInUser'))?.tenant_id || 'HMC';
    const [tplRes, accRes] = await Promise.all([
      sb.from('virtual_org_templates').select('*').eq('tenant_id', tid),
      sb.from('budget_accounts').select('*').eq('tenant_id', tid),
    ]);
    _fmTplList = tplRes.data || [];
    _fmAccountList = accRes.data || [];
  } catch(e) {
    console.warn('[FormMgmt] DB 로드 실패, mock 사용', e);
    _fmTplList = (window.VORG_TEMPLATES||[]);
    _fmAccountList = (window.BUDGET_ACCOUNTS||[]);
  }

  // 기본 선택
  if (!_fmVorgId && _fmTplList.length) _fmVorgId = _fmTplList[0].id;
  _fmRenderPage();
}

function _fmRenderPage() {
  const ct = document.getElementById('bo-content');
  const filteredAccounts = _fmAccountList.filter(a => a.virtual_org_template_id === _fmVorgId && a.active !== false);
  const selAcc = filteredAccounts.find(a => a.code === _fmAccountCode) || filteredAccounts[0];
  if (selAcc && !_fmAccountCode) _fmAccountCode = selAcc.code;

  // 기존 설정 복원
  if (selAcc) _fmLoadExistingConfig(selAcc);

  const eduTypes = selAcc?.edu_types || [];
  const pattern = selAcc?.process_pattern || 'A';
  const stages = _FM_PATTERN_STAGES[pattern] || _FM_PATTERN_STAGES.A;
  const usesBudget = selAcc?.uses_budget !== false;

  // 첫 교육유형 자동 선택
  if (!_fmSelEduType || !eduTypes.includes(_fmSelEduType)) {
    _fmSelEduType = eduTypes[0] || '';
  }
  // 활성 단계 유효성
  if (!stages.includes(_fmActiveStage)) _fmActiveStage = stages[0];

  // 교육유형 라벨 매핑
  const eduLabel = (id) => (window.EDU_TYPE_LABELS || {})[id] || id;

  ct.innerHTML = `
  <div style="max-width:1100px;margin:0 auto;padding:20px">
    <!-- 헤더 -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <span style="font-size:24px">📝</span>
      <div>
        <h2 style="margin:0;font-size:18px;font-weight:900;color:#1E293B">교육 양식관리</h2>
        <p style="margin:2px 0 0;font-size:12px;color:#64748B">제도그룹별 예산계정의 교육유형에 맞는 양식을 관리합니다</p>
      </div>
    </div>

    <!-- 필터 바 -->
    <div style="display:flex;gap:12px;margin-bottom:16px;padding:14px 18px;background:linear-gradient(135deg,#F0F9FF,#F5F3FF);border-radius:12px;border:1px solid #E0E7FF;align-items:center;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:12px;font-weight:700;color:#4338CA">🏗️ 제도그룹</span>
        <select id="fm-vorg-sel" onchange="_fmOnVorgChange(this.value)"
          style="padding:6px 10px;border:1px solid #C7D2FE;border-radius:8px;font-size:12px;background:white;min-width:200px">
          ${_fmTplList.map(t => `<option value="${t.id}" ${t.id===_fmVorgId?'selected':''}>${t.name}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:12px;font-weight:700;color:#4338CA">💳 예산계정</span>
        <select id="fm-acc-sel" onchange="_fmOnAccountChange(this.value)"
          style="padding:6px 10px;border:1px solid #C7D2FE;border-radius:8px;font-size:12px;background:white;min-width:180px">
          ${filteredAccounts.map(a => `<option value="${a.code}" ${a.code===_fmAccountCode?'selected':''}>${a.name} (${a.code})</option>`).join('')}
        </select>
      </div>
      ${selAcc ? `<span style="font-size:10px;padding:4px 12px;border-radius:20px;background:#7C3AED;color:white;font-weight:800">
        패턴${pattern}: ${(_FM_PATTERN_STAGES[pattern]||[]).map(s=>_FM_STAGE_META[s]?.label.replace(' 양식','')).join('→')}
      </span>` : ''}
      ${!usesBudget ? '<span style="font-size:10px;padding:4px 10px;border-radius:20px;background:#F59E0B;color:white;font-weight:800">💰 무예산</span>' : ''}
    </div>

    ${eduTypes.length === 0 ? `
      <div style="padding:60px;text-align:center;background:#FFF7ED;border:2px dashed #FDBA74;border-radius:16px">
        <div style="font-size:36px;margin-bottom:12px">📭</div>
        <div style="font-size:14px;font-weight:700;color:#C2410C;margin-bottom:6px">교육유형이 설정되지 않았습니다</div>
        <div style="font-size:12px;color:#EA580C">예산계정 관리 → 서비스 정책·프로세스 탭에서 교육유형을 먼저 선택하세요</div>
      </div>
    ` : `
    <!-- 본문: 좌측 사이드바 + 우측 콘텐츠 -->
    <div style="display:grid;grid-template-columns:200px 1fr;gap:16px;min-height:500px">
      <!-- 좌측: 교육유형 사이드바 -->
      <div style="background:white;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden">
        <div style="padding:10px 14px;background:#F8FAFC;border-bottom:1px solid #E5E7EB;font-size:11px;font-weight:800;color:#475569">
          📚 교육유형 (${eduTypes.length})
        </div>
        ${eduTypes.map(et => {
          const active = et === _fmSelEduType;
          return `<div onclick="_fmSelectEduType('${et}')"
            style="padding:10px 14px;cursor:pointer;border-left:3px solid ${active?'#4F46E5':'transparent'};
              background:${active?'#EEF2FF':'white'};font-size:12px;font-weight:${active?'800':'500'};
              color:${active?'#4338CA':'#374151'};transition:all .15s;border-bottom:1px solid #F3F4F6">
            ${active?'▸ ':''} ${eduLabel(et)}
          </div>`;
        }).join('')}
      </div>

      <!-- 우측: 단계 탭 + 필드 토글 -->
      <div style="background:white;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden">
        <!-- 단계 탭 -->
        <div style="display:flex;border-bottom:2px solid #E5E7EB;background:#F8FAFC">
          ${stages.map(s => {
            const m = _FM_STAGE_META[s];
            const act = s === _fmActiveStage;
            return `<div onclick="_fmSelectStage('${s}')"
              style="padding:10px 16px;cursor:pointer;font-size:12px;font-weight:${act?'800':'500'};
                color:${act?m.color:'#6B7280'};border-bottom:3px solid ${act?m.color:'transparent'};
                background:${act?'white':'transparent'};transition:all .15s;flex:1;text-align:center">
              ${m.icon} ${m.label}
            </div>`;
          }).join('')}
        </div>

        <!-- 필드 토글 영역 -->
        <div style="padding:16px;max-height:460px;overflow-y:auto">
          ${_fmRenderFieldToggles(_fmActiveStage, usesBudget)}
        </div>

        <!-- 하단 버튼 -->
        <div style="padding:12px 16px;border-top:1px solid #E5E7EB;display:flex;gap:10px;justify-content:flex-end;background:#FAFAFA">
          <button onclick="_fmPreview()"
            style="padding:8px 20px;border:1px solid #6366F1;background:white;color:#6366F1;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">
            👁️ 미리보기
          </button>
          <button onclick="_fmSave()"
            style="padding:8px 24px;border:none;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:white;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px #6366F140">
            💾 저장
          </button>
        </div>
      </div>
    </div>
    `}
  </div>`;
}

// ── 필드 토글 렌더 ──────────────────────────────────────────────────────────
function _fmRenderFieldToggles(stage, usesBudget) {
  const cats = _FM_FIELDS[stage] || [];
  const stateKey = `${_fmSelEduType}|${stage}`;
  const states = _fmFieldStates[stateKey] || {};

  return cats.map(cat => {
    const isBudgetCat = cat.budgetOnly;
    const catDisabled = isBudgetCat && !usesBudget;

    return `<div style="margin-bottom:14px;border:1px solid ${catDisabled?'#F3F4F6':'#E5E7EB'};border-radius:10px;overflow:hidden;
        ${catDisabled?'opacity:0.5':''}">
      <div style="padding:8px 14px;background:${cat.locked?'#DBEAFE':'#F8FAFC'};display:flex;align-items:center;gap:8px;
        border-bottom:1px solid #E5E7EB">
        <span>${cat.icon}</span>
        <span style="font-size:12px;font-weight:800;color:${cat.locked?'#1E40AF':'#374151'}">${cat.cat}</span>
        ${cat.locked?'<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#BFDBFE;color:#1E40AF;font-weight:700">필수</span>':''}
        ${catDisabled?'<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#FEF3C7;color:#92400E;font-weight:700">무예산 비활성</span>':''}
      </div>
      <div style="padding:10px 14px;display:grid;grid-template-columns:1fr 1fr;gap:6px">
        ${cat.fields.map(f => {
          const isLocked = f.locked || cat.locked;
          const isOn = isLocked ? true : (states[f.key] !== undefined ? states[f.key] : true);
          const disabled = isLocked || catDisabled;
          return `<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;
              border:1.5px solid ${disabled ? '#F3F4F6' : (isOn?'#6366F1':'#E5E7EB')};
              background:${disabled ? '#FAFAFA' : (isOn?'#EEF2FF':'white')};
              cursor:${disabled?'not-allowed':'pointer'};transition:all .12s"
            ${disabled?'':`onclick="event.preventDefault();_fmToggleField('${stateKey}','${f.key}',${!isOn})"`}>
            <input type="checkbox" ${isOn?'checked':''} ${disabled?'disabled':''}
              style="margin:0;accent-color:#6366F1;pointer-events:none">
            <span style="font-size:12px;color:${disabled?'#9CA3AF':'#374151'};font-weight:${isOn?'600':'400'}">${f.label}</span>
            ${isLocked?'<span style="font-size:8px;color:#9CA3AF">🔒</span>':''}
          </label>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

// ── 이벤트 핸들러 ───────────────────────────────────────────────────────────
function _fmOnVorgChange(v) { _fmVorgId = v; _fmAccountCode = ''; _fmSelEduType = ''; _fmRenderPage(); }
function _fmOnAccountChange(v) { _fmAccountCode = v; _fmSelEduType = ''; _fmRenderPage(); }
function _fmSelectEduType(et) { _fmSelEduType = et; _fmRenderPage(); }
function _fmSelectStage(s) { _fmActiveStage = s; _fmRenderPage(); }

function _fmToggleField(stateKey, fieldKey, val) {
  if (!_fmFieldStates[stateKey]) _fmFieldStates[stateKey] = {};
  _fmFieldStates[stateKey][fieldKey] = val;
  _fmRenderPage();
}

// ── 저장 ────────────────────────────────────────────────────────────────────
async function _fmSave() {
  const acc = _fmAccountList.find(a => a.code === _fmAccountCode);
  if (!acc) return alert('예산계정을 선택하세요.');

  // 현재 계정의 모든 양식 설정을 수집
  const formConfig = {};
  const eduTypes = acc.edu_types || [];
  const pattern = acc.process_pattern || 'A';
  const stages = _FM_PATTERN_STAGES[pattern] || [];

  eduTypes.forEach(et => {
    stages.forEach(s => {
      const key = `${et}|${s}`;
      if (_fmFieldStates[key]) {
        if (!formConfig[et]) formConfig[et] = {};
        formConfig[et][s] = _fmFieldStates[key];
      }
    });
  });

  try {
    const sb = window.__supabase;
    const { error } = await sb.from('budget_accounts')
      .update({ form_config: formConfig, updated_at: new Date().toISOString() })
      .eq('code', _fmAccountCode)
      .eq('tenant_id', acc.tenant_id);

    if (error) throw error;

    // 로컬 캐시 업데이트
    const idx = _fmAccountList.findIndex(a => a.code === _fmAccountCode);
    if (idx >= 0) _fmAccountList[idx].form_config = formConfig;

    alert('✅ 양식 설정이 저장되었습니다.');
  } catch(e) {
    console.error('[FormMgmt] 저장 실패:', e);
    alert('⚠️ 저장 실패: ' + (e.message || '알 수 없는 오류'));
  }
}

// ── 미리보기 ────────────────────────────────────────────────────────────────
function _fmPreview() {
  const stage = _fmActiveStage;
  const stageM = _FM_STAGE_META[stage];
  const cats = _FM_FIELDS[stage] || [];
  const stateKey = `${_fmSelEduType}|${stage}`;
  const states = _fmFieldStates[stateKey] || {};
  const eduLabel = (window.EDU_TYPE_LABELS || {})[_fmSelEduType] || _fmSelEduType;
  const acc = _fmAccountList.find(a => a.code === _fmAccountCode);
  const usesBudget = acc?.uses_budget !== false;

  // 활성 필드만 수집
  const activeFields = [];
  cats.forEach(cat => {
    if (cat.budgetOnly && !usesBudget) return;
    const fields = cat.fields.filter(f => {
      if (f.locked || cat.locked) return true;
      return states[f.key] !== false;
    });
    if (fields.length) activeFields.push({ cat: cat.cat, icon: cat.icon, fields });
  });

  // 모달 렌더
  const overlay = document.createElement('div');
  overlay.id = 'fm-preview-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
  <div style="background:white;border-radius:16px;width:100%;max-width:640px;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)">
    <div style="padding:16px 20px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between;
      background:linear-gradient(135deg,${stageM.color}08,${stageM.color}15);border-radius:16px 16px 0 0">
      <div>
        <div style="font-size:14px;font-weight:900;color:${stageM.color}">${stageM.icon} ${stageM.label} 미리보기</div>
        <div style="font-size:11px;color:#6B7280;margin-top:2px">교육유형: ${eduLabel} | 계정: ${_fmAccountCode}</div>
      </div>
      <button onclick="document.getElementById('fm-preview-overlay').remove()"
        style="padding:4px 12px;border:1px solid #D1D5DB;background:white;border-radius:6px;cursor:pointer;font-size:12px">✕ 닫기</button>
    </div>
    <div style="padding:20px">
      <div style="font-size:11px;color:#9CA3AF;margin-bottom:16px;padding:8px 12px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px">
        ℹ️ 이 화면은 FO 사용자에게 보이는 입력 폼의 미리보기입니다. 비활성화된 필드는 표시되지 않습니다.
      </div>
      ${activeFields.map(g => `
        <div style="margin-bottom:16px">
          <div style="font-size:12px;font-weight:800;color:#374151;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #E5E7EB">
            ${g.icon} ${g.cat}
          </div>
          ${g.fields.map(f => `
            <div style="margin-bottom:8px">
              <label style="display:block;font-size:11px;font-weight:600;color:#4B5563;margin-bottom:3px">
                ${f.label} ${f.locked?'<span style="color:#EF4444">*</span>':''}
              </label>
              <input type="text" disabled placeholder="${f.label}을(를) 입력하세요"
                style="width:100%;padding:8px 12px;border:1px solid #D1D5DB;border-radius:8px;font-size:12px;background:#F9FAFB;box-sizing:border-box">
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  </div>`;

  document.body.appendChild(overlay);
}

// ── 초기 로드 시 DB에서 기존 설정 복원 ──────────────────────────────────────
function _fmLoadExistingConfig(acc) {
  if (!acc?.form_config) return;
  Object.entries(acc.form_config).forEach(([et, stages]) => {
    Object.entries(stages).forEach(([stage, fields]) => {
      _fmFieldStates[`${et}|${stage}`] = { ...fields };
    });
  });
}
