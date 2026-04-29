// ─── 📝 교육 양식관리 ─────────────────────────────────────────────────────
// 제도그룹별 예산계정의 교육유형에 맞는 양식(필드 on/off)을 관리합니다.
// 4단계: 사업계획(forecast) · 운영계획(operation) · 신청(apply) · 결과(result)
// PRD: field_standardization.md 기반 필드 타입 표준화 적용

let _formTenantId = '';       // 선택된 회사(tenant)
let _formVorgId = '';
let _formAccountCode = '';
let _formSelEduType = '';
let _formActiveStage = 'forecast';
let _formTplList = [];        // 전체 vorg templates (DB)
let _formAccountList = [];    // 전체 budget accounts (DB)
let _formTenantList = [];     // 회사 목록
let _formFieldStates = {}; // { "elearning|forecast": { venue_type: true, ... } }

// ── 패턴 → 활성 단계 매핑 ──────────────────────────────────────────────────
const _FORM_PATTERN_STAGES = {
  A: ['forecast','operation','apply','result'],
  B: ['operation','apply','result'],
  C: ['apply','result'],
  D: ['operation','apply'],
  E: ['forecast','operation'],
};
const _FORM_STAGE_META = {
  forecast:  { icon:'📊', label:'사업계획 양식', color:'#7C3AED' },
  operation: { icon:'📋', label:'운영계획 양식', color:'#1D4ED8' },
  apply:     { icon:'📝', label:'신청 양식',     color:'#059669' },
  result:    { icon:'📄', label:'결과 양식',     color:'#D97706' },
};

// ── 3-Depth 교육유형 한글 라벨 역참조 ────────────────────────────────────────
// _BAM_EDU_TREE (bo_budget_account_tabs.js) 기반
function _formEduTypeInfo(typeId) {
  if (typeof _BAM_EDU_TREE === 'undefined') return { group:'', category:'', type: typeId, breadcrumb: typeId };
  for (const g of _BAM_EDU_TREE) {
    for (const c of g.categories || []) {
      for (const t of c.types || []) {
        if (t.id === typeId) {
          return { group: g.label, groupIcon: g.icon, groupColor: g.color,
                   category: c.label, type: t.label,
                   breadcrumb: `${g.label} > ${c.label} > ${t.label}` };
        }
      }
    }
  }
  return { group:'', category:'', type: typeId, breadcrumb: typeId };
}

// 교육유형 ID 목록을 3-depth 트리로 그루핑
function _formGroupEduTypes(eduTypeIds) {
  if (typeof _BAM_EDU_TREE === 'undefined') return [];
  const result = [];
  for (const g of _BAM_EDU_TREE) {
    const cats = [];
    for (const c of g.categories || []) {
      const matched = (c.types || []).filter(t => eduTypeIds.includes(t.id));
      if (matched.length > 0) cats.push({ purpose: c.purpose, label: c.label, desc: c.desc, types: matched });
    }
    if (cats.length > 0) result.push({ group: g.group, icon: g.icon, label: g.label, color: g.color, desc: g.desc, categories: cats });
  }
  return result;
}

// ── 단계별 필드 카탈로그 (PRD field_standardization.md 기반 타입 적용) ────────
// type: text | textarea | number | boolean | date | daterange | select | file | autocomplete | rating | calc_grounds
const _FORM_FIELDS = {
  forecast: [
    { cat:'기본정보', icon:'📋', locked:true, fields:[
      {key:'edu_purpose',label:'교육목적',type:'select',locked:true},
      {key:'edu_type',label:'교육유형',type:'select',locked:true},
      {key:'edu_name',label:'교육명',type:'text',locked:true},
      {key:'is_overseas',label:'국내/해외',type:'boolean',locked:true},
    ]},
    { cat:'교육상세', icon:'📐', fields:[
      {key:'target_audience',label:'교육대상',type:'select'},
      {key:'planned_headcount',label:'대상인원',type:'number',unit:'명'},
      {key:'planned_rounds',label:'예상차수',type:'number',unit:'차수'},
      {key:'edu_period',label:'교육기간',type:'daterange'},
      {key:'is_continuing',label:'전년도 계속교육',type:'boolean'},
    ]},
    { cat:'비용항목', icon:'💰', budgetOnly:true, fields:[
      {key:'requested_budget',label:'요청 예산 규모',type:'number',unit:'원'},
      {key:'budget_reason',label:'예산 산출 근거',type:'textarea'},
      {key:'expected_effect',label:'기대효과',type:'textarea'},
    ]},
  ],
  operation: [
    { cat:'기본정보', icon:'📋', locked:true, fields:[
      {key:'edu_purpose',label:'교육목적',type:'select',locked:true},
      {key:'edu_type',label:'교육유형',type:'select',locked:true},
      {key:'edu_name',label:'교육명',type:'text',locked:true},
      {key:'is_overseas',label:'국내/해외',type:'boolean',locked:true},
    ]},
    { cat:'교육상세', icon:'📐', fields:[
      {key:'venue_type',label:'장소유형',type:'select',options:['사내','사외','온라인']},
      {key:'venue_name',label:'교육장소',type:'text'},
      {key:'planned_days',label:'교육일수',type:'number',unit:'일'},
      {key:'edu_period',label:'교육기간',type:'daterange'},
      {key:'planned_rounds',label:'교육차수',type:'number',unit:'차수'},
      {key:'planned_headcount',label:'교육인원',type:'number',unit:'명'},
      {key:'edu_institution',label:'교육기관',type:'autocomplete'},
      {key:'instructor',label:'강사정보',type:'text'},
      {key:'edu_method',label:'교육방법',type:'select',options:['대면','비대면','블렌디드']},
    ]},
    { cat:'비용항목', icon:'💰', budgetOnly:true, fields:[
      {key:'planned_amount',label:'계획액',type:'number',unit:'원'},
      {key:'calc_grounds',label:'세부산출근거',type:'calc_grounds'},
      {key:'expected_effect',label:'기대효과',type:'textarea'},
    ]},
    { cat:'관리자 필드', icon:'🔧', fields:[
      {key:'bo_comment',label:'BO 코멘트',type:'textarea'},
      {key:'allocated_amount',label:'배정액',type:'number',unit:'원'},
    ]},
  ],
  apply: [
    { cat:'기본정보', icon:'📋', locked:true, fields:[
      {key:'edu_name',label:'교육명/과정명',type:'text',locked:true},
      {key:'edu_type',label:'교육유형',type:'select',locked:true},
    ]},
    { cat:'신청상세', icon:'📐', fields:[
      {key:'apply_reason',label:'신청사유',type:'textarea'},
      {key:'course_info',label:'과정/기관 정보',type:'textarea'},
      {key:'edu_period',label:'교육기간',type:'daterange'},
      {key:'edu_institution',label:'교육기관',type:'autocomplete'},
      {key:'is_overseas',label:'국내/해외',type:'boolean'},
    ]},
    { cat:'비용항목', icon:'💰', budgetOnly:true, fields:[
      {key:'estimated_cost',label:'예상비용',type:'number',unit:'원'},
      {key:'actual_cost',label:'실비',type:'number',unit:'원'},
    ]},
    { cat:'첨부', icon:'📎', fields:[
      {key:'attachments',label:'증빙서류',type:'file'},
      {key:'receipt',label:'영수증',type:'file'},
    ]},
  ],
  result: [
    { cat:'기본정보', icon:'📋', locked:true, fields:[
      {key:'edu_name',label:'교육명',type:'text',locked:true},
      {key:'edu_type',label:'교육유형',type:'select',locked:true},
    ]},
    { cat:'결과상세', icon:'📐', fields:[
      {key:'completion_status',label:'수료여부',type:'boolean'},
      {key:'satisfaction',label:'만족도',type:'rating'},
      {key:'learning_summary',label:'학습내용/소감',type:'textarea'},
      {key:'attendance_rate',label:'출석률',type:'number',unit:'%'},
    ]},
    { cat:'비용항목', icon:'💰', budgetOnly:true, fields:[
      {key:'actual_cost',label:'실비용',type:'number',unit:'원'},
      {key:'settlement_amount',label:'정산금액',type:'number',unit:'원'},
    ]},
    { cat:'첨부', icon:'📎', fields:[
      {key:'certificate',label:'수료증',type:'file'},
      {key:'receipt',label:'영수증',type:'file'},
    ]},
  ],
};

// ── 메인 렌더 ───────────────────────────────────────────────────────────────
async function renderFormManagement() {
  const ct = document.getElementById('bo-content');
  ct.innerHTML = '<div style="text-align:center;padding:60px;color:#9CA3AF">⏳ 양식관리 데이터 로딩 중...</div>';

  try {
    const user = JSON.parse(sessionStorage.getItem('loggedInUser') || '{}');
    const role = (typeof boCurrentPersona !== 'undefined' && boCurrentPersona?.role) || user.role || '';
    const isPlatform = role === 'platform_admin';

    // DB 로드 (platform_admin은 전체, 나머지는 자사만)
    const sb = typeof _sb === 'function' ? _sb() : window.__supabase;
    if (sb) {
      let tplQuery = sb.from('virtual_org_templates').select('id,name,tenant_id,service_type');
      let accQuery = sb.from('budget_accounts').select('*');
      if (!isPlatform) {
        const tid = user.tenant_id || 'HMC';
        tplQuery = tplQuery.eq('tenant_id', tid);
        accQuery = accQuery.eq('tenant_id', tid);
      }
      const [tplRes, accRes] = await Promise.all([tplQuery, accQuery]);
      _formTplList = tplRes.data || [];
      _formAccountList = accRes.data || [];
    } else {
      console.warn('[FormMgmt] Supabase 미연결, mock 사용');
      _formTplList = (window.VORG_TEMPLATES||[]);
      _formAccountList = (window.BUDGET_ACCOUNTS||[]);
    }

    // 회사 목록 추출
    _formTenantList = typeof TENANTS !== 'undefined'
      ? TENANTS
      : [...new Set(_formTplList.map(t => t.tenant_id).filter(Boolean))].map(id => ({ id, name: id }));

    // platform_admin: 회사 미선택 시 첫 번째 자동 선택
    if (isPlatform && !_formTenantId && _formTenantList.length) _formTenantId = _formTenantList[0].id;
    // 일반 admin: 자사 고정
    if (!isPlatform) _formTenantId = user.tenant_id || 'HMC';

    _formRenderPage();
  } catch(e) {
    console.error('[FormMgmt] 렌더링 에러:', e);
    ct.innerHTML = `<div style="text-align:center;padding:60px;color:#EF4444">
      <div style="font-size:32px;margin-bottom:12px">⚠️</div>
      <div style="font-size:14px;font-weight:700">양식관리 로드 중 오류가 발생했습니다</div>
      <div style="font-size:12px;color:#6B7280;margin-top:8px">${e.message || e}</div>
      <button onclick="renderFormManagement()" style="margin-top:16px;padding:10px 24px;border-radius:10px;border:none;background:#7C3AED;color:white;font-weight:700;cursor:pointer">다시 시도</button>
    </div>`;
  }
}

function _formRenderPage() {
  const ct = document.getElementById('bo-content');
  const user = JSON.parse(sessionStorage.getItem('loggedInUser') || '{}');
  const role = (typeof boCurrentPersona !== 'undefined' && boCurrentPersona?.role) || user.role || '';
  const isPlatform = role === 'platform_admin';

  // 회사 기준 및 교육지원(edu_support) 제도그룹 필터
  const filteredVorgs = _formTplList.filter(t => 
    t.service_type === 'edu_support' && 
    (!_formTenantId || t.tenant_id === _formTenantId)
  );

  // vorg 유효성 확인
  if (_formVorgId && !filteredVorgs.find(t => t.id === _formVorgId)) _formVorgId = '';
  if (!_formVorgId && filteredVorgs.length) _formVorgId = filteredVorgs[0].id;

  // 제도그룹 기준 예산계정 필터
  const filteredAccounts = _formAccountList.filter(a =>
    (!_formVorgId || a.virtual_org_template_id === _formVorgId) && a.active !== false
  );

  // account 유효성 확인
  if (_formAccountCode && !filteredAccounts.find(a => a.code === _formAccountCode)) _formAccountCode = '';
  const selAcc = filteredAccounts.find(a => a.code === _formAccountCode) || null;
  // 자동 선택하지 않음 — 사용자가 직접 선택해야 조회

  // 기존 설정 복원
  if (selAcc) _formLoadExistingConfig(selAcc);

  const eduTypes = selAcc?.edu_types || [];
  const pattern = selAcc?.process_pattern || 'A';
  const stages = _FORM_PATTERN_STAGES[pattern] || _FORM_PATTERN_STAGES.A;
  const usesBudget = selAcc?.uses_budget !== false;

  // 첫 교육유형 자동 선택
  if (!_formSelEduType || !eduTypes.includes(_formSelEduType)) {
    _formSelEduType = eduTypes[0] || '';
  }
  // 활성 단계 유효성
  if (!stages.includes(_formActiveStage)) _formActiveStage = stages[0];

  // 교육유형 3-depth 트리 그루핑
  const eduTree = _formGroupEduTypes(eduTypes);

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
    <div style="margin-bottom:16px;padding:14px 18px;background:linear-gradient(135deg,#F0F9FF,#F5F3FF);border-radius:12px;border:1px solid #E0E7FF">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <!-- 회사 선택 -->
        ${isPlatform ? `
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:12px;font-weight:700;color:#4338CA;white-space:nowrap">🏢 회사</span>
          <select id="fm-tenant-sel" onchange="_formOnTenantChange(this.value)"
            style="padding:6px 10px;border:1px solid #C7D2FE;border-radius:8px;font-size:12px;background:white;min-width:120px">
            <option value="">전체 회사</option>
            ${_formTenantList.map(t => `<option value="${t.id}" ${t.id===_formTenantId?'selected':''}>${t.name||t.id}</option>`).join('')}
          </select>
        </div>
        <div style="width:1px;height:24px;background:#C7D2FE"></div>
        ` : `
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:12px;font-weight:700;color:#4338CA;white-space:nowrap">🏢 회사</span>
          <span style="padding:6px 12px;border:1px solid #C7D2FE;border-radius:8px;font-size:12px;background:#F5F3FF;color:#4338CA;font-weight:700">
            ${_formTenantList.find(t=>t.id===_formTenantId)?.name || _formTenantId}
          </span>
        </div>
        <div style="width:1px;height:24px;background:#C7D2FE"></div>
        `}
        <!-- 제도그룹 -->
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:12px;font-weight:700;color:#4338CA;white-space:nowrap">🏗️ 제도그룹</span>
          <select id="fm-vorg-sel" onchange="_formOnVorgChange(this.value)"
            style="padding:6px 10px;border:1px solid #C7D2FE;border-radius:8px;font-size:12px;background:white;min-width:200px">
            <option value="">제도그룹 선택</option>
            ${filteredVorgs.map(t => `<option value="${t.id}" ${t.id===_formVorgId?'selected':''}>${t.name}</option>`).join('')}
          </select>
        </div>
        <div style="width:1px;height:24px;background:#C7D2FE"></div>
        <!-- 예산계정 -->
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:12px;font-weight:700;color:#4338CA;white-space:nowrap">💳 예산계정</span>
          <select id="fm-acc-sel" onchange="_formOnAccountChange(this.value)"
            style="padding:6px 10px;border:1px solid #C7D2FE;border-radius:8px;font-size:12px;background:white;min-width:180px"
            ${!_formVorgId?'disabled':''}>
            <option value="">예산계정 선택</option>
            ${filteredAccounts.map(a => `<option value="${a.code}" ${a.code===_formAccountCode?'selected':''}>${a.name} (${a.code})</option>`).join('')}
          </select>
        </div>
        ${selAcc ? `
        <div style="width:1px;height:24px;background:#C7D2FE"></div>
        <span style="font-size:10px;padding:4px 12px;border-radius:20px;background:#7C3AED;color:white;font-weight:800">
          패턴${pattern}: ${(_FORM_PATTERN_STAGES[pattern]||[]).map(s=>_FORM_STAGE_META[s]?.label.replace(' 양식','')).join('→')}
        </span>` : ''}
        ${selAcc && !usesBudget ? '<span style="font-size:10px;padding:4px 10px;border-radius:20px;background:#F59E0B;color:white;font-weight:800">💰 무예산</span>' : ''}
      </div>
      <!-- 안내 문구 -->
      ${!_formAccountCode ? `
      <div style="margin-top:10px;font-size:11px;color:#6366F1;display:flex;align-items:center;gap:6px">
        ℹ️ 회사 → 제도그룹 → 예산계정을 순서대로 선택하면 양식을 관리할 수 있습니다.
      </div>` : ''}
    </div>

    ${!_formAccountCode ? `
      <div style="padding:60px;text-align:center;background:#F0F9FF;border:2px dashed #BAE6FD;border-radius:16px">
        <div style="font-size:36px;margin-bottom:12px">👆</div>
        <div style="font-size:14px;font-weight:700;color:#0369A1;margin-bottom:6px">예산계정을 선택하세요</div>
        <div style="font-size:12px;color:#0284C7">회사 → 제도그룹 → 예산계정을 순서대로 선택하면 양식 설정이 표시됩니다</div>
      </div>
    ` : eduTypes.length === 0 ? `
      <div style="padding:60px;text-align:center;background:#FFF7ED;border:2px dashed #FDBA74;border-radius:16px">
        <div style="font-size:36px;margin-bottom:12px">📭</div>
        <div style="font-size:14px;font-weight:700;color:#C2410C;margin-bottom:6px">교육유형이 설정되지 않았습니다</div>
        <div style="font-size:12px;color:#EA580C">예산계정 관리 → 서비스 정책·프로세스 탭에서 교육유형을 먼저 선택하세요</div>
      </div>
    ` : `
    <!-- 본문: 좌측 사이드바 + 우측 콘텐츠 -->
    <div style="display:grid;grid-template-columns:220px 1fr;gap:16px;min-height:500px">
      <!-- 좌측: 교육유형 3-Depth 사이드바 -->
      <div style="background:white;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden;overflow-y:auto;max-height:600px">
        <div style="padding:10px 14px;background:#F8FAFC;border-bottom:1px solid #E5E7EB;font-size:11px;font-weight:800;color:#475569">
          📚 교육유형 (${eduTypes.length})
        </div>
        ${eduTree.map(g => `
          <!-- 1Depth: 그룹 (직접학습/교육운영) -->
          <div style="padding:8px 12px;background:linear-gradient(135deg,${g.color}08,${g.color}15);border-bottom:1px solid #E5E7EB">
            <div style="font-size:11px;font-weight:900;color:${g.color};display:flex;align-items:center;gap:5px">
              ${g.icon} ${g.label}
            </div>
          </div>
          ${g.categories.map(c => `
            <!-- 2Depth: 목적 카테고리 (정규교육, 학술 등) -->
            <div style="padding:5px 12px 3px 20px;font-size:10px;font-weight:700;color:#6B7280;border-bottom:1px solid #FAFAFA">
              ▸ ${c.label}
            </div>
            ${c.types.map(t => {
              const active = t.id === _formSelEduType;
              return `<div onclick="_formSelectEduType('${t.id}')"
                style="padding:7px 12px 7px 34px;cursor:pointer;border-left:3px solid ${active?g.color:'transparent'};
                  background:${active?g.color+'12':'white'};font-size:12px;font-weight:${active?'800':'500'};
                  color:${active?g.color:'#374151'};transition:all .12s;border-bottom:1px solid #F8F9FA">
                ${active?'● ':'○ '} ${t.label}
              </div>`;
            }).join('')}
          `).join('')}
        `).join('')}
      </div>

      <!-- 우측: 단계 탭 + 필드 토글 -->
      <div style="background:white;border:1px solid #E5E7EB;border-radius:14px;overflow:hidden">
        <!-- 단계 탭 -->
        <div style="display:flex;border-bottom:2px solid #E5E7EB;background:#F8FAFC">
          ${stages.map(s => {
            const m = _FORM_STAGE_META[s];
            const act = s === _formActiveStage;
            return `<div onclick="_formSelectStage('${s}')"
              style="padding:10px 16px;cursor:pointer;font-size:12px;font-weight:${act?'800':'500'};
                color:${act?m.color:'#6B7280'};border-bottom:3px solid ${act?m.color:'transparent'};
                background:${act?'white':'transparent'};transition:all .15s;flex:1;text-align:center">
              ${m.icon} ${m.label}
            </div>`;
          }).join('')}
        </div>

        <!-- 필드 토글 영역 -->
        <div style="padding:16px;max-height:460px;overflow-y:auto">
          ${_formRenderFieldToggles(_formActiveStage, usesBudget)}
        </div>

        <!-- 하단 버튼 -->
        <div style="padding:12px 16px;border-top:1px solid #E5E7EB;display:flex;gap:10px;justify-content:flex-end;background:#FAFAFA">
          <button onclick="_formPreview()"
            style="padding:8px 20px;border:1px solid #6366F1;background:white;color:#6366F1;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">
            👁️ 미리보기
          </button>
          <button onclick="_formSave()"
            style="padding:8px 24px;border:none;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:white;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px #6366F140">
            💾 저장
          </button>
        </div>
      </div>
    </div>
    `}
  </div>`;
}

// ── 필드 타입 뱃지 색상 ─────────────────────────────────────────────────────
const _FORM_TYPE_BADGE = {
  text:'텍스트', textarea:'장문', number:'숫자', boolean:'토글',
  date:'날짜', daterange:'기간', select:'선택', file:'파일',
  autocomplete:'검색입력', rating:'별점', calc_grounds:'산출근거',
};
const _FORM_TYPE_COLOR = {
  text:'#6B7280', textarea:'#7C3AED', number:'#1D4ED8', boolean:'#059669',
  date:'#D97706', daterange:'#D97706', select:'#4338CA', file:'#9333EA',
  autocomplete:'#0891B2', rating:'#F59E0B', calc_grounds:'#DC2626',
};

// ── 필드 토글 렌더 ──────────────────────────────────────────────────────────
function _formRenderFieldToggles(stage, usesBudget) {
  const cats = _FORM_FIELDS[stage] || [];
  const stateKey = `${_formSelEduType}|${stage}`;
  const states = _formFieldStates[stateKey] || {};

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
          const typeBadge = _FORM_TYPE_BADGE[f.type] || f.type || '';
          const typeColor = _FORM_TYPE_COLOR[f.type] || '#9CA3AF';
          return `<label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;
              border:1.5px solid ${disabled ? '#F3F4F6' : (isOn?'#6366F1':'#E5E7EB')};
              background:${disabled ? '#FAFAFA' : (isOn?'#EEF2FF':'white')};
              cursor:${disabled?'not-allowed':'pointer'};transition:all .12s"
            ${disabled?'':`onclick="event.preventDefault();_formToggleField('${stateKey}','${f.key}',${!isOn})"`}>
            <input type="checkbox" ${isOn?'checked':''} ${disabled?'disabled':''}
              style="margin:0;accent-color:#6366F1;pointer-events:none">
            <span style="font-size:12px;color:${disabled?'#9CA3AF':'#374151'};font-weight:${isOn?'600':'400'};flex:1">${f.label}</span>
            <span style="font-size:8px;padding:1px 5px;border-radius:3px;background:${typeColor}15;color:${typeColor};font-weight:700;white-space:nowrap">${typeBadge}</span>
            ${isLocked?'<span style="font-size:8px;color:#9CA3AF">🔒</span>':''}
          </label>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

// ── 이벤트 핸들러 ───────────────────────────────────────────────────────────
function _formOnTenantChange(v) { _formTenantId = v; _formVorgId = ''; _formAccountCode = ''; _formSelEduType = ''; _formRenderPage(); }
function _formOnVorgChange(v) { _formVorgId = v; _formAccountCode = ''; _formSelEduType = ''; _formRenderPage(); }
function _formOnAccountChange(v) { _formAccountCode = v; _formSelEduType = ''; _formRenderPage(); }
function _formSelectEduType(et) { _formSelEduType = et; _formRenderPage(); }
function _formSelectStage(s) { _formActiveStage = s; _formRenderPage(); }

function _formToggleField(stateKey, fieldKey, val) {
  if (!_formFieldStates[stateKey]) _formFieldStates[stateKey] = {};
  _formFieldStates[stateKey][fieldKey] = val;
  _formRenderPage();
}

// ── 저장 ────────────────────────────────────────────────────────────────────
async function _formSave() {
  const acc = _formAccountList.find(a => a.code === _formAccountCode);
  if (!acc) return alert('예산계정을 선택하세요.');

  // 현재 계정의 모든 양식 설정을 수집
  const formConfig = {};
  const eduTypes = acc.edu_types || [];
  const pattern = acc.process_pattern || 'A';
  const stages = _FORM_PATTERN_STAGES[pattern] || [];

  eduTypes.forEach(et => {
    stages.forEach(s => {
      const key = `${et}|${s}`;
      if (_formFieldStates[key]) {
        if (!formConfig[et]) formConfig[et] = {};
        formConfig[et][s] = _formFieldStates[key];
      }
    });
  });

  try {
    const sb = window.__supabase;
    const { error } = await sb.from('budget_accounts')
      .update({ form_config: formConfig, updated_at: new Date().toISOString() })
      .eq('code', _formAccountCode)
      .eq('tenant_id', acc.tenant_id);

    if (error) throw error;

    // 로컬 캐시 업데이트
    const idx = _formAccountList.findIndex(a => a.code === _formAccountCode);
    if (idx >= 0) _formAccountList[idx].form_config = formConfig;

    alert('✅ 양식 설정이 저장되었습니다.');
  } catch(e) {
    console.error('[FormMgmt] 저장 실패:', e);
    alert('⚠️ 저장 실패: ' + (e.message || '알 수 없는 오류'));
  }
}

// ── 필드 타입별 미리보기 렌더 헬퍼 ──────────────────────────────────────────
function _formPreviewField(f) {
  const lbl = `<label style="display:block;font-size:11px;font-weight:600;color:#4B5563;margin-bottom:3px">
    ${f.label} ${f.locked?'<span style="color:#EF4444">*</span>':''}
    <span style="font-size:9px;color:${_FORM_TYPE_COLOR[f.type]||'#9CA3AF'};margin-left:4px">(${_FORM_TYPE_BADGE[f.type]||f.type||''})</span>
  </label>`;
  const base = 'width:100%;padding:8px 12px;border:1px solid #D1D5DB;border-radius:8px;font-size:12px;background:#F9FAFB;box-sizing:border-box';

  switch (f.type) {
    case 'boolean':
      return `<div style="margin-bottom:8px">${lbl}
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0">
          <div style="width:36px;height:20px;border-radius:10px;background:#059669;position:relative;cursor:default">
            <div style="width:16px;height:16px;border-radius:50%;background:white;position:absolute;top:2px;right:2px;box-shadow:0 1px 3px rgba(0,0,0,.2)"></div>
          </div>
          <span style="font-size:12px;color:#059669;font-weight:600">ON</span>
        </div>
      </div>`;
    case 'textarea':
      return `<div style="margin-bottom:8px">${lbl}
        <textarea disabled rows="3" placeholder="${f.label}을(를) 입력하세요"
          style="${base};resize:none;font-family:inherit"></textarea>
      </div>`;
    case 'number':
      return `<div style="margin-bottom:8px">${lbl}
        <div style="position:relative">
          <input type="number" disabled placeholder="0" style="${base};text-align:right;padding-right:${f.unit?'40px':'12px'}">
          ${f.unit?`<span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:11px;color:#9CA3AF;font-weight:600">${f.unit}</span>`:''}
        </div>
      </div>`;
    case 'date':
      return `<div style="margin-bottom:8px">${lbl}
        <input type="date" disabled style="${base}">
      </div>`;
    case 'daterange':
      return `<div style="margin-bottom:8px">${lbl}
        <div style="display:flex;gap:8px;align-items:center">
          <input type="date" disabled style="${base};flex:1">
          <span style="color:#9CA3AF;font-size:12px;font-weight:700">~</span>
          <input type="date" disabled style="${base};flex:1">
        </div>
      </div>`;
    case 'select':
      return `<div style="margin-bottom:8px">${lbl}
        <select disabled style="${base};appearance:auto">
          <option>— 선택하세요 —</option>
          ${(f.options||[]).map(o=>`<option>${o}</option>`).join('')}
        </select>
      </div>`;
    case 'file':
      return `<div style="margin-bottom:8px">${lbl}
        <div style="padding:16px;border:2px dashed #D1D5DB;border-radius:10px;text-align:center;background:#FAFAFA">
          <div style="font-size:20px;margin-bottom:4px">📎</div>
          <div style="font-size:11px;color:#6B7280">파일을 여기에 드래그하거나 <span style="color:#6366F1;text-decoration:underline">찾아보기</span></div>
        </div>
      </div>`;
    case 'autocomplete':
      return `<div style="margin-bottom:8px">${lbl}
        <div style="position:relative">
          <input type="text" disabled placeholder="검색어를 입력하세요" style="${base};padding-right:32px">
          <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:14px;color:#9CA3AF">🔍</span>
        </div>
      </div>`;
    case 'rating':
      return `<div style="margin-bottom:8px">${lbl}
        <div style="display:flex;gap:4px;padding:6px 0">
          ${[1,2,3,4,5].map(n=>`<span style="font-size:20px;color:${n<=4?'#F59E0B':'#D1D5DB'};cursor:default">${n<=4?'★':'☆'}</span>`).join('')}
          <span style="font-size:12px;color:#6B7280;margin-left:6px;align-self:center">4 / 5</span>
        </div>
      </div>`;
    case 'calc_grounds':
      return `<div style="margin-bottom:8px">${lbl}
        <div style="border:1.5px solid #BFDBFE;border-radius:12px;overflow:hidden;background:#F8FBFF">
          <!-- 헤더: 산출근거 제목 + 수식 뱃지 -->
          <div style="padding:10px 14px;background:linear-gradient(135deg,#EFF6FF,#F0F9FF);display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span style="font-size:13px">📋</span>
            <span style="font-size:12px;font-weight:800;color:#1E40AF">세부 산출 근거</span>
            <span style="font-size:10px;padding:3px 8px;border-radius:12px;background:#F97316;color:white;font-weight:700">
              🎯 교육운영용 (단가 × 수량1 × 수량2 × 수량3)
            </span>
            <button disabled style="margin-left:auto;padding:4px 10px;border:1px solid #3B82F6;background:#3B82F6;color:white;border-radius:6px;font-size:10px;font-weight:700;cursor:default">
              + 항목추가
            </button>
          </div>
          <div style="padding:6px 14px;font-size:10px;color:#6B7280;background:#F0F9FF;border-bottom:1px solid #DBEAFE">
            항목 선택 → 장소(선택) → 프리셋 선택 시 단가·박수 자동 입력됩니다.
          </div>
          <!-- 테이블 -->
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:11px">
              <thead>
                <tr style="background:#EFF6FF">
                  <th style="padding:8px 10px;text-align:left;font-weight:800;color:#1E40AF;border-bottom:2px solid #BFDBFE;white-space:nowrap">항목</th>
                  <th style="padding:8px 10px;text-align:left;font-weight:800;color:#1E40AF;border-bottom:2px solid #BFDBFE;white-space:nowrap">세부항목</th>
                  <th style="padding:8px 10px;text-align:right;font-weight:800;color:#1E40AF;border-bottom:2px solid #BFDBFE;white-space:nowrap">단가(원)</th>
                  <th style="padding:8px 10px;text-align:center;font-weight:800;color:#1E40AF;border-bottom:2px solid #BFDBFE;white-space:nowrap">수량 및 단위</th>
                  <th style="padding:8px 10px;text-align:right;font-weight:800;color:#1E40AF;border-bottom:2px solid #BFDBFE;white-space:nowrap">예산금액(원)</th>
                  <th style="padding:8px 6px;text-align:center;font-weight:800;color:#1E40AF;border-bottom:2px solid #BFDBFE;white-space:nowrap">비고</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom:1px solid #E5E7EB">
                  <td style="padding:8px 10px">
                    <select disabled style="padding:4px 6px;border:1px solid #D1D5DB;border-radius:6px;font-size:11px;background:white;min-width:80px">
                      <option>교육운영비</option>
                    </select>
                  </td>
                  <td style="padding:8px 6px;color:#6B7280;font-size:10px">직접입력</td>
                  <td style="padding:8px 10px;text-align:right">
                    <input type="text" disabled value="50,000" style="width:70px;padding:4px 6px;border:1px solid #D1D5DB;border-radius:6px;font-size:11px;text-align:right;background:#F9FAFB">
                  </td>
                  <td style="padding:8px 6px;text-align:center">
                    <div style="display:flex;align-items:center;gap:4px;justify-content:center">
                      <span style="font-size:10px;color:#6B7280">수량</span>
                      <input type="text" disabled value="1" style="width:36px;padding:4px;border:1px solid #D1D5DB;border-radius:6px;font-size:11px;text-align:center;background:#F9FAFB">
                      <select disabled style="padding:3px 4px;border:1px solid #D1D5DB;border-radius:6px;font-size:10px;background:white">
                        <option>명</option>
                      </select>
                      <button disabled style="width:18px;height:18px;border:1px solid #D1D5DB;border-radius:4px;font-size:10px;background:#F3F4F6;color:#6B7280;cursor:default">+</button>
                    </div>
                  </td>
                  <td style="padding:8px 10px;text-align:right;font-weight:800;color:#1E40AF;font-size:12px">50,000</td>
                  <td style="padding:8px 6px;text-align:center">
                    <input type="text" disabled style="width:40px;padding:3px;border:1px solid #E5E7EB;border-radius:4px;font-size:10px;background:#FAFAFA">
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- 합계 -->
          <div style="padding:10px 14px;background:#EFF6FF;border-top:2px solid #BFDBFE;display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:12px;font-weight:800;color:#1E40AF">세부 산출 합계</div>
              <div style="font-size:9px;color:#6B7280;margin-top:2px">※ 최대 인원(1명) 기준 1인당 약 50,000원</div>
            </div>
            <div style="font-size:18px;font-weight:900;color:#059669">50,000</div>
          </div>
        </div>
      </div>`;
    default: // text
      return `<div style="margin-bottom:8px">${lbl}
        <input type="text" disabled placeholder="${f.label}을(를) 입력하세요" style="${base}">
      </div>`;
  }
}

// ── 미리보기 ────────────────────────────────────────────────────────────────
function _formPreview() {
  const stage = _formActiveStage;
  const stageM = _FORM_STAGE_META[stage];
  const cats = _FORM_FIELDS[stage] || [];
  const stateKey = `${_formSelEduType}|${stage}`;
  const states = _formFieldStates[stateKey] || {};
  const eduInfo = _formEduTypeInfo(_formSelEduType);
  const acc = _formAccountList.find(a => a.code === _formAccountCode);
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
  <div style="background:white;border-radius:16px;width:100%;max-width:700px;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)">
    <div style="padding:16px 20px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between;
      background:linear-gradient(135deg,${stageM.color}08,${stageM.color}15);border-radius:16px 16px 0 0">
      <div>
        <div style="font-size:14px;font-weight:900;color:${stageM.color}">${stageM.icon} ${stageM.label} 미리보기</div>
        <div style="font-size:11px;color:#6B7280;margin-top:2px">교육유형: ${eduInfo.breadcrumb} | 계정: ${_formAccountCode}</div>
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
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            ${g.fields.map(f => {
              // 장문(textarea), 기간(daterange), 산출근거, 파일은 full-width
              const fullWidth = ['textarea','daterange','calc_grounds','file'].includes(f.type);
              return `<div style="${fullWidth?'grid-column:1/-1':''}">
                ${_formPreviewField(f)}
              </div>`;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;

  document.body.appendChild(overlay);
}

// ── 초기 로드 시 DB에서 기존 설정 복원 ──────────────────────────────────────
function _formLoadExistingConfig(acc) {
  if (!acc?.form_config) return;
  Object.entries(acc.form_config).forEach(([et, stages]) => {
    Object.entries(stages).forEach(([stage, fields]) => {
      _formFieldStates[`${et}|${stage}`] = { ...fields };
    });
  });
}
